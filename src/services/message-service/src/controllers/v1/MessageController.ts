import { Request, Response, NextFunction } from 'express';
import { Service } from 'typedi';
import { MessageService } from '../../services/MessageService';
import { SendMessageRequest, EditMessageRequest, AddReactionRequest } from '../../models/MessageModel';
import { JsonController, Post, Get, Body, Param, UseBefore, CurrentUser, HttpError, QueryParam } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';

@JsonController('/api/v1/messages')
@Service()
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('/dialogs/:userId/messages')
  @UseBefore(authMiddleware)
  async getDialogMessages(
    @Param('userId') partnerId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 50,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.getDialogMessages(currentUser.id, partnerId, page, limit);
  }

  @Post('/dialogs/:userId/messages')
  @UseBefore(authMiddleware)
  async sendDirectMessage(
    @Param('userId') recipientId: string,
    @Body() messageData: SendMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.sendDirectMessage(currentUser.id, recipientId, messageData);
  }

  @Get('/channels/:channelId/messages')
  @UseBefore(authMiddleware)
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 50,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.getChannelMessages(channelId, page, limit);
  }

  @Post('/channels/:channelId/messages')
  @UseBefore(authMiddleware)
  async sendChannelMessage(
    @Param('channelId') channelId: string,
    @Param('serverId') serverId: string,
    @Body() messageData: SendMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.sendChannelMessage(currentUser.id, channelId, serverId, messageData);
  }

  @Get('/unread')
  @UseBefore(authMiddleware)
  async getUnreadMessages(@CurrentUser() currentUser: { id: string }) {
    return this.messageService.getUnreadMessages(currentUser.id);
  }

  @Post('/:messageId/read')
  @UseBefore(authMiddleware)
  async markAsRead(
    @Param('messageId') messageId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.markAsRead(currentUser.id, messageId);
    return { success: true };
  }

  @Post('/dialogs/:userId/read')
  @UseBefore(authMiddleware)
  async markDialogAsRead(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.markDialogAsRead(currentUser.id, userId);
    return { success: true };
  }

  @Post('/:messageId')
  @UseBefore(authMiddleware)
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() messageData: EditMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.editMessage(currentUser.id, messageId, messageData);
  }

  @Post('/:messageId/delete')
  @UseBefore(authMiddleware)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.deleteMessage(currentUser.id, messageId);
    return { success: true };
  }

  @Post('/:messageId/reactions')
  @UseBefore(authMiddleware)
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() reactionData: AddReactionRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.addReaction(currentUser.id, messageId, reactionData);
  }

  @Post('/:messageId/reactions/:emoji/delete')
  @UseBefore(authMiddleware)
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.removeReaction(currentUser.id, messageId, emoji);
  }

  @Get('/:messageId/reactions')
  @UseBefore(authMiddleware)
  async getMessageReactions(@Param('messageId') messageId: string) {
    return this.messageService.getMessageReactions(messageId);
  }
} 