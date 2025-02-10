import Redis from 'ioredis';
import { config } from '../../config';

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Временно отключаем инициализацию Redis
    /*
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('Successfully connected to Redis');
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    */
  }

  async connect(): Promise<void> {
    console.log('Redis connection disabled');
    return;
  }

  async get(key: string): Promise<string | null> {
    console.log('Redis operations disabled');
    return null;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    console.log('Redis operations disabled');
    return 'OK';
  }

  async del(key: string): Promise<number> {
    console.log('Redis operations disabled');
    return 0;
  }

  async disconnect(): Promise<void> {
    console.log('Redis connection disabled');
    return;
  }
}

export const redisClient = new RedisClient(); 