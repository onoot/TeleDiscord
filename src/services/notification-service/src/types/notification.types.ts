export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  CALL_STARTED = 'CALL_STARTED',
  CALL_ENDED = 'CALL_ENDED',
  CHANNEL_CREATED = 'CHANNEL_CREATED',
  FRIEND_REQUEST = 'FRIEND_REQUEST'
}

export interface BaseNotificationData {
  channelId?: string;
  serverId?: string;
}

export interface MessageNotificationData extends BaseNotificationData {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  channelId?: string;
  serverId?: string;
}

export interface CallNotificationData extends BaseNotificationData {
  callId: string;
  callerId: string;
  recipientId: string;
  action: 'started' | 'ended';
}

export interface ChannelNotificationData extends BaseNotificationData {
  channelName: string;
  userId: string;
}

export interface FriendRequestNotificationData {
  requestId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
}

export type NotificationData = 
  | MessageNotificationData 
  | CallNotificationData 
  | ChannelNotificationData
  | FriendRequestNotificationData;

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  createdAt: Date;
  isRead: boolean;
  data: NotificationData;
} 