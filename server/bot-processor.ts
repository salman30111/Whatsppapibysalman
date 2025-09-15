import { storage } from "./storage";
import type { BotRule, Contact, InsertMessage } from "@shared/schema";
import axios from "axios";

// Bot processing logic for WhatsApp messages
export class BotProcessor {
  
  /**
   * Process an incoming message and check if it triggers any bot rules
   * Returns the rule that was triggered and the reply that was sent (if any)
   */
  async processMessage(messageText: string, from: string, contact: Contact | null): Promise<{
    ruleTriggered?: BotRule;
    replyContent?: string;
    error?: string;
  }> {
    try {
      // Get all active bot rules
      const activeRules = await storage.getActiveBotRules();
      
      if (activeRules.length === 0) {
        return {}; // No active rules
      }
      
      // Find matching rule using hierarchy: exact > starts with > contains > regex
      const matchedRule = this.findMatchingRule(messageText.toLowerCase().trim(), activeRules);
      
      if (!matchedRule) {
        return {}; // No rules matched
      }
      
      // Send automated reply
      const replyResult = await this.sendAutomatedReply(matchedRule, from, contact);
      
      return {
        ruleTriggered: matchedRule,
        replyContent: replyResult.content,
        error: replyResult.error
      };
      
    } catch (error) {
      console.error("Bot processing error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown bot processing error"
      };
    }
  }
  
  /**
   * Find matching rule using hierarchy: exact > starts with > contains > regex
   * If multiple rules match within the same tier, return the one with highest priority
   */
  private findMatchingRule(messageText: string, rules: BotRule[]): BotRule | null {
    const matchTiers = {
      exact: [] as { rule: BotRule, priority: number }[],
      startswith: [] as { rule: BotRule, priority: number }[],
      contains: [] as { rule: BotRule, priority: number }[],
      regex: [] as { rule: BotRule, priority: number }[]
    };
    
    // Categorize matching rules by type
    for (const rule of rules) {
      const matches = this.checkRuleMatch(messageText, rule);
      if (matches) {
        matchTiers[rule.triggerType].push({ rule, priority: rule.priority });
      }
    }
    
    // Return highest priority match from the highest tier that has matches
    for (const tier of ['exact', 'startswith', 'contains', 'regex'] as const) {
      if (matchTiers[tier].length > 0) {
        // Sort by priority (highest first) and return the first one
        matchTiers[tier].sort((a, b) => b.priority - a.priority);
        return matchTiers[tier][0].rule;
      }
    }
    
    return null;
  }
  
  /**
   * Check if a message matches a specific rule's triggers
   */
  private checkRuleMatch(messageText: string, rule: BotRule): boolean {
    const triggers = Array.isArray(rule.triggers) ? rule.triggers : [];
    
    for (const trigger of triggers) {
      const triggerLower = trigger.toLowerCase().trim();
      
      switch (rule.triggerType) {
        case 'exact':
          if (messageText === triggerLower) return true;
          break;
          
        case 'startswith':
          if (messageText.startsWith(triggerLower)) return true;
          break;
          
        case 'contains':
          if (messageText.includes(triggerLower)) return true;
          break;
          
        case 'regex':
          try {
            const regex = new RegExp(trigger, 'i'); // Case insensitive
            if (regex.test(messageText)) return true;
          } catch (e) {
            console.warn(`Invalid regex pattern in rule ${rule.id}: ${trigger}`);
          }
          break;
      }
    }
    
    return false;
  }
  
  /**
   * Send automated reply based on the matched rule
   */
  private async sendAutomatedReply(rule: BotRule, to: string, contact: Contact | null): Promise<{
    content?: string;
    error?: string;
  }> {
    try {
      const settings = await storage.getSettings();
      if (!settings?.accessToken || !settings?.phoneNumberId) {
        return { error: "WhatsApp API not configured" };
      }
      
      // Decrypt access token
      const accessToken = this.decryptAccessToken(settings.accessToken);
      
      let messagePayload: any;
      let replyContent: string;
      
      switch (rule.replyType) {
        case 'text':
          const textContent = rule.replyContent?.text || "Hello! Thanks for your message.";
          replyContent = textContent;
          messagePayload = {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: textContent }
          };
          break;
          
        case 'template':
          const templateId = rule.replyContent?.templateId;
          if (!templateId) {
            return { error: "Template ID not specified in rule" };
          }
          
          const template = await storage.getTemplate(templateId);
          if (!template) {
            return { error: "Template not found" };
          }
          
          replyContent = `Template: ${template.name}`;
          messagePayload = {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template.templateId,
              language: { code: template.language }
            }
          };
          break;
          
        case 'media':
          const mediaUrl = rule.replyContent?.mediaUrl;
          if (!mediaUrl) {
            return { error: "Media URL not specified in rule" };
          }
          
          replyContent = `Media: ${mediaUrl}`;
          messagePayload = {
            messaging_product: "whatsapp",
            to,
            type: "image", // Assume image for now, could be enhanced
            image: { link: mediaUrl }
          };
          break;
          
        default:
          return { error: `Unsupported reply type: ${rule.replyType}` };
      }
      
      // Send message via WhatsApp API
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${settings.phoneNumberId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Log the bot reply as a message
      if (response.data?.messages?.[0]?.id) {
        const botMessage: InsertMessage = {
          contactId: contact?.id || null,
          templateId: rule.replyType === 'template' ? rule.replyContent?.templateId || null : null,
          whatsappMessageId: response.data.messages[0].id,
          status: "sent",
          source: "bot", // Mark as bot-generated message
          sentAt: new Date(),
          campaignId: null,
          error: null,
          deliveredAt: null,
          readAt: null
        };
        
        await storage.createMessage(botMessage);
      }
      
      return { content: replyContent };
      
    } catch (error) {
      console.error("Failed to send automated reply:", error);
      return { 
        error: error instanceof Error ? error.message : "Failed to send reply" 
      };
    }
  }
  
  /**
   * Decrypt access token (simplified version - in production use proper decryption)
   */
  private decryptAccessToken(encryptedToken: string): string {
    // This should match the decryption logic in routes.ts
    // For now, we'll assume it's already decrypted or use a simple implementation
    try {
      // Import crypto and decrypt using the same logic as in routes.ts
      const crypto = require("crypto");
      const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
      const IV_LENGTH = 16;
      
      const textParts = encryptedToken.split(':');
      if (textParts.length !== 2) {
        throw new Error("Invalid encrypted format");
      }
      
      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = textParts[1];
      const key = Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error("Failed to decrypt access token:", error);
      throw new Error("Unable to decrypt access token");
    }
  }
}

// Export singleton instance
export const botProcessor = new BotProcessor();