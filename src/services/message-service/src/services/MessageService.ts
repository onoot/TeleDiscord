import { Service } from 'typedi';
import { MessageModel, IMessage, MessageStatus, MessageType, SendMessageRequest, EditMessageRequest, AddReactionRequest } from '../models/MessageModel';
import { KafkaProducer } from '../kafka/producer';

@Service()
export class MessageService {
  constructor(private kafkaProducer: KafkaProducer) {}

  async getDialogMessages(currentUserId: string, partnerId: string, page: number = 1, limit: number = 50): Promise<{
    messages: IMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const query = {
      type: MessageType.DIRECT,
      $or: [
        { senderId: currentUserId, recipientId: partnerId },
        { senderId: partnerId, recipientId: currentUserId }
      ],
      isDeleted: false
    };

    const [messages, total] = await Promise.all([
      MessageModel.find(query)
        .select({
          _id: 1,
          type: 1,
          senderId: 1,
          recipientId: 1,
          content: 1,
          attachments: 1,
          status: 1,
          reactions: 1,
          replyToId: 1,
          createdAt: 1,
          updatedAt: 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(query)
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + messages.length < total
      }
    };
  }

  async getChannelMessages(channelId: string, page: number = 1, limit: number = 50): Promise<{
    messages: IMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const query = {
      type: MessageType.CHANNEL,
      channelId,
      isDeleted: false
    };

    const [messages, total] = await Promise.all([
      MessageModel.find(query)
        .select({
          _id: 1,
          type: 1,
          senderId: 1,
          channelId: 1,
          serverId: 1,
          content: 1,
          attachments: 1,
          status: 1,
          reactions: 1,
          replyToId: 1,
          createdAt: 1,
          updatedAt: 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(query)
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + messages.length < total
      }
    };
  }

  async getUnreadMessages(userId: string): Promise<IMessage[]> {
    return MessageModel.find({
      recipientId: userId,
      status: { $ne: MessageStatus.READ },
      isDeleted: false
    }).sort({ createdAt: -1 });
  }

  async sendDirectMessage(senderId: string, recipientId: string, messageData: SendMessageRequest): Promise<IMessage> {
    const message = new MessageModel({
      type: MessageType.DIRECT,
      senderId,
      recipientId,
      content: messageData.content,
      attachments: messageData.attachments,
      status: MessageStatus.SENT,
      replyToId: messageData.replyToId || null
    });

    await message.save();

    await this.kafkaProducer.send('notifications', {
      type: 'new_direct_message',
      messageId: message._id,
      senderId,
      recipientId,
      content: message.content,
      replyToId: message.replyToId
    });

    return message;
  }

  async sendChannelMessage(senderId: string, channelId: string, serverId: string, messageData: SendMessageRequest): Promise<IMessage> {
    const message = new MessageModel({
      type: MessageType.CHANNEL,
      senderId,
      channelId,
      serverId,
      content: messageData.content,
      attachments: messageData.attachments,
      status: MessageStatus.SENT,
      replyToId: messageData.replyToId || null
    });

    await message.save();

    await this.kafkaProducer.send('notifications', {
      type: 'new_channel_message',
      messageId: message._id,
      senderId,
      channelId,
      serverId,
      content: message.content,
      replyToId: message.replyToId
    });

    return message;
  }

  async markAsRead(userId: string, messageId: string): Promise<void> {
    const message = await MessageModel.findOneAndUpdate(
      {
        _id: messageId,
        recipientId: userId,
        status: { $ne: MessageStatus.READ }
      },
      { status: MessageStatus.READ },
      { new: true }
    );

    if (!message) {
      throw new Error('Message not found or already read');
    }
  }

  async markDialogAsRead(userId: string, partnerId: string): Promise<void> {
    await MessageModel.updateMany(
      {
        senderId: partnerId,
        recipientId: userId,
        status: { $ne: MessageStatus.READ }
      },
      { status: MessageStatus.READ }
    );
  }

  async editMessage(userId: string, messageId: string, messageData: EditMessageRequest): Promise<IMessage> {
    const message = await MessageModel.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false
    });

    if (!message) {
      throw new Error('Message not found');
    }

    message.content = messageData.content;
    if (messageData.attachments) {
      message.attachments = messageData.attachments;
    }

    await message.save();
    return message;
  }

  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await MessageModel.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false
    });

    if (!message) {
      throw new Error('Message not found');
    }

    message.isDeleted = true;
    await message.save();
  }

  async clearDialog(userId: string, partnerId: string): Promise<void> {
    await MessageModel.updateMany(
      {
        $or: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId }
        ]
      },
      { isDeleted: true }
    );
  }

  async addReaction(userId: string, messageId: string, reactionData: AddReactionRequest): Promise<IMessage> {
    const message = await MessageModel.findOne({
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const existingReaction = message.reactions.find(
      reaction => reaction.userId === userId && reaction.emoji === reactionData.emoji
    );

    if (existingReaction) {
      throw new Error('Reaction already exists');
    }

    message.reactions.push({
      userId,
      emoji: reactionData.emoji,
      createdAt: new Date()
    });

    await message.save();
    return message;
  }

  async removeReaction(userId: string, messageId: string, emoji: string): Promise<IMessage> {
    const message = await MessageModel.findOne({
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const reactionIndex = message.reactions.findIndex(
      reaction => reaction.userId === userId && reaction.emoji === emoji
    );

    if (reactionIndex === -1) {
      throw new Error('Reaction not found');
    }

    message.reactions.splice(reactionIndex, 1);
    await message.save();
    return message;
  }

  async getMessageReactions(messageId: string): Promise<IMessage['reactions']> {
    const message = await MessageModel.findOne({
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return message.reactions;
  }

  async getReplyToMessage(messageId: string): Promise<IMessage | null> {
    const message = await MessageModel.findOne({
      _id: messageId,
      isDeleted: false
    }).select({
      _id: 1,
      type: 1,
      senderId: 1,
      channelId: 1,
      serverId: 1,
      recipientId: 1,
      content: 1,
      attachments: 1,
      status: 1,
      createdAt: 1
    });

    return message;
  }
} 