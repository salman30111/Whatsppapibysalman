import cron, { ScheduledTask } from 'node-cron';
import { storage } from './storage';
import { getNotificationService } from './notifications';
import { decrypt } from './crypto';
import { insertMessageSchema } from '@shared/schema';

interface CampaignScheduler {
  start(): void;
  stop(): void;
  scheduleImmediateCampaign(campaignId: string): Promise<void>;
  scheduleCampaign(campaignId: string, startTime: Date): void;
  scheduleRecurringCampaign(campaignId: string, recurrence: string, startTime?: Date): void;
  cancelCampaign(campaignId: string): boolean;
  pauseCampaign(campaignId: string): void;
  resumeCampaign(campaignId: string): void;
}

class CampaignSchedulerService implements CampaignScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    
    console.log('Starting campaign scheduler...');
    this.isRunning = true;
    
    // Check for scheduled and recurring campaigns every minute
    cron.schedule('* * * * *', () => {
      this.checkScheduledCampaigns();
    });
    
    console.log('Campaign scheduler started successfully');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    console.log('Stopping campaign scheduler...');
    
    // Stop all scheduled tasks
    for (const [campaignId, task] of Array.from(this.tasks.entries())) {
      task.stop();
      task.destroy();
    }
    this.tasks.clear();
    
    this.isRunning = false;
    console.log('Campaign scheduler stopped');
  }

  async scheduleImmediateCampaign(campaignId: string): Promise<void> {
    console.log(`Executing immediate campaign: ${campaignId}`);
    await this.executeCampaign(campaignId);
  }

  scheduleCampaign(campaignId: string, startTime: Date): void {
    const now = new Date();
    if (startTime <= now) {
      // If start time is in the past or now, execute immediately
      this.scheduleImmediateCampaign(campaignId);
      return;
    }

    console.log(`Scheduling campaign ${campaignId} for ${startTime.toISOString()}`);
    
    // Convert to cron format: minute hour day month dayOfWeek
    const minute = startTime.getMinutes();
    const hour = startTime.getHours();
    const day = startTime.getDate();
    const month = startTime.getMonth() + 1;
    
    const cronExpression = `${minute} ${hour} ${day} ${month} *`;
    
    const task = cron.schedule(cronExpression, async () => {
      await this.executeCampaign(campaignId);
      // Remove one-time scheduled task after execution
      this.tasks.delete(campaignId);
      task.destroy();
    }, { 
      timezone: 'UTC' // TODO: Use campaign timezone
    });
    
    this.tasks.set(campaignId, task);
    task.start();
  }

  scheduleRecurringCampaign(campaignId: string, recurrence: string, startTime?: Date): void {
    console.log(`Scheduling recurring campaign ${campaignId} with recurrence: ${recurrence}`);
    
    let cronExpression: string;
    const now = new Date();
    const hour = startTime ? startTime.getHours() : now.getHours();
    const minute = startTime ? startTime.getMinutes() : now.getMinutes();
    
    switch (recurrence) {
      case 'daily':
        cronExpression = `${minute} ${hour} * * *`; // Every day at specified time
        break;
      case 'weekly':
        const dayOfWeek = startTime ? startTime.getDay() : now.getDay();
        cronExpression = `${minute} ${hour} * * ${dayOfWeek}`; // Every week on same day
        break;
      case 'monthly':
        const dayOfMonth = startTime ? startTime.getDate() : now.getDate();
        cronExpression = `${minute} ${hour} ${dayOfMonth} * *`; // Every month on same date
        break;
      default:
        console.error(`Unknown recurrence pattern: ${recurrence}`);
        return;
    }
    
    const task = cron.schedule(cronExpression, async () => {
      await this.executeCampaign(campaignId);
    }, {
      timezone: 'UTC' // TODO: Use campaign timezone
    });
    
    this.tasks.set(campaignId, task);
    task.start();
  }

  private async checkScheduledCampaigns(): Promise<void> {
    try {
      const campaigns = await storage.getCampaigns();
      const now = new Date();
      
      for (const campaign of campaigns) {
        if (campaign.status === 'scheduled' && campaign.schedule) {
          const { type, startTime, recurrence } = campaign.schedule;
          
          if (type === 'scheduled' && startTime) {
            const scheduledTime = new Date(startTime);
            if (scheduledTime <= now && !this.tasks.has(campaign.id)) {
              await this.executeCampaign(campaign.id);
            }
          } else if (type === 'recurring' && recurrence && recurrence !== 'none') {
            // If recurring campaign is not already scheduled, schedule it
            if (!this.tasks.has(campaign.id)) {
              this.scheduleRecurringCampaign(campaign.id, recurrence, startTime ? new Date(startTime) : undefined);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking scheduled campaigns:', error);
    }
  }

  private async executeCampaign(campaignId: string): Promise<void> {
    try {
      console.log(`Executing campaign: ${campaignId}`);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        console.error(`Campaign not found: ${campaignId}`);
        return;
      }

      // Update campaign status to running
      await storage.updateCampaign(campaignId, { status: 'running' });

      // Get campaign details
      const template = campaign.templateId ? await storage.getTemplate(campaign.templateId) : null;
      if (!template) {
        console.error(`Template not found for campaign: ${campaignId}`);
        await storage.updateCampaign(campaignId, { status: 'stopped' });
        return;
      }

      // Get WhatsApp settings
      const settings = await storage.getSettings();
      if (!settings || !settings.accessToken || !settings.phoneNumberId) {
        console.error('WhatsApp API credentials not configured');
        await storage.updateCampaign(campaignId, { status: 'stopped' });
        return;
      }

      const accessToken = decrypt(settings.accessToken);
      let successCount = 0;
      let failureCount = 0;

      // Send messages to all contacts in the campaign
      const contacts = campaign.contacts || [];
      for (const contactId of contacts) {
        try {
          const contact = await storage.getContact(contactId);
          if (!contact) {
            console.error(`Contact not found: ${contactId}`);
            failureCount++;
            continue;
          }

          // Build template components based on the actual template structure
          const components = [];
          
          // Handle header with media (VIDEO, IMAGE, or DOCUMENT)
          const headerComponent = template.components?.find(c => c.type === "HEADER");
          if (headerComponent && (headerComponent.format === "VIDEO" || headerComponent.format === "IMAGE" || headerComponent.format === "DOCUMENT")) {
            console.log(`Campaign template has media header: ${headerComponent.format}`);
            
            if (!campaign.mediaId) {
              console.error(`Campaign ${campaignId} requires media but no mediaId found`);
              failureCount++;
              continue;
            }
            
            // Add header component with media ID
            const mediaType = headerComponent.format.toLowerCase();
            components.push({
              type: "header",
              parameters: [{
                type: mediaType,
                [mediaType]: {
                  id: campaign.mediaId
                }
              }]
            });
          }
          
          // Handle body parameters (support template variables from contact variables)
          if (template.components) {
            const bodyComponent = template.components.find(c => c.type === "BODY");
            if (bodyComponent && bodyComponent.text) {
              // Extract variable placeholders from body text
              const variableMatches = bodyComponent.text.match(/\{\{(\w+)\}\}/g);
              if (variableMatches && variableMatches.length > 0) {
                const parameters = variableMatches.map((match: string) => {
                  const variableName = match.replace(/[{}]/g, '');
                  // Use contact variable or fallback to placeholder
                  const value = contact.variables?.[variableName] || `{{${variableName}}}`;
                  return { type: "text", text: value };
                });
                
                components.push({
                  type: "body",
                  parameters
                });
              } else if (template.components.filter(c => c.type === 'BODY').length > 0) {
                // Add empty body component if body exists but no variables
                components.push({
                  type: "body",
                  parameters: []
                });
              }
            }
          }

          // Send message via WhatsApp API
          const response = await fetch(`https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "template",
              template: {
                name: template.templateId,
                language: { code: "en_US" },
                components
              }
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to send message to ${contact.phone}:`, error);
            failureCount++;
            
            // Log failed message
            const messageData = insertMessageSchema.parse({
              campaignId: campaign.id,
              contactId: contact.id,
              templateId: template.id,
              whatsappMessageId: null,
              status: "failed",
              error: error.error?.message || `WhatsApp API error: ${response.statusText}`,
              sentAt: new Date(),
            });
            await storage.createMessage(messageData);
            continue;
          }

          const result = await response.json();
          successCount++;

          // Log successful message
          const messageData = insertMessageSchema.parse({
            campaignId: campaign.id,
            contactId: contact.id,
            templateId: template.id,
            whatsappMessageId: result.messages[0].id,
            status: "sent",
            sentAt: new Date(),
          });
          await storage.createMessage(messageData);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error sending message to contact ${contactId}:`, error);
          failureCount++;
        }
      }

      // Update campaign status based on results
      const finalStatus = campaign.schedule?.type === 'recurring' ? 'scheduled' : 'completed';
      await storage.updateCampaign(campaignId, { status: finalStatus });

      // Send notification about campaign completion
      try {
        // Note: Would need Express app instance to get notification service
        // For now, just log the completion
        console.log(`Campaign ${campaign.id} completed. Notification:`, {
          campaignId: campaign.id,
          campaignName: campaign.name,
          successCount,
          failureCount,
          totalContacts: contacts.length,
          completedAt: new Date(),
        });
      } catch (notifError) {
        console.error('Failed to send campaign completion notification:', notifError);
      }

      console.log(`Campaign ${campaignId} completed. Success: ${successCount}, Failures: ${failureCount}`);

    } catch (error) {
      console.error(`Error executing campaign ${campaignId}:`, error);
      
      // Update campaign status to stopped on error
      try {
        await storage.updateCampaign(campaignId, { status: 'stopped' });
      } catch (updateError) {
        console.error('Failed to update campaign status after error:', updateError);
      }
    }
  }

  cancelCampaign(campaignId: string): boolean {
    const task = this.tasks.get(campaignId);
    if (!task) return false;
    task.stop();
    task.destroy();
    this.tasks.delete(campaignId);
    console.log(`Campaign ${campaignId} task cancelled`);
    return true;
  }

  pauseCampaign(campaignId: string): void {
    const task = this.tasks.get(campaignId);
    if (task) {
      task.stop();
      console.log(`Campaign ${campaignId} task paused`);
    }
  }

  resumeCampaign(campaignId: string): void {
    const task = this.tasks.get(campaignId);
    if (task) {
      task.start();
      console.log(`Campaign ${campaignId} task resumed`);
    }
  }
}

// Singleton instance
let schedulerInstance: CampaignSchedulerService | null = null;

export function getCampaignScheduler(): CampaignSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new CampaignSchedulerService();
  }
  return schedulerInstance;
}

export function startCampaignScheduler(): void {
  const scheduler = getCampaignScheduler();
  scheduler.start();
}

export function stopCampaignScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}