import { Schema, model, Document } from 'mongoose';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

export interface Message extends Document {
  senderId: string;
  recipientId: string;
  content: string;
  attachments?: string[];
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  senderId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
MessageSchema.index({ senderId: 1, recipientId: 1 });
MessageSchema.index({ recipientId: 1, status: 1 });
MessageSchema.index({ createdAt: -1 });

export const MessageModel = model<Message>('Message', MessageSchema); 