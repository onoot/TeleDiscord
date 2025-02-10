import { Kafka, Producer, Message } from 'kafkajs';
import { config } from '../../config';

export class KafkaProducer {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      ...(config.kafka.sasl?.username && config.kafka.sasl?.password && {
        sasl: {
          mechanism: 'plain',
          username: config.kafka.sasl.username,
          password: config.kafka.sasl.password
        }
      })
    });

    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async send(message: { topic: string; messages: { value: string }[] }): Promise<void> {
    try {
      await this.producer.send(message);
    } catch (error) {
      console.error('Failed to send message to Kafka:', error);
      throw error;
    }
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{
          value: JSON.stringify(message)
        }]
      });
    } catch (error) {
      console.error('Failed to send message to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }
}

export const producer = new KafkaProducer(); 