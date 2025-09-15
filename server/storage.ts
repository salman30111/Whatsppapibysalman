import { 
  User, InsertUser, Settings, InsertSettings, Contact, InsertContact,
  Template, InsertTemplate, Campaign, InsertCampaign, Message, InsertMessage,
  Reply, InsertReply, BotRule, InsertBotRule
} from "@shared/schema";
import { randomUUID } from "crypto";
import session, { Store } from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { users, settings, contacts, templates, campaigns, messages, replies, botRules } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Settings
  getSettings(): Promise<Settings | undefined>;
  createOrUpdateSettings(settings: InsertSettings): Promise<Settings>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  bulkCreateContacts(contacts: InsertContact[]): Promise<Contact[]>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Messages
  getMessages(campaignId?: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessageByWhatsAppId(whatsappMessageId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  
  // Contact and Template lookups
  getContactByPhone(phone: string): Promise<Contact | undefined>;
  getTemplateByWhatsAppId(templateId: string): Promise<Template | undefined>;

  // Replies
  getReplies(): Promise<Reply[]>;
  getReply(id: string): Promise<Reply | undefined>;
  createReply(reply: InsertReply): Promise<Reply>;

  // Bot Rules
  getBotRules(): Promise<BotRule[]>;
  getActiveBotRules(): Promise<BotRule[]>;
  getBotRule(id: string): Promise<BotRule | undefined>;
  createBotRule(rule: InsertBotRule): Promise<BotRule>;
  updateBotRule(id: string, updates: Partial<BotRule>): Promise<BotRule | undefined>;
  deleteBotRule(id: string): Promise<boolean>;

  // Session store
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private settings: Settings | undefined;
  private contacts: Map<string, Contact>;
  private templates: Map<string, Template>;
  private campaigns: Map<string, Campaign>;
  private messages: Map<string, Message>;
  private replies: Map<string, Reply>;
  private botRules: Map<string, BotRule>;
  public sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.templates = new Map();
    this.campaigns = new Map();
    this.messages = new Map();
    this.replies = new Map();
    this.botRules = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Add demo templates for testing
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Demo template 1 - Welcome message
    const template1: Template = {
      id: randomUUID(),
      templateId: "welcome_template",
      name: "Welcome Message",
      category: "marketing",
      language: "en",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Welcome to Our Service!"
        },
        {
          type: "BODY",
          text: "Hello {{name}}, thank you for joining us! We're excited to have you as part of our community."
        },
        {
          type: "FOOTER",
          text: "Need help? Reply to this message anytime."
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Demo template 2 - Order confirmation
    const template2: Template = {
      id: randomUUID(),
      templateId: "order_confirmation",
      name: "Order Confirmation", 
      category: "utility",
      language: "en",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Order Confirmed"
        },
        {
          type: "BODY",
          text: "Hi {{name}}, your order #{{order_id}} has been confirmed and will be delivered by {{delivery_date}}."
        },
        {
          type: "BUTTONS",
          buttons: [
            { type: "URL", text: "Track Order", url: "https://example.com/track" },
            { type: "PHONE_NUMBER", text: "Call Support", phone_number: "+1234567890" }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Demo template 3 - Appointment reminder
    const template3: Template = {
      id: randomUUID(),
      templateId: "appointment_reminder",
      name: "Appointment Reminder",
      category: "utility", 
      language: "en",
      components: [
        {
          type: "BODY",
          text: "Hi {{name}}, this is a reminder that you have an appointment scheduled for {{date}} at {{time}}. Please reply CONFIRM to confirm or RESCHEDULE to change your appointment."
        },
        {
          type: "BUTTONS",
          buttons: [
            { type: "QUICK_REPLY", text: "CONFIRM" },
            { type: "QUICK_REPLY", text: "RESCHEDULE" }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(template1.id, template1);
    this.templates.set(template2.id, template2);
    this.templates.set(template3.id, template3);

    // Add a demo contact for testing
    const demoContact: Contact = {
      id: randomUUID(),
      name: "John Demo",
      phone: "+1234567890",
      tags: ["demo", "test"],
      groups: ["customers"],
      variables: { company: "Demo Corp", plan: "Premium" },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contacts.set(demoContact.id, demoContact);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id, 
      role: insertUser.role || "agent",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async createOrUpdateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const settings: Settings = {
      phoneNumberId: insertSettings.phoneNumberId ?? null,
      wabaId: insertSettings.wabaId ?? null,
      accessToken: insertSettings.accessToken ?? null,
      createdBy: insertSettings.createdBy ?? null,
      id: this.settings?.id || randomUUID(),
      createdAt: this.settings?.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.settings = settings;
    return settings;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      name: insertContact.name,
      phone: insertContact.phone,
      variables: insertContact.variables ?? {},
      tags: (insertContact.tags ?? []) as string[],
      groups: (insertContact.groups ?? []) as string[],
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updatedContact = { ...contact, ...updates, updatedAt: new Date() };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async bulkCreateContacts(contacts: InsertContact[]): Promise<Contact[]> {
    const createdContacts: Contact[] = [];
    for (const contact of contacts) {
      const created = await this.createContact(contact);
      createdContacts.push(created);
    }
    return createdContacts;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = {
      templateId: insertTemplate.templateId,
      name: insertTemplate.name,
      category: insertTemplate.category,
      language: insertTemplate.language,
      components: insertTemplate.components ?? [],
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;
    const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      name: insertCampaign.name,
      description: insertCampaign.description ?? null,
      status: insertCampaign.status || "draft",
      templateId: insertCampaign.templateId ?? null,
      contacts: (insertCampaign.contacts ?? []) as string[],
      schedule: (insertCampaign.schedule as any) || { type: "immediate" },
      createdBy: insertCampaign.createdBy ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    const updatedCampaign = { ...campaign, ...updates, updatedAt: new Date() };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return this.campaigns.delete(id);
  }

  // Messages
  async getMessages(campaignId?: string): Promise<Message[]> {
    const messages = Array.from(this.messages.values());
    return campaignId ? messages.filter(m => m.campaignId === campaignId) : messages;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      campaignId: insertMessage.campaignId ?? null,
      contactId: insertMessage.contactId ?? null,
      templateId: insertMessage.templateId ?? null,
      whatsappMessageId: insertMessage.whatsappMessageId ?? null,
      status: insertMessage.status || "queued",
      source: insertMessage.source || "manual",
      error: insertMessage.error ?? null,
      sentAt: insertMessage.sentAt ?? null,
      deliveredAt: insertMessage.deliveredAt ?? null,
      readAt: insertMessage.readAt ?? null,
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    const updatedMessage = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async getMessageByWhatsAppId(whatsappMessageId: string): Promise<Message | undefined> {
    return Array.from(this.messages.values()).find(message => message.whatsappMessageId === whatsappMessageId);
  }

  // Contact and Template lookups
  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(contact => contact.phone === phone);
  }

  async getTemplateByWhatsAppId(templateId: string): Promise<Template | undefined> {
    return Array.from(this.templates.values()).find(template => template.templateId === templateId);
  }

  // Replies
  async getReplies(): Promise<Reply[]> {
    return Array.from(this.replies.values());
  }

  async getReply(id: string): Promise<Reply | undefined> {
    return this.replies.get(id);
  }

  async createReply(insertReply: InsertReply): Promise<Reply> {
    const id = randomUUID();
    const reply: Reply = {
      contactId: insertReply.contactId ?? null,
      messageId: insertReply.messageId ?? null,
      text: insertReply.text ?? null,
      mediaUrl: insertReply.mediaUrl ?? null,
      type: insertReply.type,
      receivedAt: insertReply.receivedAt ?? new Date(),
      campaignId: insertReply.campaignId ?? null,
      id,
      createdAt: new Date()
    };
    this.replies.set(id, reply);
    return reply;
  }

  // Bot Rules
  async getBotRules(): Promise<BotRule[]> {
    return Array.from(this.botRules.values());
  }

  async getActiveBotRules(): Promise<BotRule[]> {
    return Array.from(this.botRules.values()).filter(rule => rule.active);
  }

  async getBotRule(id: string): Promise<BotRule | undefined> {
    return this.botRules.get(id);
  }

  async createBotRule(insertRule: InsertBotRule): Promise<BotRule> {
    const id = randomUUID();
    const rule: BotRule = {
      name: insertRule.name,
      triggerType: insertRule.triggerType ?? "exact",
      triggers: (insertRule.triggers ?? []) as string[],
      replyType: insertRule.replyType ?? "text",
      replyContent: (insertRule.replyContent ?? {}) as { text?: string; templateId?: string; mediaUrl?: string; },
      priority: insertRule.priority ?? 1,
      active: insertRule.active ?? true,
      createdBy: insertRule.createdBy ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.botRules.set(id, rule);
    return rule;
  }

  async updateBotRule(id: string, updates: Partial<BotRule>): Promise<BotRule | undefined> {
    const rule = this.botRules.get(id);
    if (!rule) return undefined;
    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.botRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteBotRule(id: string): Promise<boolean> {
    return this.botRules.delete(id);
  }
}

// Database storage implementation

class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  public sessionStore: Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
    
    // Use PostgreSQL session store
    const pgSession = connectPgSimple(session);
    this.sessionStore = new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const result = await this.db.select().from(settings).limit(1);
    return result[0];
  }

  async createOrUpdateSettings(settingsData: InsertSettings): Promise<Settings> {
    const existing = await this.getSettings();
    if (existing) {
      const result = await this.db.update(settings).set(settingsData).where(eq(settings.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await this.db.insert(settings).values(settingsData).returning();
      return result[0];
    }
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await this.db.select().from(contacts);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const result = await this.db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const result = await this.db.insert(contacts).values(contact as any).returning();
    return result[0];
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const result = await this.db.update(contacts).set(updates).where(eq(contacts.id, id)).returning();
    return result[0];
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await this.db.delete(contacts).where(eq(contacts.id, id));
    return result.rowCount! > 0;
  }

  async bulkCreateContacts(contactsData: InsertContact[]): Promise<Contact[]> {
    const result = await this.db.insert(contacts).values(contactsData as any).returning();
    return result;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return await this.db.select().from(templates);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const result = await this.db.select().from(templates).where(eq(templates.id, id));
    return result[0];
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const result = await this.db.insert(templates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const result = await this.db.update(templates).set(updates).where(eq(templates.id, id)).returning();
    return result[0];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(templates).where(eq(templates.id, id));
    return result.rowCount! > 0;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await this.db.select().from(campaigns);
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const result = await this.db.select().from(campaigns).where(eq(campaigns.id, id));
    return result[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const result = await this.db.insert(campaigns).values(campaign as any).returning();
    return result[0];
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const result = await this.db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return result[0];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await this.db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount! > 0;
  }

  // Messages
  async getMessages(campaignId?: string): Promise<Message[]> {
    if (campaignId) {
      return await this.db.select().from(messages).where(eq(messages.campaignId, campaignId));
    }
    return await this.db.select().from(messages);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessageByWhatsAppId(whatsappMessageId: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.whatsappMessageId, whatsappMessageId));
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values(message).returning();
    return result[0];
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const result = await this.db.update(messages).set(updates).where(eq(messages.id, id)).returning();
    return result[0];
  }

  // Contact and Template lookups
  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    const result = await this.db.select().from(contacts).where(eq(contacts.phone, phone));
    return result[0];
  }

  async getTemplateByWhatsAppId(templateId: string): Promise<Template | undefined> {
    const result = await this.db.select().from(templates).where(eq(templates.templateId, templateId));
    return result[0];
  }

  // Replies
  async getReplies(): Promise<Reply[]> {
    return await this.db.select().from(replies);
  }

  async getReply(id: string): Promise<Reply | undefined> {
    const result = await this.db.select().from(replies).where(eq(replies.id, id));
    return result[0];
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const result = await this.db.insert(replies).values(reply).returning();
    return result[0];
  }

  // Bot Rules
  async getBotRules(): Promise<BotRule[]> {
    return await this.db.select().from(botRules);
  }

  async getActiveBotRules(): Promise<BotRule[]> {
    return await this.db.select().from(botRules).where(eq(botRules.active, true));
  }

  async getBotRule(id: string): Promise<BotRule | undefined> {
    const result = await this.db.select().from(botRules).where(eq(botRules.id, id));
    return result[0];
  }

  async createBotRule(rule: InsertBotRule): Promise<BotRule> {
    const result = await this.db.insert(botRules).values(rule as any).returning();
    return result[0];
  }

  async updateBotRule(id: string, updates: Partial<BotRule>): Promise<BotRule | undefined> {
    const result = await this.db.update(botRules).set(updates).where(eq(botRules.id, id)).returning();
    return result[0];
  }

  async deleteBotRule(id: string): Promise<boolean> {
    const result = await this.db.delete(botRules).where(eq(botRules.id, id));
    return result.rowCount! > 0;
  }
}

// Use database storage instead of memory storage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
