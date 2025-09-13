import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertContactSchema, insertTemplateSchema, insertCampaignSchema, 
  insertMessageSchema, insertReplySchema, insertSettingsSchema 
} from "@shared/schema";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settings = await storage.getSettings();
      if (settings && settings.accessToken) {
        // Decrypt access token before sending
        settings.accessToken = decrypt(settings.accessToken);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      
      // Encrypt access token before storing
      if (settingsData.accessToken) {
        settingsData.accessToken = encrypt(settingsData.accessToken);
      }
      
      settingsData.createdBy = req.user!.id;
      const settings = await storage.createOrUpdateSettings(settingsData);
      
      // Decrypt for response
      if (settings.accessToken) {
        settings.accessToken = decrypt(settings.accessToken);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      res.status(400).json({ message: "Invalid contact data" });
    }
  });

  app.post("/api/contacts/bulk", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contactsData = req.body.map((contact: any) => insertContactSchema.parse(contact));
      const contacts = await storage.bulkCreateContacts(contactsData);
      res.status(201).json(contacts);
    } catch (error) {
      res.status(400).json({ message: "Invalid contacts data" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const deleted = await storage.deleteContact(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Contact not found" });
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  // Fetch templates from WhatsApp API
  app.get("/api/templates/whatsapp", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settings = await storage.getSettings();
      if (!settings || !settings.accessToken || !settings.wabaId) {
        return res.status(400).json({ message: "WhatsApp API credentials not configured" });
      }

      const accessToken = decrypt(settings.accessToken);
      const response = await fetch(`https://graph.facebook.com/v18.0/${settings.wabaId}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data.data || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch WhatsApp templates" });
    }
  });

  // Campaigns routes
  app.get("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      campaignData.createdBy = req.user!.id;
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Failed to update campaign" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaignId = req.query.campaignId as string;
      const messages = await storage.getMessages(campaignId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { phone, templateId, parameters } = req.body;
      
      const settings = await storage.getSettings();
      if (!settings || !settings.accessToken || !settings.phoneNumberId) {
        return res.status(400).json({ message: "WhatsApp API credentials not configured" });
      }

      const accessToken = decrypt(settings.accessToken);
      
      // Send message via WhatsApp API
      const response = await fetch(`https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateId,
            language: { code: "en_US" },
            components: parameters ? [
              {
                type: "body",
                parameters: parameters.map((param: string) => ({ type: "text", text: param }))
              }
            ] : []
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `WhatsApp API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log the message
      const messageData = insertMessageSchema.parse({
        contactId: null, // Would need to find contact by phone
        templateId: null, // Would need to find template by templateId
        status: "sent",
        sentAt: new Date(),
      });
      
      const message = await storage.createMessage(messageData);
      
      res.json({ success: true, messageId: result.messages[0].id, logId: message.id });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // Replies routes
  app.get("/api/replies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const replies = await storage.getReplies();
      res.json(replies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  // Webhook for WhatsApp
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      const { entry } = req.body;
      
      for (const entryItem of entry) {
        for (const change of entryItem.changes) {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;
            
            // Handle incoming messages
            if (messages) {
              for (const message of messages) {
                const replyData = insertReplySchema.parse({
                  contactId: null, // Would need to find contact by phone
                  messageId: message.id,
                  text: message.text?.body || '',
                  type: message.type,
                  receivedAt: new Date(message.timestamp * 1000),
                });
                
                await storage.createReply(replyData);
              }
            }
            
            // Handle message status updates
            if (statuses) {
              for (const status of statuses) {
                // Update message status in database
                // This would require finding the message by WhatsApp message ID
              }
            }
          }
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Webhook verification for WhatsApp
  app.get("/api/webhook/whatsapp", (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
    
    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaigns = await storage.getCampaigns();
      const messages = await storage.getMessages();
      const contacts = await storage.getContacts();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const messagesToday = messages.filter(m => 
        m.sentAt && m.sentAt >= today
      ).length;
      
      const activeCampaigns = campaigns.filter(c => 
        c.status === 'running' || c.status === 'scheduled'
      ).length;
      
      const deliveredMessages = messages.filter(m => 
        m.status === 'delivered' || m.status === 'read'
      ).length;
      
      const totalMessages = messages.length;
      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
      
      res.json({
        messagesToday,
        activeCampaigns,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        totalContacts: contacts.length,
        totalCampaigns: campaigns.length,
        totalMessages
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
