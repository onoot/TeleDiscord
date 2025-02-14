import { Kafka, Producer } from 'kafkajs';
import { Call } from '../models/CallModel';
import { logger } from '../utils/logger';

export class KafkaProducer {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      logger.info('Successfully connected to Kafka producer');
    } catch (error) {
      logger.error('Failed to connect to Kafka producer:', error);
      throw error;
    }
  }
// не
  async sendCallNotification(call: Call): Promise<void> {
    try {
      await this.producer.send({
        topic: 'calls',
        messages: [
          {
            key: call.id,
            value: JSON.stringify({
              callId: call.id,
              callerId: call.callerId,
              recipientId: call.receiverId,
              type: call.type,
              status: call.status,
              startTime: call.startTime,
              endTime: call.endTime,
              duration: call.duration,
              metadata: call.metadata
            })
          }
        ]
      });
      logger.info(`Call notification sent for call ${call.id}`);
    } catch (error) {
      logger.error('Failed to send call notification:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      logger.info('Successfully disconnected from Kafka producer');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka producer:', error);
      throw error;
    }
  }
}

export const producer = new KafkaProducer(); 