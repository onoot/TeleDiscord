export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum CallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ENDED = 'ended',
  MISSED = 'missed',
  ERROR = 'error'
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
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
}

// Экспортируем только перечисления как значения
export const CallEnums = {
  CallType,
  CallStatus
};
