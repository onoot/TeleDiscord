import { Server, Socket } from 'socket.io';
// import { redisClient } from '../../redis/client';
import { KafkaProducer } from '../../kafka/producer';
import { MessageModel } from '../../models/MessageModel';

export class WebSocketController {
  constructor(private io: Server, private kafkaProducer: KafkaProducer) {
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async handleConnection(socket: Socket) {
    console.log('Client connected:', socket.id);

    socket.on('join', async (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  }

  private async handleMessage(userId: string, rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage);

      switch (message.type) {
        case 'message':
          await this.handleChatMessage(userId, message);
          break;
        case 'typing':
          await this.handleTypingStatus(userId, message);
          break;
        default:
          throw new Error('Unknown message type');
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      throw new Error('Invalid message format');
    }
  }

  private async handleChatMessage(userId: string, message: any) {
    const newMessage = await MessageModel.create({
      senderId: userId,
      receiverId: message.receiverId,
      content: message.content,
      type: message.contentType || 'text',
      status: 'sent'
    });

    // Отправляем сообщение получателю, если он онлайн
    const receiverSocket = this.io.sockets.adapter.rooms.get(message.receiverId);
    if (receiverSocket) {
      receiverSocket.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('new_message', newMessage);
        }
      });
    }

    // Отправляем событие в Kafka
    await this.kafkaProducer.sendMessage('message-sent', {
      messageId: newMessage._id,
      senderId: userId,
      receiverId: message.receiverId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleTypingStatus(userId: string, message: any) {
    const receiverSocket = this.io.sockets.adapter.rooms.get(message.receiverId);
    if (receiverSocket) {
      receiverSocket.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('typing_status', {
            userId,
            isTyping: message.isTyping
          });
        }
      });
    }
  }
} 