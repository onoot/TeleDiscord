import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  sender: string;
  chat: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  content: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true }
}, {
  timestamps: true
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 