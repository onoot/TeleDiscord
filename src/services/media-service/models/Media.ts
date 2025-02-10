import { Schema, model, Document } from 'mongoose';

export interface IMedia extends Document {
  userId: string;
  type: 'image' | 'video' | 'document';
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    codec?: string;
    bitrate?: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['image', 'video', 'document'] },
  url: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  metadata: {
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
    codec: { type: String },
    bitrate: { type: Number }
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

MediaSchema.index({ userId: 1, type: 1 });
MediaSchema.index({ filename: 'text' });

export const Media = model<IMedia>('Media', MediaSchema); 