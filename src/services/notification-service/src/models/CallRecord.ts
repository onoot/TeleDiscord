import { Schema, model, Document } from 'mongoose';
import { CallType, CallStatus } from './CallModel';

export interface ICallRecord extends Document {
  callId: string;
  callerId: string;
  recipientId: string;
  type: CallType;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metadata: {
    channelId?: string;
    serverId?: string;
    iceServers?: string[];
    sdpOffer?: string;
    sdpAnswer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CallRecordSchema = new Schema({
  callId: { type: String, required: true, unique: true },
  callerId: { type: String, required: true },
  recipientId: { type: String, required: true },
  type: { 
    type: String, 
    enum: Object.values(CallType),
    required: true 
  },
  status: { 
    type: String, 
    enum: Object.values(CallStatus),
    required: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number },
  metadata: {
    channelId: String,
    serverId: String,
    iceServers: [String],
    sdpOffer: String,
    sdpAnswer: String
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
CallRecordSchema.index({ callerId: 1, startTime: -1 });
CallRecordSchema.index({ recipientId: 1, startTime: -1 });
CallRecordSchema.index({ status: 1 });

export const CallRecord = model<ICallRecord>('CallRecord', CallRecordSchema);
