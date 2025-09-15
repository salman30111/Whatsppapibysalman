import OpenAI from "openai";
import { storage } from "./storage";
import { InsertMessage } from "@shared/schema";
import type { Contact } from "@shared/schema";
import axios from "axios";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// However, use gpt-4o-mini as default fallback for reliability
const FALLBACK_MODEL = "gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful WhatsApp assistant for our business. Provide concise, friendly, and professional responses to customer inquiries. Keep responses brief and relevant to their questions.";

export class AIProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * Process incoming message with AI and send automated reply
   */
  async processMessage(
    messageText: string, 
    from: string, 
    contact: Contact | null
  ): Promise<{
    success: boolean;
    replyContent?: string;
    error?: string;
  }> {
    try {
      // Check if AI is enabled in settings
      const settings = await storage.getSettings();
      if (!settings?.accessToken || !settings?.phoneNumberId) {
        return { success: false, error: "WhatsApp API not configured" };
      }

      // Get AI configuration from settings
      const aiEnabled = settings.aiEnabled ?? true;
      const configuredModel = settings.aiModel || FALLBACK_MODEL;
      const customModelId = settings.customModelId;
      const systemPrompt = settings.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT;

      if (!aiEnabled) {
        return { success: false, error: "AI replies are disabled" };
      }

      // Choose model: custom model ID takes precedence, then configured model, then fallback
      const model = customModelId || configuredModel || FALLBACK_MODEL;

      // Validate OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: "OpenAI API key not configured" };
      }

      // Generate AI response
      const aiResponse = await this.generateAIResponse(messageText, systemPrompt, model);
      if (!aiResponse.success || !aiResponse.content) {
        return { success: false, error: aiResponse.error || "Failed to generate AI response" };
      }

      // Send reply via WhatsApp API
      const replyResult = await this.sendWhatsAppReply(
        from, 
        aiResponse.content, 
        settings, 
        contact
      );

      if (replyResult.success) {
        return { 
          success: true, 
          replyContent: aiResponse.content 
        };
      } else {
        return { 
          success: false, 
          error: replyResult.error || "Failed to send WhatsApp reply" 
        };
      }

    } catch (error) {
      console.error("AI processing failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "AI processing failed" 
      };
    }
  }

  /**
   * Generate AI response using OpenAI API
   */
  private async generateAIResponse(
    messageText: string, 
    systemPrompt: string, 
    model: string
  ): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: messageText
          }
        ],
        max_tokens: 500, // Limit response length for WhatsApp
        temperature: 0.7, // Balanced creativity
      });

      const aiContent = response.choices[0]?.message?.content?.trim();
      if (!aiContent) {
        return { success: false, error: "Empty response from OpenAI" };
      }

      return { success: true, content: aiContent };

    } catch (error) {
      console.error("OpenAI API error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "OpenAI API failed" 
      };
    }
  }

  /**
   * Send AI-generated reply via WhatsApp Business API
   */
  private async sendWhatsAppReply(
    to: string, 
    content: string, 
    settings: any, 
    contact: Contact | null
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Decrypt access token (reuse logic from bot-processor)
      const accessToken = this.decryptAccessToken(settings.accessToken);

      const messagePayload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: content }
      };

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

      // Log the AI reply as a message
      if (response.data?.messages?.[0]?.id) {
        const aiMessage: InsertMessage = {
          contactId: contact?.id || null,
          templateId: null,
          whatsappMessageId: response.data.messages[0].id,
          status: "sent",
          source: "ai", // Mark as AI-generated message
          sentAt: new Date(),
          campaignId: null,
          error: null,
          deliveredAt: null,
          readAt: null
        };

        await storage.createMessage(aiMessage);
      }

      return { success: true };

    } catch (error) {
      console.error("Failed to send WhatsApp AI reply:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send reply" 
      };
    }
  }

  /**
   * Decrypt access token (same logic as bot-processor)
   */
  private decryptAccessToken(encryptedToken: string): string {
    try {
      const crypto = require("crypto");
      const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
      
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
      // Fallback: assume token is already decrypted
      return encryptedToken;
    }
  }
}

// Export singleton instance
export const aiProcessor = new AIProcessor();