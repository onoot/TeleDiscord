import { Schema, model, Document } from 'mongoose';

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export enum MessageType {
  DIRECT = 'direct',
  CHANNEL = 'channel'
}

export interface IReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  _id: string;
  type: MessageType;
  senderId: string;
  channelId?: string;
  serverId?: string;
  recipientId?: string;
  content: string;
  attachments?: string[];
  status: MessageStatus;
  reactions: IReaction[];
  replyToId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

export interface SendMessageRequest {
  content: string;
  attachments?: string[];
  replyToId?: string | null;
}

export interface EditMessageRequest {
  content: string;
  attachments?: string[];
}

export interface AddReactionRequest {
  emoji: string;
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId: {
      type: String,
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    channelId: {
      type: String,
      sparse: true,
      index: true
    },
    serverId: {
      type: String,
      sparse: true,
      index: true
    },
    recipientId: {
      type: String,
      sparse: true,
      index: true
    },
    content: {
      type: String,
      required: true
    },
    attachments: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
      required: true
    },
    reactions: {
      type: [ReactionSchema],
      default: []
    },
    replyToId: {
      type: String,
      sparse: true,
      index: true,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Индексы для быстрого поиска
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ serverId: 1, channelId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, status: 1 });

export const MessageModel = model<IMessage>('Message', MessageSchema); 