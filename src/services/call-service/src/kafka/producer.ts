import { Kafka, Producer } from 'kafkajs';
import { config } from '../../config';
import { Call, CallStatus } from '../models/CallModel';

export class KafkaProducer {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'call-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka-service:9092']
    });

    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async sendCallNotification(call: Call): Promise<void> {
    try {
      const message = {
        callId: call.id,
        callerId: call.callerId,
        recipientId: call.receiverId,
        type: call.type,
        status: call.status,
        channelId: call.metadata?.channelId || null,
        serverId: call.metadata?.serverId || null,
        action: this.getCallAction(call.status),
        timestamp: new Date().toISOString()
      };

      await this.producer.send({
        topic: 'calls',
        messages: [
          {
            value: JSON.stringify(message)
          }
        ]
      });

      console.log('Call notification sent to Kafka:', message);
    } catch (error) {
      console.error('Error sending call notification to Kafka:', error);
      throw error;
    }
  }

  private getCallAction(status: CallStatus): string {
    switch (status) {
      case CallStatus.INITIATED:
      case CallStatus.RINGING:
        return 'started';
      case CallStatus.ENDED:
      case CallStatus.MISSED:
      case CallStatus.REJECTED:
        return 'ended';
      case CallStatus.CONNECTED:
        return 'connected';
      default:
        return 'unknown';
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }
} 