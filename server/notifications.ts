import type { Server as SocketServer } from "socket.io";

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  userId?: string;
  data?: any;
}

export class NotificationService {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId
    };

    this.io.to(`user_${userId}`).emit('notification', fullNotification);
    console.log(`Notification sent to user ${userId}:`, fullNotification.title);
  }

  // Send notification to all users
  sendToAll(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.io.emit('notification', fullNotification);
    console.log('Notification sent to all users:', fullNotification.title);
  }

  // Campaign status notifications
  campaignStatusChanged(userId: string, campaignName: string, status: string, campaignId: string) {
    const statusMessages: { [key: string]: string } = {
      'running': 'Campaign has started successfully',
      'paused': 'Campaign has been paused',
      'completed': 'Campaign has completed successfully',
      'failed': 'Campaign has failed'
    };

    this.sendToUser(userId, {
      type: status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'info',
      title: `Campaign ${status}`,
      message: `${campaignName}: ${statusMessages[status] || `Status changed to ${status}`}`,
      data: { campaignId, status }
    });
  }

  // API error notifications
  apiError(userId: string, operation: string, error: string) {
    this.sendToUser(userId, {
      type: 'error',
      title: 'API Error',
      message: `${operation}: ${error}`,
      data: { operation, error }
    });
  }

  // Message delivery notifications
  messageDelivered(userId: string, campaignName: string, deliveredCount: number, totalCount: number) {
    const isComplete = deliveredCount === totalCount;
    
    this.sendToUser(userId, {
      type: isComplete ? 'success' : 'info',
      title: isComplete ? 'Campaign Complete' : 'Messages Delivered',
      message: `${campaignName}: ${deliveredCount}/${totalCount} messages delivered`,
      data: { campaignName, deliveredCount, totalCount, isComplete }
    });
  }

  // Webhook notifications
  webhookReceived(userId: string, type: string, data: any) {
    this.sendToUser(userId, {
      type: 'info',
      title: 'Webhook Received',
      message: `New ${type} update received`,
      data: { type, ...data }
    });
  }
}

// Export a function to get the notification service instance
export function getNotificationService(app: any): NotificationService {
  if (!app.io) {
    throw new Error('Socket.IO not initialized');
  }
  return new NotificationService(app.io);
}