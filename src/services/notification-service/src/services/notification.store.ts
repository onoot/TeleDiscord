import { Notification } from '../types/notification.types';
import { logger } from '../utils/logger';

export class NotificationStore {
  private notifications: Map<string, Notification[]> = new Map();

  async addNotification(notification: Notification): Promise<void> {
    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.push(notification);
    this.notifications.set(notification.userId, userNotifications);
    logger.info(`Added notification for user ${notification.userId}:`, notification);
  }

  async getNotifications(userId: string, lastNotificationId?: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    
    if (!lastNotificationId) {
      return userNotifications.slice(-50); // Возвращаем последние 50 уведомлений
    }

    const lastIndex = userNotifications.findIndex(n => n.id === lastNotificationId);
    if (lastIndex === -1) {
      return [];
    }

    return userNotifications.slice(lastIndex + 1);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(notification => !notification.isRead);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) {
      logger.warn(`No notifications found for user ${userId}`);
      return;
    }

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) {
      logger.warn(`Notification ${notificationId} not found for user ${userId}`);
      return;
    }

    notification.isRead = true;
    logger.info(`Marked notification ${notificationId} as read for user ${userId}`);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) {
      logger.warn(`No notifications found for user ${userId}`);
      return;
    }

    userNotifications.forEach(notification => {
      notification.isRead = true;
    });

    logger.info(`Marked all notifications as read for user ${userId}`);
  }

  async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return;

    const filteredNotifications = userNotifications.filter(
      notification => !notificationIds.includes(notification.id)
    );

    this.notifications.set(userId, filteredNotifications);
    logger.info(`Deleted notifications for user ${userId}:`, notificationIds);
  }
} 