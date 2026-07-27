import { prisma } from "../database";
import { Prisma, Notification } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ─── Notification Repository ───────────────────────────

export const notificationRepository = {
  async create(data: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        actionUrl: data.actionUrl || null,
        metadata: data.metadata || undefined,
      },
    });
  },

  async createMany(
    data: CreateNotificationInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.notification.createMany({
      data: data.map((n) => ({
        organizationId: n.organizationId,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType || null,
        entityId: n.entityId || null,
        actionUrl: n.actionUrl || null,
        metadata: n.metadata || undefined,
      })),
    });
  },

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  },

  async findMany(
    organizationId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      type?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, isRead, type } = options;

    const where: Prisma.NotificationWhereInput = {
      organizationId,
      userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        organizationId,
        userId,
        isRead: false,
      },
    });
  },

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    }).then(() => prisma.notification.findUnique({ where: { id } }));
  },

  async markAllAsRead(organizationId: string, userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({
      where: {
        organizationId,
        userId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async delete(id: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id, userId },
    });
  },

  async deleteAll(organizationId: string, userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.deleteMany({
      where: { organizationId, userId },
    });
  },
};
