import { 
  User, InsertUser, Settings, InsertSettings, Contact, InsertContact,
  Template, InsertTemplate, Campaign, InsertCampaign, Message, InsertMessage,
  Reply, InsertReply
} from "@shared/schema";
import { randomUUID } from "crypto";
import session, { Store } from "express-session";
import createMemoryStore from "memorystore";

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
  public sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.templates = new Map();
    this.campaigns = new Map();
    this.messages = new Map();
    this.replies = new Map();
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
}

export const storage = new MemStorage();
