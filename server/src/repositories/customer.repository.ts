import { Prisma, Customer } from "@prisma/client";
import { prisma } from "../database";

export interface CreateCustomerInput {
  organizationId: string;
  createdBy: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  website?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  tier?: string;
  source?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export interface UpdateCustomerInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  website?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  tier?: string;
  source?: string;
  tags?: string[];
  customFields?: Prisma.InputJsonValue;
}

export const customerRepository = {
  async create(data: CreateCustomerInput): Promise<Customer> {
    const { companyName, organizationId, createdBy, ...rest } = data;
    return prisma.customer.create({
      data: {
        ...rest,
        name: data.name || companyName || "Unknown",
        organization: { connect: { id: organizationId } },
        creator: { connect: { id: createdBy } },
      },
    });
  },

  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        contacts: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true, isPrimary: true },
        },
        deals: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  },

  async findByEmail(email: string, organizationId: string) {
    return prisma.customer.findFirst({
      where: { email, organizationId, deletedAt: null },
    });
  },

  async findMany(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      tier?: string;
      assignedToId?: string;
      teamId?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      tier,
      assignedToId,
      teamId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (tier) where.tier = tier;
    if (assignedToId) where.assignedToId = assignedToId;
    if (teamId) where.teamId = teamId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderField = sortBy === "name" || sortBy === "email" || sortBy === "createdAt" ? sortBy : "createdAt";
    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [orderField]: sortOrder,
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { deals: true, activities: true, contacts: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async update(id: string, data: UpdateCustomerInput): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async assignTo(customerId: string, assignedToId: string): Promise<void> {
    await prisma.customer.update({
      where: { id: customerId },
      data: { assignedToId, updatedAt: new Date() },
    });
  },

  async getStats(organizationId: string) {
    const [totalCustomers, activeCustomers, byTier, byStatus] = await Promise.all([
      prisma.customer.count({ where: { organizationId, deletedAt: null } }),
      prisma.customer.count({ where: { organizationId, status: "active", deletedAt: null } }),
      prisma.customer.groupBy({
        by: ["tier"],
        _count: true,
        where: { organizationId, deletedAt: null },
      }),
      prisma.customer.groupBy({
        by: ["status"],
        _count: true,
        where: { organizationId, deletedAt: null },
      }),
    ]);

    const totalRevenue = await prisma.customer.aggregate({
      _sum: { annualRevenue: true },
      where: { organizationId, deletedAt: null },
    });

    return {
      totalCustomers,
      activeCustomers,
      totalRevenue: totalRevenue._sum.annualRevenue || 0,
      byTier: byTier.map((t) => ({ tier: t.tier, count: t._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  },
};
