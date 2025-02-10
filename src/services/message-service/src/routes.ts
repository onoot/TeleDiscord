import { Router } from 'express';
import { Container } from 'typedi';
import { MessageController } from './controllers/v1/MessageController';
import { authMiddleware } from './middleware/auth';

export function setupRoutes(router: Router): Router {
  const messageController = Container.get(MessageController);

  // Применяем middleware аутентификации ко всем маршрутам
  router.use('/api/v1/messages', authMiddleware);

  // Маршруты для личных сообщений
  router.get(
    '/api/v1/messages/dialogs/:userId/messages',
    (req, res, next) => {
      const currentUser = req.user!;
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      messageController.getDialogMessages(userId, page, limit, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/dialogs/:userId/messages',
    (req, res, next) => {
      const currentUser = req.user!;
      const { userId } = req.params;
      messageController.sendDirectMessage(userId, req.body, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  // Маршруты для сообщений в каналах
  router.get(
    '/api/v1/messages/channels/:channelId/messages',
    (req, res, next) => {
      const currentUser = req.user!;
      const { channelId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      messageController.getChannelMessages(channelId, page, limit, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/channels/:channelId/messages',
    (req, res, next) => {
      const currentUser = req.user!;
      const { channelId } = req.params;
      const { serverId } = req.body;
      messageController.sendChannelMessage(channelId, serverId, req.body, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  // Остальные маршруты
  router.post(
    '/api/v1/messages/:messageId/read',
    (req, res, next) => {
      const currentUser = req.user!;
      const { messageId } = req.params;
      messageController.markAsRead(messageId, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/:messageId',
    (req, res, next) => {
      const currentUser = req.user!;
      const { messageId } = req.params;
      messageController.editMessage(messageId, req.body, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/:messageId/delete',
    (req, res, next) => {
      const currentUser = req.user!;
      const { messageId } = req.params;
      messageController.deleteMessage(messageId, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/:messageId/reactions',
    (req, res, next) => {
      const currentUser = req.user!;
      const { messageId } = req.params;
      messageController.addReaction(messageId, req.body, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.post(
    '/api/v1/messages/:messageId/reactions/:emoji/delete',
    (req, res, next) => {
      const currentUser = req.user!;
      const { messageId, emoji } = req.params;
      messageController.removeReaction(messageId, emoji, currentUser)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  router.get(
    '/api/v1/messages/:messageId/reactions',
    (req, res, next) => {
      const { messageId } = req.params;
      messageController.getMessageReactions(messageId)
        .then(result => res.json(result))
        .catch(next);
    }
  );

  return router;
} 