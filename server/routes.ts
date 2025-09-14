import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertContactSchema, insertTemplateSchema, insertCampaignSchema, 
  insertMessageSchema, insertReplySchema, insertSettingsSchema,
  type Message
} from "@shared/schema";
import crypto from "crypto";
import { getNotificationService } from "./notifications";
import { sessionMiddleware } from "./auth";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Ensure ENCRYPTION_KEY is a proper Buffer
  const key = Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  
  if (textParts.length !== 2) {
    throw new Error(`Invalid encrypted format: expected 2 parts, got ${textParts.length}`);
  }
  
  const ivHex = textParts[0];
  const encryptedText = textParts[1];
  
  if (ivHex.length !== IV_LENGTH * 2) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH * 2} hex chars, got ${ivHex.length}`);
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  // Ensure ENCRYPTION_KEY is a proper Buffer
  const key = Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
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
      
      if (!settings) {
        return res.json(null);
      }
      
      // Always create a fresh copy to avoid any mutation
      const responseSettings = {
        id: settings.id,
        phoneNumberId: settings.phoneNumberId,
        wabaId: settings.wabaId,
        accessToken: settings.accessToken,
        createdBy: settings.createdBy,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      };
      
      // Decrypt access token only in the response copy
      if (responseSettings.accessToken) {
        responseSettings.accessToken = decrypt(responseSettings.accessToken);
      }
      
      res.json(responseSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      
      // Create storage data with encrypted access token
      const storageData = {
        phoneNumberId: settingsData.phoneNumberId,
        wabaId: settingsData.wabaId,
        accessToken: settingsData.accessToken ? encrypt(settingsData.accessToken) : undefined,
        createdBy: req.user!.id
      };
      
      const settings = await storage.createOrUpdateSettings(storageData);
      
      // Create clean response with decrypted access token
      const responseSettings = {
        id: settings.id,
        phoneNumberId: settings.phoneNumberId,
        wabaId: settings.wabaId,
        accessToken: settingsData.accessToken, // Use original unencrypted value for response
        createdBy: settings.createdBy,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      };
      
      res.json(responseSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
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
      // Validate request body
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      
      // Ensure contacts is properly typed as string array if present and schedule is properly typed
      const updateData = {
        ...validatedData,
        contacts: validatedData.contacts && Array.isArray(validatedData.contacts) 
          ? validatedData.contacts.map(String) as string[]
          : validatedData.contacts,
        schedule: validatedData.schedule ? {
          ...validatedData.schedule,
          type: validatedData.schedule.type as "immediate" | "scheduled" | "recurring",
          startTime: validatedData.schedule.startTime && 
            (typeof validatedData.schedule.startTime === 'string' || 
             typeof validatedData.schedule.startTime === 'number' ||
             validatedData.schedule.startTime instanceof Date) 
            ? new Date(validatedData.schedule.startTime as string | number | Date) 
            : undefined,
          recurrence: validatedData.schedule.recurrence as "daily" | "weekly" | "monthly" | "none" | undefined,
          timezone: validatedData.schedule.timezone as string | undefined
        } : validatedData.schedule
      };
      
      const campaign = await storage.updateCampaign(req.params.id, updateData);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      
      // Handle campaign scheduling if status is being set to 'scheduled'
      if (updateData.status === 'scheduled' && campaign.schedule) {
        const { getCampaignScheduler } = await import('./campaign-scheduler');
        const scheduler = getCampaignScheduler();
        
        if (campaign.schedule.type === 'immediate') {
          // Execute immediately
          scheduler.scheduleImmediateCampaign(campaign.id);
        } else if (campaign.schedule.type === 'scheduled' && campaign.schedule.startTime) {
          // Schedule for specific time
          scheduler.scheduleCampaign(campaign.id, new Date(campaign.schedule.startTime));
        } else if (campaign.schedule.type === 'recurring' && campaign.schedule.recurrence && campaign.schedule.recurrence !== 'none') {
          // Schedule recurring campaign
          scheduler.scheduleRecurringCampaign(
            campaign.id, 
            campaign.schedule.recurrence, 
            campaign.schedule.startTime ? new Date(campaign.schedule.startTime) : undefined
          );
        }
      }
      
      // Send notification for campaign status change
      if (updateData.status && req.user?.id) {
        try {
          const notificationService = getNotificationService(app);
          notificationService.campaignStatusChanged(
            req.user.id,
            campaign.name,
            campaign.status,
            campaign.id
          );
        } catch (notifError) {
          console.error('Failed to send campaign notification:', notifError);
        }
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Campaign update error:', error);
      
      // Send error notification
      if (req.user?.id) {
        try {
          const notificationService = getNotificationService(app);
          notificationService.apiError(req.user.id, 'Update Campaign', error instanceof Error ? error.message : 'Unknown error');
        } catch (notifError) {
          console.error('Failed to send error notification:', notifError);
        }
      }
      
      res.status(400).json({ message: "Failed to update campaign" });
    }
  });

  // Campaign execution routes
  app.post("/api/campaigns/:id/execute", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      
      const { getCampaignScheduler } = await import('./campaign-scheduler');
      const scheduler = getCampaignScheduler();
      
      // Execute campaign immediately
      await scheduler.scheduleImmediateCampaign(campaign.id);
      
      res.json({ message: "Campaign execution started", campaignId: campaign.id });
    } catch (error) {
      console.error('Campaign execution error:', error);
      res.status(500).json({ message: "Failed to execute campaign" });
    }
  });

  app.post("/api/campaigns/:id/pause", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaign = await storage.updateCampaign(req.params.id, { status: 'paused' });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      
      // Cancel the scheduled task
      const { getCampaignScheduler } = await import('./campaign-scheduler');
      const scheduler = getCampaignScheduler();
      scheduler.pauseCampaign(campaign.id);
      
      // Send notification
      if (req.user?.id) {
        try {
          const notificationService = getNotificationService(app);
          notificationService.campaignStatusChanged(
            req.user.id,
            campaign.name,
            'paused',
            campaign.id
          );
        } catch (notifError) {
          console.error('Failed to send pause notification:', notifError);
        }
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Campaign pause error:', error);
      res.status(500).json({ message: "Failed to pause campaign" });
    }
  });

  app.post("/api/campaigns/:id/stop", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const campaign = await storage.updateCampaign(req.params.id, { status: 'stopped' });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      
      // Cancel the scheduled task permanently
      const { getCampaignScheduler } = await import('./campaign-scheduler');
      const scheduler = getCampaignScheduler();
      scheduler.cancelCampaign(campaign.id);
      
      // Send notification
      if (req.user?.id) {
        try {
          const notificationService = getNotificationService(app);
          notificationService.campaignStatusChanged(
            req.user.id,
            campaign.name,
            'stopped',
            campaign.id
          );
        } catch (notifError) {
          console.error('Failed to send stop notification:', notifError);
        }
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Campaign stop error:', error);
      res.status(500).json({ message: "Failed to stop campaign" });
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
      
      // Debug logging
      console.log("Send message request:", { phone, templateId, parameters });
      
      const settings = await storage.getSettings();
      if (!settings || !settings.accessToken || !settings.phoneNumberId) {
        return res.status(400).json({ message: "WhatsApp API credentials not configured" });
      }

      // Debug: List available templates
      const allTemplates = await storage.getTemplates();
      console.log("Available templates:", allTemplates.map(t => ({ id: t.id, templateId: t.templateId, name: t.name })));

      // Get the actual template from database using WhatsApp template ID
      const template = await storage.getTemplateByWhatsAppId(templateId);
      console.log("Found template:", template ? { id: template.id, templateId: template.templateId, name: template.name } : "NOT FOUND");
      
      if (!template) {
        return res.status(400).json({ message: "Template not found" });
      }

      const accessToken = decrypt(settings.accessToken);
      
      // Build template components based on the actual template structure
      const components = [];
      if (parameters && parameters.length > 0 && template.components) {
        // Find body component and add parameters to it
        const bodyComponent = template.components.find(c => c.type === "BODY");
        if (bodyComponent) {
          components.push({
            type: "body",
            parameters: parameters.map((param: string) => ({ type: "text", text: param }))
          });
        }
      }
      
      // Send message via WhatsApp API using correct template name and language
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
            name: template.templateId, // Use the actual WhatsApp template name
            language: { code: template.language }, // Use the template's actual language
            components: components
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `WhatsApp API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Find contact 
      const contact = await storage.getContactByPhone(phone);
      
      // Log the message with WhatsApp message ID
      const messageData = insertMessageSchema.parse({
        contactId: contact?.id || null,
        templateId: template.id,
        whatsappMessageId: result.messages[0].id,
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
  // Webhook verification endpoint for WhatsApp
  app.get("/api/webhook/whatsapp", async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log("Webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      const { entry } = req.body;
      
      for (const entryItem of entry) {
        for (const change of entryItem.changes) {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;
            
            // Handle incoming messages (replies)
            if (messages) {
              for (const message of messages) {
                try {
                  // Find contact by sender phone number
                  const contact = await storage.getContactByPhone(message.from);
                  
                  const replyData = insertReplySchema.parse({
                    contactId: contact?.id || null,
                    messageId: message.id,
                    text: message.text?.body || message.caption || '',
                    mediaUrl: message.image?.link || message.document?.link || message.audio?.link || message.video?.link || null,
                    type: message.type,
                    receivedAt: new Date(parseInt(message.timestamp) * 1000),
                  });
                  
                  await storage.createReply(replyData);
                  
                  // Send real-time notification for new reply
                  try {
                    const notificationService = getNotificationService(app);
                    if (contact) {
                      // Notify all users for now - could be more specific based on campaign ownership
                      notificationService.sendToAll({
                        type: 'info',
                        title: 'New Reply Received',
                        message: `New reply from ${contact.name} (${contact.phone})`,
                        data: {
                          replyId: replyData.messageId,
                          contactName: contact.name,
                          contactPhone: contact.phone,
                          text: replyData.text,
                          messageType: replyData.type,
                          receivedAt: replyData.receivedAt
                        }
                      });
                    }
                  } catch (notifError) {
                    console.error('Failed to send reply notification:', notifError);
                  }
                } catch (replyError) {
                  console.error('Failed to process incoming message:', replyError);
                }
              }
            }
            
            // Handle message status updates
            if (statuses) {
              for (const status of statuses) {
                try {
                  // Find message by WhatsApp message ID
                  const message = await storage.getMessageByWhatsAppId(status.id);
                  
                  if (message) {
                    // Update message status and timestamps
                    const updates: Partial<Message> = {
                      status: status.status as any,
                    };
                    
                    // Set appropriate timestamps based on status
                    const statusTimestamp = new Date(parseInt(status.timestamp) * 1000);
                    switch (status.status) {
                      case 'delivered':
                        updates.deliveredAt = statusTimestamp;
                        break;
                      case 'read':
                        updates.readAt = statusTimestamp;
                        if (!message.deliveredAt) {
                          updates.deliveredAt = statusTimestamp;
                        }
                        break;
                      case 'failed':
                        updates.error = status.errors?.[0]?.title || 'Message delivery failed';
                        break;
                    }
                    
                    await storage.updateMessage(message.id, updates);
                    
                    // Send real-time notification for delivery status
                    try {
                      const notificationService = getNotificationService(app);
                      notificationService.sendToAll({
                        type: status.status === 'failed' ? 'error' : 'info',
                        title: 'Message Status Update',
                        message: `Message ${status.status}`,
                        data: {
                          messageId: message.id,
                          whatsappMessageId: status.id,
                          status: status.status,
                          timestamp: statusTimestamp,
                          campaignId: message.campaignId,
                          contactId: message.contactId,
                          error: updates.error
                        }
                      });
                    } catch (notifError) {
                      console.error('Failed to send delivery notification:', notifError);
                    }
                  }
                } catch (statusError) {
                  console.error('Failed to process status update:', statusError);
                }
              }
            }
          }
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(500).json({ message: "Webhook processing failed" });
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

  // Chart analytics endpoint
  app.get("/api/analytics/chart-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const period = req.query.period as string || '7days';
      const messages = await storage.getMessages();
      
      // Calculate date range
      const startDate = new Date();
      const days = period === '30days' ? 30 : period === '90days' ? 90 : 7;
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);
      
      // Generate chart data for each day
      const chartData = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        
        const dayMessages = messages.filter(m => 
          m.sentAt && m.sentAt >= currentDate && m.sentAt < nextDate
        );
        
        const sent = dayMessages.length;
        const delivered = dayMessages.filter(m => 
          m.status === 'delivered' || m.status === 'read'
        ).length;
        const failed = dayMessages.filter(m => 
          m.status === 'failed'
        ).length;
        
        const dayName = days <= 7 ? dayNames[currentDate.getDay()] : 
                       `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
        
        chartData.push({
          name: dayName,
          sent,
          delivered,
          failed
        });
      }
      
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  // Success rate analytics endpoint
  app.get("/api/analytics/success-rate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messages = await storage.getMessages();
      
      const deliveredMessages = messages.filter(m => 
        m.status === 'delivered' || m.status === 'read'
      ).length;
      const failedMessages = messages.filter(m => 
        m.status === 'failed'
      ).length;
      
      const totalMessages = messages.length;
      
      if (totalMessages === 0) {
        return res.json([
          { name: 'No Data', value: 100, fill: 'hsl(var(--muted))' }
        ]);
      }
      
      const deliveredRate = (deliveredMessages / totalMessages) * 100;
      const failedRate = (failedMessages / totalMessages) * 100;
      
      res.json([
        { 
          name: 'Delivered', 
          value: Math.round(deliveredRate * 10) / 10, 
          fill: 'hsl(var(--chart-2))' 
        },
        { 
          name: 'Failed', 
          value: Math.round(failedRate * 10) / 10, 
          fill: 'hsl(var(--destructive))' 
        }
      ]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch success rate data" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up Socket.IO for real-time notifications
  const io = new SocketServer(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  // Share Express session with Socket.IO
  io.engine.use(sessionMiddleware);

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const req: any = socket.request;
    console.log('Socket auth check - Cookie:', !!req.headers.cookie, 'SessionID:', req.sessionID, 'Passport:', !!req.session?.passport);
    const userId = req.session?.passport?.user;
    if (!userId) {
      console.log('Socket auth failed: No user in session');
      return next(new Error('unauthorized'));
    }
    (socket as any).userId = userId;
    socket.join(`user_${userId}`);
    console.log(`Socket authenticated for user ${userId}`);
    return next();
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    console.log(`User ${userId} connected:`, socket.id);
    socket.emit('authenticated', { userId });
    
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected:`, socket.id);
    });
  });

  // Make io available globally for notifications
  (app as any).io = io;
  
  return httpServer;
}
