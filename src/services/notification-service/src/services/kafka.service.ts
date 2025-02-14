import { Kafka, Consumer, Producer } from 'kafkajs';
import { NotificationStore } from './notification.store';
import { NotificationType, Notification } from '../types/notification.types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

interface BaseNotificationData {
  type: 'message' | 'call' | 'channel';
}

interface MessageNotificationData extends BaseNotificationData {
  type: 'message';
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  channelId?: string;
  serverId?: string;
}

interface CallNotificationData extends BaseNotificationData {
  type: 'call';
  callId: string;
  callerId: string;
  recipientId: string;
  action: 'initiated' | 'accepted' | 'rejected' | 'ended';
  channelId?: string;
  serverId?: string;
}

interface ChannelNotificationData extends BaseNotificationData {
  type: 'channel';
  channelId: string;
  serverId: string;
  channelName: string;
  userId: string;
  action: 'created' | 'deleted' | 'updated';
}

type NotificationData = MessageNotificationData | CallNotificationData | ChannelNotificationData;

export class KafkaService {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private notificationStore: NotificationStore;

  constructor(notificationStore: NotificationStore) {
    this.notificationStore = notificationStore;
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    });

    this.consumer = this.kafka.consumer({ groupId: 'notification-service-group' });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();
      logger.info('Successfully connected to Kafka');
      await this.startConsumer();
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  private async startConsumer(): Promise<void> {
    try {
      await this.consumer.subscribe({
        topics: ['messages', 'calls', 'channels'],
        fromBeginning: true
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;
          
          const notification = this.createNotification(
            topic,
            JSON.parse(message.value.toString())
          );

          if (notification) {
            await this.notificationStore.addNotification(notification);
            logger.info(`Processed notification from topic ${topic}:`, notification);
          }
        }
      });
    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  private createNotification(topic: string, value: any): Notification | null {
    const id = randomUUID();
    const createdAt = new Date();

    switch (topic) {
      case 'messages':
        return {
          id,
          type: NotificationType.NEW_MESSAGE,
          userId: value.recipientId,
          createdAt,
          isRead: false,
          data: {
            messageId: value.messageId,
            senderId: value.senderId,
            recipientId: value.recipientId,
            content: value.content,
            channelId: value.channelId,
            serverId: value.serverId
          }
        };

      case 'calls':
        return {
          id,
          type: value.action === 'started' ? NotificationType.CALL_STARTED : NotificationType.CALL_ENDED,
          userId: value.recipientId,
          createdAt,
          isRead: false,
          data: {
            callId: value.callId,
            callerId: value.callerId,
            recipientId: value.recipientId,
            action: value.action,
            channelId: value.channelId,
            serverId: value.serverId
          }
        };

      case 'channels':
        return {
          id,
          type: NotificationType.CHANNEL_CREATED,
          userId: value.userId,
          createdAt,
          isRead: false,
          data: {
            channelId: value.channelId,
            serverId: value.serverId,
            channelName: value.channelName,
            userId: value.userId,
            action: value.action
          }
        };

      default:
        logger.warn(`Unknown topic: ${topic}`);
        return null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      logger.info('Successfully disconnected from Kafka');
    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }

  private async handleMessageEvent(data: any): Promise<void> {
    const notification: MessageNotificationData = {
      type: 'message',
      messageId: data.messageId,
      senderId: data.senderId,
      recipientId: data.recipientId,
      content: data.content,
      channelId: data.channelId,
      serverId: data.serverId
    };
    await this.saveNotification(notification);
  }

  private async handleCallEvent(data: any): Promise<void> {
    const notification: CallNotificationData = {
      type: 'call',
      callId: data.callId,
      callerId: data.callerId,
      recipientId: data.recipientId,
      action: data.action || 'initiated',
      channelId: data.channelId,
      serverId: data.serverId
    };
    await this.saveNotification(notification);
  }

  private async handleChannelEvent(data: any): Promise<void> {
    const notification: ChannelNotificationData = {
      type: 'channel',
      channelId: data.channelId,
      serverId: data.serverId,
      channelName: data.channelName,
      userId: data.userId,
      action: data.action || 'created'
    };
    await this.saveNotification(notification);
  }

  private async saveNotification(notification: NotificationData): Promise<void> {
    // Implementation of saveNotification method
  }
} 