import { DataSource, Repository } from 'typeorm';
import { Call, CallStatus, CallType } from '../models/CallModel';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { callsTotal, activeCallsGauge, callDurationHistogram } from '../metrics';
import { KafkaProducer } from '../kafka/producer';

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
    const call = this.callRepository.create({
      callerId,
      receiverId,
      type,
      status: CallStatus.INITIATED,
      metadata: {
        channelId,
        serverId
      }
    });

    await this.callRepository.save(call);
    
    // Отправляем уведомление в Kafka
    await this.kafkaProducer.sendCallNotification(call);

    // Уведомляем получателя через WebSocket
    this.io.to(receiverId).emit('incomingCall', {
      callId: call.id,
      callerId,
      type
    });

    return call;
  }

  async acceptCall(callId: string, sdpAnswer: string): Promise<Call> {
    const call = await this.callRepository.findOneBy({ id: callId });
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.CONNECTED;
    call.startTime = new Date();
    call.metadata = {
      ...call.metadata,
      sdpAnswer
    };

    await this.callRepository.save(call);
    
    // Отправляем уведомление в Kafka
    await this.kafkaProducer.sendCallNotification(call);

    // Уведомляем участников через WebSocket
    this.io.to(call.callerId).emit('callAccepted', {
      callId: call.id,
      sdpAnswer
    });

    return call;
  }

  async rejectCall(callId: string): Promise<Call> {
    const call = await this.callRepository.findOneBy({ id: callId });
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.REJECTED;
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
    }

    await this.callRepository.save(call);
    
    // Отправляем уведомление в Kafka
    await this.kafkaProducer.sendCallNotification(call);

    // Уведомляем участников через WebSocket
    this.io.to(call.callerId).emit('callRejected', {
      callId: call.id
    });

    return call;
  }

  async endCall(callId: string): Promise<Call> {
    const call = await this.callRepository.findOneBy({ id: callId });
    if (!call) {
      throw new Error('Call not found');
    }

    call.status = CallStatus.ENDED;
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
    }

    await this.callRepository.save(call);
    
    // Отправляем уведомление в Kafka
    await this.kafkaProducer.sendCallNotification(call);

    // Уведомляем участников через WebSocket
    this.io.to(call.callerId).emit('callEnded', { callId: call.id });
    this.io.to(call.receiverId).emit('callEnded', { callId: call.id });

    return call;
  }

  async updateIceCandidates(callId: string, candidates: string[]): Promise<Call> {
    const call = await this.callRepository.findOne({ where: { id: callId } });
    if (!call) {
      throw new Error('Call not found');
    }

    call.metadata = {
      ...call.metadata,
      iceCandidates: candidates
    };

    await this.callRepository.save(call);

    return call;
  }

  async getCallHistory(userId: string): Promise<Call[]> {
    return this.callRepository.find({
      where: [
        { callerId: userId },
        { receiverId: userId }
      ],
      order: {
        createdAt: 'DESC'
      }
    });
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