import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, registerSchema, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Export session middleware for Socket.IO
export let sessionMiddleware: any;

export function setupAuth(app: Express) {
  // Validate SESSION_SECRET exists
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required for secure sessions");
  }
  
  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long for security");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection - changed to 'lax' for Socket.IO compatibility
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  // Create session middleware for sharing with Socket.IO
  sessionMiddleware = session(sessionSettings);

  // Rate limiter for login attempts to prevent brute force attacks
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: "Too many login attempts from this IP, please try again after 15 minutes."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Only count failed login attempts
    skipSuccessfulRequests: true,
  });

  app.set("trust proxy", 1);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input with Zod schema
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user with validated data only - force role to 'agent' for security
      const user = await storage.createUser({
        name: validatedData.name,
        email: validatedData.email,
        password: await hashPassword(validatedData.password),
        role: "agent", // SECURITY: Always default to agent role, prevent escalation
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) return next(err);
        
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(userWithoutPassword);
        });
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      // Validate input with Zod schema
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        
        // Regenerate session to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) return next(err);
          
          req.login(user, (err) => {
            if (err) return next(err);
            
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            res.status(200).json(userWithoutPassword);
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      
      // Completely destroy the session on the server
      req.session.destroy((err) => {
        if (err) return next(err);
        
        // Clear the session cookie from the client
        res.clearCookie('connect.sid', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
}
