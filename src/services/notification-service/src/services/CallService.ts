import { DataSource, Repository } from 'typeorm';
import { Call, CallStatus, CallType } from '../models/CallModel';
import { CallRecord, ICallRecord } from '../models/CallRecord';
import { Server as SocketServer } from 'socket.io';
import { KafkaProducer } from '../kafka/producer';
import { v4 as uuidv4 } from 'uuid';

export class CallService {
  private callRepository: Repository<Call>;
  private io: SocketServer;
  private kafkaProducer: KafkaProducer;

  constructor(dataSource: DataSource, io: SocketServer) {
    this.callRepository = dataSource.getRepository(Call);
    this.io = io;
    this.kafkaProducer = new KafkaProducer();
    this.initialize();
  }

  private async initialize() {
    await this.kafkaProducer.connect();
  }

  async initiateCall(callerId: string, receiverId: string, type: CallType, channelId?: string, serverId?: string): Promise<Call> {
    // Создаем запись в PostgreSQL для активного звонка
    const call = this.callRepository.create({
      callerId,
      receiverId,
      type,
      status: CallStatus.INITIATED,
      startTime: new Date(),
      metadata: {
        channelId,
        serverId
      }
    });
    await this.callRepository.save(call);

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
    const call = await this.callRepository.findOne({ where: { id: callId } });
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.CONNECTED;
    call.metadata = {
      ...call.metadata,
      sdpAnswer
    };
    await this.callRepository.save(call);

    // Обновляем запись в MongoDB
    await CallRecord.findOneAndUpdate(
      { callId },
      { 
        status: CallStatus.CONNECTED,
        'metadata.sdpAnswer': sdpAnswer
      }
    );

    await this.kafkaProducer.sendCallNotification(call);

    return call;
  }

  async endCall(callId: string): Promise<Call> {
    const call = await this.callRepository.findOne({ where: { id: callId } });
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.ENDED;
    call.endTime = new Date();
    call.duration = call.endTime.getTime() - call.startTime.getTime();
    await this.callRepository.save(call);

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
    return this.callRepository.findOne({
      where: [
        { callerId: userId, status: CallStatus.CONNECTED },
        { receiverId: userId, status: CallStatus.CONNECTED }
      ]
    });
  }
}
