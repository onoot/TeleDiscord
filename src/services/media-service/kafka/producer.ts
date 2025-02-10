import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';

export class KafkaProducer {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers
    });

    this.producer = kafka.producer();
  }

  async connect() {
    try {
      await this.producer.connect();
      console.log('Successfully connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      console.log('Successfully disconnected from Kafka');
    } catch (error) {
      console.error('Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async sendMessage(message: any) {
    try {
      await this.producer.send({
        topic: config.kafka.topic,
        messages: [{ value: JSON.stringify(message) }]
      });
    } catch (error) {
      console.error('Failed to send message to Kafka:', error);
      throw error;
    }
  }
}

export const producer = new KafkaProducer(); 