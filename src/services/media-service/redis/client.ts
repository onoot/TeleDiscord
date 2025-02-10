import { createClient } from 'redis';
import { config } from '../config';

class RedisClient {
  private client;

  constructor() {
    this.client = createClient({
      url: `redis://${config.redis.password ? config.redis.password + '@' : ''}${config.redis.host}:${config.redis.port}`
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Successfully connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.disconnect();
      console.log('Successfully disconnected from Redis');
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  async set(key: string, value: string, expireInSeconds?: number) {
    try {
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Failed to set value in Redis:', error);
      throw error;
    }
  }

  async get(key: string) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Failed to get value from Redis:', error);
      throw error;
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Failed to delete value from Redis:', error);
      throw error;
    }
  }
}

export const redisClient = new RedisClient(); 