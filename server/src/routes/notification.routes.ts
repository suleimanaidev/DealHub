import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateParams, validateQuery } from "../middleware/validate";
import { notificationLimiter } from "../middleware/rateLimiter";
import { z } from "zod";

const router = Router();

// ─── Param Schemas ─────────────────────────────────────

const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});

const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z.enum(["true", "false"]).optional(),
    type: z.string().optional(),
  }),
});

// ─── All routes require authentication ─────────────────

router.use(authenticate);

/**
 * GET /api/v1/notifications
 *
 * List all notifications for the current user.
 */
router.get(
  "/",
  validateQuery(listNotificationsSchema),
  notificationController.list
);

/**
 * GET /api/v1/notifications/unread-count
 *
 * Get the count of unread notifications.
 */
router.get(
  "/unread-count",
  notificationController.getUnreadCount
);

/**
 * PATCH /api/v1/notifications/read-all
 *
 * Mark all notifications as read.
 */
router.patch(
  "/read-all",
  notificationController.markAllAsRead
);

/**
 * DELETE /api/v1/notifications/all
 *
 * Delete all notifications for the current user.
 */
router.delete(
  "/all",
  notificationController.deleteAll
);

/**
 * PATCH /api/v1/notifications/:notificationId/read
 *
 * Mark a specific notification as read.
 */
router.patch(
  "/:notificationId/read",
  validateParams(notificationIdParamSchema),
  notificationController.markAsRead
);

/**
 * DELETE /api/v1/notifications/:notificationId
 *
 * Delete a specific notification.
 */
router.delete(
  "/:notificationId",
  validateParams(notificationIdParamSchema),
  notificationController.delete
);

export default router;
