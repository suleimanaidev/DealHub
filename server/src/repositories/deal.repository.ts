// @ts-nocheck
import { Prisma, Deal } from "@prisma/client";
import { prisma } from "../database";

export interface CreateDealInput {
  organizationId: string;
  title: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  assignedToId?: string;
  teamId?: string;
  amount: number;
  currency?: string;
  expectedCloseDate?: Date;
  probability?: number;
  description?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export interface UpdateDealInput {
  title?: string;
  stageId?: string;
  assignedToId?: string;
  teamId?: string;
  amount?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  probability?: number;
  status?: string;
  lostReason?: string;
  wonReason?: string;
  description?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export const dealRepository = {
  async create(data: CreateDealInput): Promise<Deal> {
    const { organizationId, customerId, pipelineId, stageId, ...rest } = data;
    return prisma.deal.create({
      data: {
        ...rest,
        organization: { connect: { id: organizationId } },
        customer: { connect: { id: customerId } },
        pipeline: { connect: { id: pipelineId } },
        stage: { connect: { id: stageId } },
      },
    });
  },

  async findById(id: string) {
    return prisma.deal.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 5,
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
      status?: string;
      stageId?: string;
      pipelineId?: string;
      assignedToId?: string;
      teamId?: string;
      minAmount?: number;
      maxAmount?: number;
      dateFrom?: Date;
      dateTo?: Date;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      stageId,
      pipelineId,
      assignedToId,
      teamId,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.DealWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (stageId) where.stageId = stageId;
    if (pipelineId) where.pipelineId = pipelineId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (teamId) where.teamId = teamId;

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: Prisma.DealOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ]);

    return {
      items: deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async update(id: string, data: UpdateDealInput): Promise<Deal> {
    return prisma.deal.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async moveStage(dealId: string, stageId: string): Promise<Deal> {
    return prisma.deal.update({
      where: { id: dealId },
      data: { stageId, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async assignTo(dealId: string, assignedToId: string): Promise<void> {
    await prisma.deal.update({
      where: { id: dealId },
      data: { assignedToId, updatedAt: new Date() },
    });
  },

  async getStats(organizationId: string, pipelineId?: string) {
    const baseWhere: Prisma.DealWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (pipelineId) {
      baseWhere.pipelineId = pipelineId;
    }

    const [
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      pipelineValue,
      wonValue,
      byStage,
      byStatus,
    ] = await Promise.all([
      prisma.deal.count({ where: baseWhere }),
      prisma.deal.count({ where: { ...baseWhere, status: "open" } }),
      prisma.deal.count({ where: { ...baseWhere, status: "won" } }),
      prisma.deal.count({ where: { ...baseWhere, status: "lost" } }),
      prisma.deal.aggregate({
        _sum: { amount: true },
        where: { ...baseWhere, status: "open" },
      }),
      prisma.deal.aggregate({
        _sum: { amount: true },
        where: { ...baseWhere, status: "won" },
      }),
      prisma.deal.groupBy({
        by: ["stageId"],
        _count: true,
        _sum: { amount: true },
        where: { ...baseWhere, status: "open" },
      }),
      prisma.deal.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
        where: baseWhere,
      }),
    ]);

    return {
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      winRate: totalDeals > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0,
      pipelineValue: pipelineValue._sum.amount || 0,
      wonValue: wonValue._sum.amount || 0,
      byStage: byStage.map((s) => ({
        stageId: s.stageId,
        count: s._count,
        value: s._sum.amount || 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        value: s._sum.amount || 0,
      })),
    };
  },

  async getForecast(organizationId: string) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [currentMonthDeals, nextMonthDeals, weightedPipeline] = await Promise.all([
      prisma.deal.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: "open",
          expectedCloseDate: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        select: { id: true, title: true, amount: true, probability: true, expectedCloseDate: true },
      }),
      prisma.deal.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: "open",
          expectedCloseDate: {
            gte: nextMonth,
            lt: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1),
          },
        },
        select: { id: true, title: true, amount: true, probability: true, expectedCloseDate: true },
      }),
      prisma.deal.aggregate({
        _sum: { amount: true },
        where: {
          organizationId,
          deletedAt: null,
          status: "open",
        },
      }),
    ]);

    return {
      currentMonth: {
        deals: currentMonthDeals,
        totalValue: currentMonthDeals.reduce((sum, d) => sum + d.amount, 0),
      },
      nextMonth: {
        deals: nextMonthDeals,
        totalValue: nextMonthDeals.reduce((sum, d) => sum + d.amount, 0),
      },
      weightedPipeline: weightedPipeline._sum.amount || 0,
    };
  },
};
