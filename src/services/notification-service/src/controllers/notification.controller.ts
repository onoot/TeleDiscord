import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { NotificationStore } from '../services/notification.store';
import { NotificationType } from '../types/notification.types';

const router = express.Router();

export class NotificationController {
  constructor(private notificationStore: NotificationStore) {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Получение всех уведомлений пользователя
    router.get('/api/v1/notifications', authMiddleware, async (req, res) => {
      try {
        const userId = req.user!.id;
        const lastNotificationId = req.query.lastId as string;
        const notifications = await this.notificationStore.getNotifications(userId, lastNotificationId);
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get notifications' });
      }
    });

    // Polling эндпоинт для получения всех непрочитанных уведомлений
    router.get('/api/v1/notifications/poll', authMiddleware, async (req, res) => {
      try {
        const userId = req.user!.id;
        const notifications = await this.notificationStore.getUnreadNotifications(userId);

        // Группируем уведомления по типу
        const response = {
          calls: notifications.filter(n => n.type === NotificationType.CALL_STARTED),
          messages: notifications.filter(n => n.type === NotificationType.NEW_MESSAGE),
          friendRequests: notifications.filter(n => n.type === NotificationType.FRIEND_REQUEST),
          channelCalls: notifications.filter(n => 
            n.type === NotificationType.CALL_STARTED && 
            'channelId' in n.data
          )
        };

        res.json({
          success: true,
          data: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get unread notifications' });
      }
    });

    // Отметить уведомления как прочитанные
    router.post('/api/v1/notifications/read', authMiddleware, async (req, res) => {
      try {
        const userId = req.user!.id;
        const { notificationIds } = req.body;
        await this.notificationStore.markAsRead(userId, notificationIds);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark notifications as read' });
      }
    });

    // Получение количества непрочитанных уведомлений по типам
    router.get('/api/v1/notifications/unread/count', authMiddleware, async (req, res) => {
      try {
        const userId = req.user!.id;
        const notifications = await this.notificationStore.getUnreadNotifications(userId);
        
        const counts = {
          total: notifications.length,
          calls: notifications.filter(n => n.type === NotificationType.CALL_STARTED).length,
          messages: notifications.filter(n => n.type === NotificationType.NEW_MESSAGE).length,
          friendRequests: notifications.filter(n => n.type === NotificationType.FRIEND_REQUEST).length,
          channelCalls: notifications.filter(n => 
            n.type === NotificationType.CALL_STARTED && 
            'channelId' in n.data
          ).length
        };

        res.json(counts);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get unread notifications count' });
      }
    });

    // Удаление уведомлений
    router.delete('/api/v1/notifications', authMiddleware, async (req, res) => {
      try {
        const userId = req.user!.id;
        const { notificationIds } = req.body;
        await this.notificationStore.deleteNotifications(userId, notificationIds);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete notifications' });
      }
    });
  }

  getRouter() {
    return router;
  }
} 