import { Server } from "socket.io";
import { notificationRepository, CreateNotificationInput } from "../repositories/notification.repository";
import { emitToUser } from "../socket";
import { logger } from "../utils/logger";

// ─── Notification Service ──────────────────────────────

export const notificationService = {
  async create(data: CreateNotificationInput) {
    const notification = await notificationRepository.create(data);

    // Emit real-time notification via WebSocket
    try {
      const io = globalThis.__io as Server;
      if (io) {
        emitToUser(io, data.userId, "notification:new", {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          entityType: notification.entityType,
          entityId: notification.entityId,
          actionUrl: notification.actionUrl,
          createdAt: notification.createdAt,
        });

        // Also emit unread count update
        const unreadCount = await notificationRepository.getUnreadCount(
          data.organizationId,
          data.userId
        );
        emitToUser(io, data.userId, "notification:unread-count", { count: unreadCount });
      }
    } catch (error) {
      // WebSocket emission is non-critical
      logger.debug({ error }, "Failed to emit notification via WebSocket");
    }

    return notification;
  },

  async createMany(data: CreateNotificationInput[]) {
    if (data.length === 0) return;

    await notificationRepository.createMany(data);

    // Emit to each user
    for (const item of data) {
      try {
        const io = globalThis.__io as Server;
        if (io) {
          emitToUser(io, item.userId, "notification:new", {
            type: item.type,
            title: item.title,
            message: item.message,
            entityType: item.entityType,
            entityId: item.entityId,
            actionUrl: item.actionUrl,
          });
        }
      } catch {
        // Non-critical
      }
    }
  },

  async getAll(organizationId: string, userId: string, options: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
  }) {
    return notificationRepository.findMany(organizationId, userId, options);
  },

  async getUnreadCount(organizationId: string, userId: string) {
    return notificationRepository.getUnreadCount(organizationId, userId);
  },

  async markAsRead(id: string, userId: string) {
    return notificationRepository.markAsRead(id, userId);
  },

  async markAllAsRead(organizationId: string, userId: string) {
    return notificationRepository.markAllAsRead(organizationId, userId);
  },

  async delete(id: string, userId: string) {
    return notificationRepository.delete(id, userId);
  },

  async deleteAll(organizationId: string, userId: string) {
    return notificationRepository.deleteAll(organizationId, userId);
  },
};

// ─── Global IO Reference ───────────────────────────────

declare global {
  var __io: Server | undefined;
}
