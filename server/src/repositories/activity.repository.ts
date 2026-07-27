import { Prisma, Activity } from "@prisma/client";
import { prisma } from "../database";

export interface CreateActivityInput {
  organizationId: string;
  type: "task" | "meeting" | "call";
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  dueDate?: Date;
  completedAt?: Date;
  // Task-specific
  taskType?: string;
  // Meeting-specific
  meetingDate?: Date;
  durationMinutes?: number;
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  attendees?: string[];
  // Call-specific
  callDate?: Date;
  callDuration?: number;
  callOutcome?: string;
  callNotes?: string;
}

export interface UpdateActivityInput {
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  dueDate?: Date;
  completedAt?: Date;
  // Task-specific
  taskType?: string;
  // Meeting-specific
  meetingDate?: Date;
  durationMinutes?: number;
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  attendees?: string[];
  // Call-specific
  callDate?: Date;
  callDuration?: number;
  callOutcome?: string;
  callNotes?: string;
}

export const activityRepository = {
  async create(data: CreateActivityInput): Promise<Activity> {
    const { type, ...activityData } = data;

    return prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: activityData,
      });

      if (type === "task") {
        await tx.task.create({
          data: {
            activityId: activity.id,
            taskType: data.taskType || "other",
          },
        });
      } else if (type === "meeting") {
        await tx.meeting.create({
          data: {
            activityId: activity.id,
            meetingDate: data.meetingDate || new Date(),
            durationMinutes: data.durationMinutes || 30,
            location: data.location,
            isVirtual: data.isVirtual || false,
            meetingUrl: data.meetingUrl,
            attendees: data.attendees || [],
          },
        });
      } else if (type === "call") {
        await tx.call.create({
          data: {
            activityId: activity.id,
            callDate: data.callDate || new Date(),
            callDuration: data.callDuration,
            callOutcome: data.callOutcome,
            callNotes: data.callNotes,
          },
        });
      }

      return activity;
    });
  },

  async findById(id: string) {
    return prisma.activity.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true, amount: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        task: true,
        meeting: true,
        call: true,
      },
    });
  },

  async findMany(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      priority?: string;
      assignedToId?: string;
      leadId?: string;
      customerId?: string;
      dealId?: string;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      dateFrom?: Date;
      dateTo?: Date;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      type,
      status,
      priority,
      assignedToId,
      leadId,
      customerId,
      dealId,
      dueDateFrom,
      dueDateTo,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.ActivityWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (leadId) where.leadId = leadId;
    if (customerId) where.customerId = customerId;
    if (dealId) where.dealId = dealId;

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = dueDateFrom;
      if (dueDateTo) where.dueDate.lte = dueDateTo;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const orderBy: Prisma.ActivityOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          task: true,
          meeting: true,
          call: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      items: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async update(id: string, data: UpdateActivityInput): Promise<Activity> {
    const { taskType, meetingDate, durationMinutes, location, isVirtual, meetingUrl, attendees, callDate, callDuration, callOutcome, callNotes, ...activityData } = data;

    return prisma.$transaction(async (tx) => {
      const activity = await tx.activity.update({
        where: { id },
        data: { ...activityData, updatedAt: new Date() },
      });

      const existingTask = await tx.task.findUnique({ where: { activityId: id } });
      const existingMeeting = await tx.meeting.findUnique({ where: { activityId: id } });
      const existingCall = await tx.call.findUnique({ where: { activityId: id } });

      if (existingTask && taskType) {
        await tx.task.update({
          where: { activityId: id },
          data: { taskType },
        });
      }

      if (existingMeeting) {
        const meetingUpdate: Prisma.MeetingUpdateInput = {};
        if (meetingDate) meetingUpdate.meetingDate = meetingDate;
        if (durationMinutes) meetingUpdate.durationMinutes = durationMinutes;
        if (location !== undefined) meetingUpdate.location = location;
        if (isVirtual !== undefined) meetingUpdate.isVirtual = isVirtual;
        if (meetingUrl !== undefined) meetingUpdate.meetingUrl = meetingUrl;
        if (attendees) meetingUpdate.attendees = attendees;

        if (Object.keys(meetingUpdate).length > 0) {
          await tx.meeting.update({
            where: { activityId: id },
            data: meetingUpdate,
          });
        }
      }

      if (existingCall) {
        const callUpdate: Prisma.CallUpdateInput = {};
        if (callDate) callUpdate.callDate = callDate;
        if (callDuration !== undefined) callUpdate.callDuration = callDuration;
        if (callOutcome !== undefined) callUpdate.callOutcome = callOutcome;
        if (callNotes !== undefined) callUpdate.callNotes = callNotes;

        if (Object.keys(callUpdate).length > 0) {
          await tx.call.update({
            where: { activityId: id },
            data: callUpdate,
          });
        }
      }

      return activity;
    });
  },

  async complete(id: string): Promise<Activity> {
    return prisma.activity.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.ActivityWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalActivities, completedActivities, overdueActivities, byType, byStatus, byPriority] =
      await Promise.all([
        prisma.activity.count({ where }),
        prisma.activity.count({ where: { ...where, status: "completed" } }),
        prisma.activity.count({
          where: {
            ...where,
            status: { in: ["pending", "in_progress"] },
            dueDate: { lt: new Date() },
          },
        }),
        prisma.activity.groupBy({
          by: ["type"],
          _count: true,
          where,
        }),
        prisma.activity.groupBy({
          by: ["status"],
          _count: true,
          where,
        }),
        prisma.activity.groupBy({
          by: ["priority"],
          _count: true,
          where,
        }),
      ]);

    return {
      totalActivities,
      completedActivities,
      overdueActivities,
      completionRate: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    };
  },

  async getUpcoming(organizationId: string, userId: string, limit: number = 10) {
    const now = new Date();

    return prisma.activity.findMany({
      where: {
        organizationId,
        assignedToId: userId,
        status: { in: ["pending", "in_progress"] },
        dueDate: { gte: now },
        deletedAt: null,
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  },

  async getOverdue(organizationId: string, userId?: string, limit: number = 10) {
    const where: Prisma.ActivityWhereInput = {
      organizationId,
      status: { in: ["pending", "in_progress"] },
      dueDate: { lt: new Date() },
      deletedAt: null,
    };

    if (userId) {
      where.assignedToId = userId;
    }

    return prisma.activity.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  },
};
