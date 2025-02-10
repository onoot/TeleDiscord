// import { IMessage } from '../models/MessageModel';

// class RedisClient {
//   private isConnected: boolean = false;

//   constructor() {
//     this.isConnected = false;
//     console.log('Redis functionality is temporarily disabled');
//   }

//   async connect(): Promise<void> {
//     console.log('Redis connection is disabled');
//     return Promise.resolve();
//   }

//   async disconnect(): Promise<void> {
//     console.log('Redis disconnection is disabled');
//     return Promise.resolve();
//   }

//   async get(key: string): Promise<string | null> {
//     console.log('Redis get operation is disabled');
//     return null;
//   }

//   async set(key: string, value: string, ttl?: number): Promise<'OK'> {
//     console.log('Redis set operation is disabled');
//     return 'OK';
//   }

//   async del(key: string | string[]): Promise<number> {
//     console.log('Redis del operation is disabled');
//     return 0;
//   }

//   async getMessageCache(messageId: string) {
//     console.log('Redis message cache is disabled');
//     return null;
//   }

//   async setMessageCache(messageId: string, data: any) {
//     console.log('Redis message cache is disabled');
//     return;
//   }

//   async getDialogCache(userId: string) {
//     console.log('Redis dialog cache is disabled');
//     return null;
//   }

//   async setDialogCache(userId: string, data: any) {
//     console.log('Redis dialog cache is disabled');
//     return;
//   }

//   async invalidateMessageCache(messageId: string) {
//     console.log('Redis message cache invalidation is disabled');
//     return;
//   }

//   async invalidateDialogCache(userId: string) {
//     console.log('Redis dialog cache invalidation is disabled');
//     return;
//   }

//   async setMessage(message: IMessage): Promise<void> {
//     console.log('Redis message set is disabled');
//     return;
//   }

//   async getMessage(messageId: string): Promise<IMessage | null> {
//     console.log('Redis message get is disabled');
//     return null;
//   }

//   async setDialogMessages(userId1: string, userId2: string, messages: IMessage[]): Promise<void> {
//     console.log('Redis dialog messages set is disabled');
//     return;
//   }

//   async getDialogMessages(userId1: string, userId2: string): Promise<IMessage[] | null> {
//     console.log('Redis dialog messages get is disabled');
//     return null;
//   }

//   async setUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
//     console.log('Redis user status set is disabled');
//     return;
//   }

//   async getUserStatus(userId: string): Promise<'online' | 'offline' | null> {
//     console.log('Redis user status get is disabled');
//     return null;
//   }
// }

// export const redisClient = new RedisClient(); 