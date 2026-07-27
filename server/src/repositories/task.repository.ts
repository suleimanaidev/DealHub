import { Prisma, Task, Activity } from "@prisma/client";
import { prisma } from "../database";

export interface CreateTaskInput {
  organizationId: string;
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  assignedToId?: string;
  createdBy: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  taskType?: string;
  reminderAt?: Date;
  recurrenceRule?: string;
}

export interface UpdateTaskInput {
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  assignedToId?: string | null;
  leadId?: string | null;
  customerId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  taskType?: string;
  reminderAt?: Date | null;
  recurrenceRule?: string | null;
}

export interface TaskWithActivity extends Task {
  activity: Activity & {
    assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
    creator: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
    lead?: { id: string; firstName: string; lastName: string } | null;
    customer?: { id: string; firstName?: string; lastName?: string; name?: string } | null;
    deal?: { id: string; title: string; amount?: number } | null;
    notes?: any[];
  };
  completer?: { id: string; firstName: string; lastName: string } | null;
}

export const taskRepository = {
  async create(data: CreateTaskInput): Promise<TaskWithActivity> {
    const taskId = crypto.randomUUID();

    const activity = await prisma.activity.create({
      data: {
        id: taskId,
        organizationId: data.organizationId,
        type: "task",
        subject: data.subject,
        description: data.description,
        status: data.status || "pending",
        priority: data.priority || "medium",
        dueDate: data.dueDate,
        assignedTo: data.assignedToId,
        createdBy: data.createdBy,
        leadId: data.leadId,
        customerId: data.customerId,
        dealId: data.dealId,
        contactId: data.contactId,
      },
    });

    const task = await prisma.task.create({
      data: {
        id: taskId,
        organizationId: data.organizationId,
        taskType: data.taskType || "general",
        reminderAt: data.reminderAt,
        recurrenceRule: data.recurrenceRule,
      },
      include: {
        activity: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            lead: { select: { id: true, firstName: true, lastName: true } },
            customer: { select: { id: true, firstName: true, lastName: true, name: true } },
            deal: { select: { id: true, title: true, amount: true } },
            notes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
          },
        },
        completer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return task as TaskWithActivity;
  },

  async findById(taskId: string): Promise<TaskWithActivity | null> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        activity: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            lead: { select: { id: true, firstName: true, lastName: true } },
            customer: { select: { id: true, firstName: true, lastName: true, name: true } },
            deal: { select: { id: true, title: true, amount: true } },
            notes: {
              where: { deletedAt: null },
              include: { createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        completer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return task as TaskWithActivity | null;
  },

  async findMany(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string[];
      priority?: string[];
      assignedToId?: string;
      taskType?: string;
      leadId?: string;
      customerId?: string;
      dealId?: string;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      overdueOnly?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      priority,
      assignedToId,
      taskType,
      leadId,
      customerId,
      dealId,
      dueDateFrom,
      dueDateTo,
      overdueOnly,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.TaskWhereInput = {
      organizationId,
      activity: { deletedAt: null },
    };

    if (status && status.length > 0) {
      where.activity = { ...where.activity as any, status: { in: status } };
    }

    if (priority && priority.length > 0) {
      where.activity = { ...where.activity as any, priority: { in: priority } };
    }

    if (assignedToId) {
      where.activity = { ...where.activity as any, assignedTo: assignedToId };
    }

    if (taskType) {
      where.taskType = taskType;
    }

    if (leadId) {
      where.activity = { ...where.activity as any, leadId };
    }

    if (customerId) {
      where.activity = { ...where.activity as any, customerId };
    }

    if (dealId) {
      where.activity = { ...where.activity as any, dealId };
    }

    if (dueDateFrom || dueDateTo) {
      const dueDateFilter: Prisma.DateTimeFilter = {};
      if (dueDateFrom) dueDateFilter.gte = dueDateFrom;
      if (dueDateTo) dueDateFilter.lte = dueDateTo;
      where.activity = { ...where.activity as any, dueDate: dueDateFilter };
    }

    if (overdueOnly) {
      where.activity = {
        ...where.activity as any,
        dueDate: { lt: new Date() },
        status: { notIn: ["completed", "cancelled"] },
      };
    }

    if (search) {
      where.activity = {
        ...where.activity as any,
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const orderField = sortBy === "dueDate" ? "dueDate" : sortBy === "priority" ? "priority" : sortBy === "subject" ? "subject" : "createdAt";

    const orderBy: Prisma.ActivityOrderByWithRelationInput = { [orderField]: sortOrder };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          activity: {
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              lead: { select: { id: true, firstName: true, lastName: true } },
              customer: { select: { id: true, firstName: true, lastName: true, name: true } },
              deal: { select: { id: true, title: true, amount: true } },
            },
          },
          completer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { activity: orderBy },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return {
      items: tasks,
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

  async update(taskId: string, activityData: Partial<UpdateTaskInput>, taskData?: { taskType?: string; reminderAt?: Date | null; recurrenceRule?: string | null }): Promise<TaskWithActivity> {
    const updateActivityData: Record<string, unknown> = {};
    if (activityData.subject !== undefined) updateActivityData.subject = activityData.subject;
    if (activityData.description !== undefined) updateActivityData.description = activityData.description;
    if (activityData.status !== undefined) updateActivityData.status = activityData.status;
    if (activityData.priority !== undefined) updateActivityData.priority = activityData.priority;
    if (activityData.dueDate !== undefined) updateActivityData.dueDate = activityData.dueDate;
    if (activityData.assignedToId !== undefined) updateActivityData.assignedTo = activityData.assignedToId;
    if (activityData.leadId !== undefined) updateActivityData.leadId = activityData.leadId;
    if (activityData.customerId !== undefined) updateActivityData.customerId = activityData.customerId;
    if (activityData.dealId !== undefined) updateActivityData.dealId = activityData.dealId;
    if (activityData.contactId !== undefined) updateActivityData.contactId = activityData.contactId;

    if (Object.keys(updateActivityData).length > 0) {
      await prisma.activity.update({ where: { id: taskId }, data: updateActivityData });
    }

    if (taskData) {
      await prisma.task.update({ where: { id: taskId }, data: taskData });
    }

    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        activity: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            lead: { select: { id: true, firstName: true, lastName: true } },
            customer: { select: { id: true, firstName: true, lastName: true, name: true } },
            deal: { select: { id: true, title: true, amount: true } },
            notes: { where: { deletedAt: null }, include: { createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } },
          },
        },
        completer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return updated as TaskWithActivity;
  },

  async complete(taskId: string, completedBy: string): Promise<TaskWithActivity> {
    await prisma.activity.update({
      where: { id: taskId },
      data: { status: "completed", completedAt: new Date() },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { completedBy },
    });

    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        activity: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            lead: { select: { id: true, firstName: true, lastName: true } },
            customer: { select: { id: true, firstName: true, lastName: true, name: true } },
            deal: { select: { id: true, title: true, amount: true } },
            notes: { where: { deletedAt: null }, include: { createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } },
          },
        },
        completer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return updated as TaskWithActivity;
  },

  async softDelete(taskId: string): Promise<void> {
    await prisma.activity.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
  },

  async getStats(organizationId: string) {
    const where: Prisma.TaskWhereInput = { organizationId, activity: { deletedAt: null } };

    const [totalTasks, completedTasks, overdueTasks, byStatus, byPriority] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, activity: { ...where.activity as any, status: "completed" } } }),
      prisma.task.count({
        where: {
          ...where,
          activity: {
            ...where.activity as any,
            dueDate: { lt: new Date() },
            status: { notIn: ["completed", "cancelled"] },
          },
        },
      }),
      prisma.activity.groupBy({
        by: ["status"],
        _count: true,
        where: { organizationId, type: "task", deletedAt: null },
      }),
      prisma.activity.groupBy({
        by: ["priority"],
        _count: true,
        where: { organizationId, type: "task", deletedAt: null },
      }),
    ]);

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    };
  },

  async addNote(taskId: string, organizationId: string, content: string, createdByUserId: string) {
    return prisma.note.create({
      data: {
        organizationId,
        content,
        activityId: taskId,
        createdBy: createdByUserId,
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  },

  async getNotes(taskId: string) {
    return prisma.note.findMany({
      where: { activityId: taskId, deletedAt: null },
      include: { createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async deleteNote(noteId: string) {
    await prisma.note.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  },

  async getReminders(organizationId: string) {
    const now = new Date();
    return prisma.task.findMany({
      where: {
        organizationId,
        reminderAt: { lte: now },
        reminderSent: false,
        activity: { deletedAt: null, status: { notIn: ["completed", "cancelled"] } },
      },
      include: {
        activity: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  },
};
