import { Prisma, Contact } from "@prisma/client";
import { prisma } from "../database";

export interface CreateContactInput {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  department?: string;
  companyId?: string;
  isPrimary?: boolean;
  preferredContactMethod?: string;
  customFields?: Prisma.InputJsonValue;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  department?: string;
  isPrimary?: boolean;
  preferredContactMethod?: string;
  customFields?: Prisma.InputJsonValue;
}

export const contactRepository = {
  async create(data: CreateContactInput): Promise<Contact> {
    return prisma.contact.create({ data });
  },

  async findById(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        activities: {
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
      customerId?: string;
      isPrimary?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      customerId,
      isPrimary,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.ContactWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (customerId) where.customerId = customerId;
    if (isPrimary !== undefined) where.isPrimary = isPrimary;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.ContactOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      items: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    return prisma.contact.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async setPrimary(contactId: string, customerId: string): Promise<void> {
    await prisma.$transaction([
      prisma.contact.updateMany({
        where: { customerId, deletedAt: null },
        data: { isPrimary: false },
      }),
      prisma.contact.update({
        where: { id: contactId },
        data: { isPrimary: true },
      }),
    ]);
  },
};
