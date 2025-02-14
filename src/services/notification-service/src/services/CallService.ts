import { DataSource, Repository } from 'typeorm';
import { Call, CallStatus, CallType } from '../models/CallModel';
import { CallRecord, ICallRecord } from '../models/CallRecord';
import { Server as SocketServer } from 'socket.io';
import { KafkaProducer } from '../kafka/producer';
import { v4 as uuidv4 } from 'uuid';

export class CallService {
  private calls: Call[] = [];
  private io: SocketServer;
  private kafkaProducer: KafkaProducer;

  constructor(io: SocketServer) {
    this.io = io;
    this.kafkaProducer = new KafkaProducer();
    this.initialize();
  }

  private async initialize() {
    await this.kafkaProducer.connect();
  }

  async initiateCall(callerId: string, receiverId: string, type: CallType, channelId?: string, serverId?: string): Promise<Call> {
    const call: Call = {
      id: uuidv4(),
      callerId,
      receiverId,
      type,
      status: CallStatus.INITIATED,
      startTime: new Date(),
      metadata: {
        channelId,
        serverId
      }
    };
    
    this.calls.push(call);

    // Создаем запись в MongoDB для истории
    await CallRecord.create({
      callId: call.id,
      callerId,
      recipientId: receiverId,
      type,
      status: CallStatus.INITIATED,
      startTime: new Date(),
      metadata: {
        channelId,
        serverId
      }
    });

    // Отправляем уведомление через Kafka
    await this.kafkaProducer.sendCallNotification(call);

    return call;
  }

  async acceptCall(callId: string, sdpAnswer: string): Promise<Call> {
    const call = this.calls.find(c => c.id === callId);
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.ACCEPTED;
    call.metadata = {
      ...call.metadata,
      sdpAnswer
    };

    // Обновляем запись в MongoDB
    await CallRecord.findOneAndUpdate(
      { callId },
      { 
        status: CallStatus.ACCEPTED,
        'metadata.sdpAnswer': sdpAnswer
      }
    );

    await this.kafkaProducer.sendCallNotification(call);

    return call;
  }

  async endCall(callId: string): Promise<Call> {
    const call = this.calls.find(c => c.id === callId);
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.ENDED;
    call.endTime = new Date();
    call.duration = call.endTime.getTime() - call.startTime.getTime();

    // Удаляем звонок из активных
    this.calls = this.calls.filter(c => c.id !== callId);

    // Обновляем запись в MongoDB
    await CallRecord.findOneAndUpdate(
      { callId },
      { 
        status: CallStatus.ENDED,
        endTime: call.endTime,
        duration: call.duration
      }
    );

    await this.kafkaProducer.sendCallNotification(call);

    return call;
  }

  async getCallHistory(userId: string): Promise<ICallRecord[]> {
    return CallRecord.find({
      $or: [
        { callerId: userId },
        { recipientId: userId }
      ]
    })
    .sort({ startTime: -1 })
    .limit(50);
  }

  async getActiveCall(userId: string): Promise<Call | null> {
    return this.calls.find(
      call => (call.callerId === userId || call.receiverId === userId) && 
              call.status === CallStatus.ACCEPTED
    ) || null;
  }
}
