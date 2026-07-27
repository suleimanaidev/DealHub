import { Prisma, AuditLog } from "@prisma/client";
import { prisma } from "../database";

export interface CreateAuditLogInput {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export const auditLogRepository = {
  async create(data: CreateAuditLogInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  },

  async findMany(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      dateFrom?: Date;
      dateTo?: Date;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      userId,
      entityType,
      entityId,
      action,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getUserActivitySummary(organizationId: string, userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalActions, byAction, recentActivity, lastActivity] = await Promise.all([
      prisma.auditLog.count({
        where: { organizationId, userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: true,
        where: { organizationId, userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.findMany({
        where: { organizationId, userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.auditLog.findFirst({
        where: { organizationId, userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalActions,
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      recentActivity,
      lastActivityAt: lastActivity?.createdAt || null,
    };
  },

  async getOrganizationActivitySummary(organizationId: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [last24h, last7d, byAction, activeUsers, recentActivity] = await Promise.all([
      prisma.auditLog.count({
        where: { organizationId, createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.auditLog.count({
        where: { organizationId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: true,
        where: { organizationId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.auditLog.findMany({
        where: { organizationId, createdAt: { gte: sevenDaysAgo } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return {
      last24h,
      last7d,
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      activeUserCount: activeUsers.length,
      recentActivity,
    };
  },
};
