import { Prisma, Lead } from "@prisma/client";
import { prisma } from "../database";

export interface CreateLeadInput {
  organizationId: string;
  createdBy: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  source?: string;
  campaignId?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  rating?: string;
  estimatedValue?: number;
  currency?: string;
  description?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  source?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  rating?: string;
  estimatedValue?: number;
  convertedAt?: Date;
  description?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export const leadRepository = {
  async create(data: CreateLeadInput): Promise<Lead> {
    const { organizationId, createdBy, ...rest } = data;
    return prisma.lead.create({
      data: {
        ...rest,
        organization: { connect: { id: organizationId } },
        creator: { connect: { id: createdBy } },
      },
    });
  },

  async findById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        source: { select: { id: true, name: true } },
        convertedCustomer: { select: { id: true, name: true, email: true } },
        notes: {
          where: { deletedAt: null },
          include: { creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        },
        attachments: {
          where: { deletedAt: null },
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
  },

  async findMany(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string[];
      rating?: string[];
      assignedToId?: string;
      teamId?: string;
      source?: string[];
      minEstimatedValue?: number;
      maxEstimatedValue?: number;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      unassignedOnly?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      rating,
      assignedToId,
      teamId,
      source,
      minEstimatedValue,
      maxEstimatedValue,
      tags,
      dateFrom,
      dateTo,
      unassignedOnly,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (rating && rating.length > 0) {
      where.rating = { in: rating };
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (source && source.length > 0) {
      where.source = { in: source };
    }

    if (unassignedOnly) {
      where.assignedToId = null;
    }

    if (minEstimatedValue !== undefined || maxEstimatedValue !== undefined) {
      where.estimatedValue = {};
      if (minEstimatedValue !== undefined) where.estimatedValue.gte = minEstimatedValue;
      if (maxEstimatedValue !== undefined) where.estimatedValue.lte = maxEstimatedValue;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.LeadOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          source: { select: { id: true, name: true } },
          _count: { select: { notes: true, activities: true, attachments: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      items: leads,
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

  async update(id: string, data: UpdateLeadInput): Promise<Lead> {
    return prisma.lead.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async transfer(leadId: string, assignedToId: string | null, transferredBy: string): Promise<Lead> {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId, updatedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: lead.organizationId,
        userId: transferredBy,
        action: "lead_transfer",
        entityType: "lead",
        entityId: leadId,
        newValues: { assignedToId } as Prisma.InputJsonValue,
      },
    });

    return lead;
  },

  async convertToCustomer(leadId: string, customerId: string): Promise<Lead> {
    return prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "converted",
        convertedAt: new Date(),
        customerId,
        updatedAt: new Date(),
      },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async findDuplicates(organizationId: string, email?: string, phone?: string, companyName?: string, excludeId?: string) {
    const conditions: Prisma.LeadWhereInput[] = [];

    if (email) {
      conditions.push({ email: { equals: email, mode: "insensitive" } });
    }

    if (phone) {
      conditions.push({ phone: { contains: phone.replace(/[\s\-\(\)]/g, ""), mode: "insensitive" } });
    }

    if (companyName) {
      conditions.push({ companyName: { equals: companyName, mode: "insensitive" } });
    }

    if (conditions.length === 0) return [];

    const where: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
      OR: conditions,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        status: true,
        createdAt: true,
      },
      take: 10,
    });
  },

  async getTimeline(leadId: string) {
    const [notes, activities, auditLogs] = await Promise.all([
      prisma.note.findMany({
        where: { leadId, deletedAt: null },
        include: { creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activity.findMany({
        where: { leadId, deletedAt: null },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { entityType: "lead", entityId: leadId },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Merge and sort by date
    const timeline: Array<{
      id: string;
      type: "note" | "activity" | "audit";
      action: string;
      content: string;
      user: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
      createdAt: Date;
      metadata?: Record<string, unknown>;
    }> = [];

    for (const note of notes) {
      timeline.push({
        id: note.id,
        type: "note",
        action: note.isPinned ? "note_pinned" : "note_added",
        content: note.content,
        user: note.createdByUser,
        createdAt: note.createdAt,
      });
    }

    for (const activity of activities) {
      timeline.push({
        id: activity.id,
        type: "activity",
        action: `${activity.type}_${activity.status}`,
        content: activity.subject,
        user: activity.assignee,
        createdAt: activity.createdAt,
        metadata: { type: activity.type, status: activity.status, priority: activity.priority },
      });
    }

    for (const log of auditLogs) {
      timeline.push({
        id: log.id,
        type: "audit",
        action: log.action,
        content: log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        user: log.user,
        createdAt: log.createdAt,
        metadata: log.metadata as Record<string, unknown> | undefined,
      });
    }

    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return timeline;
  },

  async bulkAssign(leadIds: string[], assignedToId: string, organizationId: string): Promise<{ count: number }> {
    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, organizationId, deletedAt: null },
      data: { assignedToId, updatedAt: new Date() },
    });
    return { count: result.count };
  },

  async bulkUpdateStatus(leadIds: string[], status: string, organizationId: string): Promise<{ count: number }> {
    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, organizationId, deletedAt: null },
      data: { status, updatedAt: new Date() },
    });
    return { count: result.count };
  },

  async bulkUpdateRating(leadIds: string[], rating: string, organizationId: string): Promise<{ count: number }> {
    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, organizationId, deletedAt: null },
      data: { rating, updatedAt: new Date() },
    });
    return { count: result.count };
  },

  async softDeleteMany(ids: string[], organizationId: string): Promise<{ count: number }> {
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  },

  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.LeadWhereInput = { organizationId, deletedAt: null };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalLeads, convertedLeads, unassignedLeads, byStatus, bySource, byRating, totalValue] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: "converted" } }),
      prisma.lead.count({ where: { ...where, assignedToId: null } }),
      prisma.lead.groupBy({ by: ["status"], _count: true, where }),
      prisma.lead.groupBy({ by: ["source"], _count: true, where }),
      prisma.lead.groupBy({ by: ["rating"], _count: true, where }),
      prisma.lead.aggregate({ _sum: { estimatedValue: true }, where: { ...where, status: { not: "converted" } } }),
    ]);

    return {
      totalLeads,
      convertedLeads,
      unassignedLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      totalPipelineValue: totalValue._sum.estimatedValue || 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      bySource: bySource.map((s) => ({ source: s.source || "Unknown", count: s._count })),
      byRating: byRating.map((r) => ({ rating: r.rating || "Unrated", count: r._count })),
    };
  },

  async importLeads(leads: CreateLeadInput[], organizationId: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const leadData of leads) {
      try {
        await prisma.lead.create({ data: { ...leadData, organizationId } });
        imported++;
      } catch (error) {
        errors.push(`Failed to import lead: ${leadData.email || "unknown"} - ${error}`);
      }
    }

    return { imported, errors };
  },

  async exportLeads(organizationId: string, filters: { status?: string; assignedToId?: string; dateFrom?: Date; dateTo?: Date } = {}) {
    const where: Prisma.LeadWhereInput = { organizationId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return prisma.lead.findMany({
      where,
      include: { assignedUser: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
