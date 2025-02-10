import { Consumer } from 'kafkajs';
import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { NotificationStore } from './notification.store';
import { NotificationType, Notification, MessageNotificationData, CallNotificationData, ChannelNotificationData, FriendRequestNotificationData } from '../types/notification.types';
import { verifyToken } from '../middleware/auth';

export class NotificationService {
  constructor(
    private consumer: Consumer,
    private io: SocketServer,
    private notificationStore: NotificationStore
  ) {}

  async start(): Promise<void> {
    try {
      this.setupWebSocket();

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) {
            logger.warn('Received empty message');
            return;
          }
          
          try {
            const notification = JSON.parse(message.value.toString());
            logger.info(`Received notification from topic ${topic}:`, notification);
            
            await this.processNotification(topic, notification);
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        }
      });
    } catch (error) {
      logger.error('Error starting notification service:', error);
      throw error;
    }
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected:', socket.id);

      socket.on('authenticate', async (token: string) => {
        try {
          const userId = await verifyToken(token);
          if (!userId) {
            throw new Error('Invalid token');
          }
          
          socket.data.userId = userId;
          socket.join(`user:${userId}`);
          
          // Отправляем непрочитанные уведомления
          const unreadNotifications = await this.notificationStore.getUnreadNotifications(userId);
          socket.emit('unread_notifications', unreadNotifications);
          
          logger.info(`User ${userId} authenticated on socket ${socket.id}`);
        } catch (error) {
          logger.error('Authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      socket.on('mark_as_read', async (notificationId: string) => {
        try {
          const userId = socket.data.userId;
          if (!userId) {
            throw new Error('User not authenticated');
          }
          await this.notificationStore.markAsRead(notificationId, userId);
        } catch (error) {
          logger.error('Error marking notification as read:', error);
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.id);
      });
    });
  }

  private async processNotification(topic: string, data: any): Promise<void> {
    try {
      let notification: Notification;

      switch (topic) {
        case 'messages':
          notification = this.createMessageNotification(data);
          break;
        case 'calls':
          notification = this.createCallNotification(data);
          break;
        case 'channels':
          notification = this.createChannelNotification(data);
          break;
        case 'friend-requests':
          notification = this.createFriendRequestNotification(data);
          break;
        default:
          logger.warn(`Unknown topic: ${topic}`);
          return;
      }

      await this.notificationStore.addNotification(notification);
      this.io.to(`user:${notification.userId}`).emit('notification', notification);
    } catch (error) {
      logger.error(`Error processing notification for topic ${topic}:`, error);
    }
  }

  private createMessageNotification(data: MessageNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.NEW_MESSAGE,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        messageId: data.messageId,
        senderId: data.senderId,
        content: data.content,
        channelId: data.channelId,
        serverId: data.serverId,
        recipientId: data.recipientId
      }

    };
  }

  private createCallNotification(data: CallNotificationData): Notification {
    return {
      id: randomUUID(),
      type: data.action === 'started' ? NotificationType.CALL_STARTED : NotificationType.CALL_ENDED,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        callId: data.callId,
        callerId: data.callerId,
        channelId: data.channelId,
        serverId: data.serverId,
        recipientId: data.recipientId,
        action: data.action
      }
    };
  }

  private createChannelNotification(data: ChannelNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.CHANNEL_CREATED,
      userId: data.userId,
      createdAt: new Date(),
      isRead: false,
      data: {
        channelId: data.channelId,
        serverId: data.serverId,
        channelName: data.channelName,
        userId: data.userId
      }
    };
  }

  private createFriendRequestNotification(data: FriendRequestNotificationData): Notification {
    return {
      id: randomUUID(),
      type: NotificationType.FRIEND_REQUEST,
      userId: data.recipientId,
      createdAt: new Date(),
      isRead: false,
      data: {
        requestId: data.requestId,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        recipientId: data.recipientId
      }
    };
  }
} 