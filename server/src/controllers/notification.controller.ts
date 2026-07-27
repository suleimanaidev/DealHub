import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { sendOk, sendCreated, sendNoContent, sendNotFound } from "../utils/response";
import { logger } from "../utils/logger";

export const notificationController = {
  async list(req: Request, res: Response) {
    const { organizationId } = req.user!;
    const userId = req.user!.id;
    const { page, limit, isRead, type } = req.query;

    const result = await notificationService.getAll(organizationId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      isRead: isRead !== undefined ? isRead === "true" : undefined,
      type: type as string | undefined,
    });

    sendOk(res, {
      notifications: result.notifications,
      pagination: result.pagination,
    }, "Notifications retrieved");
  },

  async getUnreadCount(req: Request, res: Response) {
    const { organizationId } = req.user!;
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(organizationId, userId);
    sendOk(res, { count }, "Unread count retrieved");
  },

  async markAsRead(req: Request, res: Response) {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);
    if (!notification) {
      sendNotFound(res, "Notification");
      return;
    }

    sendOk(res, notification, "Notification marked as read");
  },

  async markAllAsRead(req: Request, res: Response) {
    const { organizationId } = req.user!;
    const userId = req.user!.id;

    await notificationService.markAllAsRead(organizationId, userId);
    sendOk(res, { success: true }, "All notifications marked as read");
  },

  async delete(req: Request, res: Response) {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    await notificationService.delete(notificationId, userId);
    sendNoContent(res);
  },

  async deleteAll(req: Request, res: Response) {
    const { organizationId } = req.user!;
    const userId = req.user!.id;

    await notificationService.deleteAll(organizationId, userId);
    sendNoContent(res);
  },
};
