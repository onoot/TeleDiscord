import mongoose, { Document, Schema, Types } from 'mongoose';

interface IReaction {
  userId: Types.ObjectId;
  type: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  channelId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: 'text' | 'media' | 'system';
  content: string;
  mediaId?: Types.ObjectId;
  replyTo?: Types.ObjectId;
  edited: boolean;
  reactions: IReaction[];
  mentions: Types.ObjectId[];
  readBy: Types.ObjectId[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'media', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  mediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  edited: {
    type: Boolean,
    default: false,
  },
  reactions: [ReactionSchema],
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  deletedAt: {
    type: Date,
  },
}, { timestamps: true });

// Индексы
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ mentions: 1 });
MessageSchema.index({ content: 'text' });

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 