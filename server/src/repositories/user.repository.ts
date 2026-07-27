import { Prisma, User } from "@prisma/client";
import { prisma } from "../database";
import { logger } from "../utils/logger";

// ─── Types ─────────────────────────────────────────────

export interface CreateUserInput {
  organizationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isOwner?: boolean;
  emailVerified?: boolean;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  preferences?: Prisma.InputJsonValue;
}

export interface FindManyOptions {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  where?: Prisma.UserWhereInput;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

// ─── User Repository ───────────────────────────────────

export const userRepository = {
  async create(data: CreateUserInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByIdWithRoles(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
  },

  async findByEmail(email: string, organizationId: string) {
    return prisma.user.findFirst({
      where: {
        email,
        organizationId,
        deletedAt: null,
      },
    });
  },

  async findByEmailGlobal(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });
  },

  async findMany({ organizationId, page = 1, pageSize = 20, search, where, orderBy }: FindManyOptions) {
    const skip = (page - 1) * pageSize;

    const searchFilter: Prisma.UserWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const whereClause: Prisma.UserWhereInput = {
      organizationId,
      deletedAt: null,
      ...searchFilter,
      ...where,
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: orderBy || { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          phone: true,
          jobTitle: true,
          department: true,
          isActive: true,
          isOwner: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return { users, total, page, pageSize };
  },

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async updateLoginInfo(id: string, ipAddress?: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  },

  async incrementFailedAttempts(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const updates: Prisma.UserUpdateInput = {
      failedLoginAttempts: attempts,
    };

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      logger.warn({ userId: id }, "Account locked due to too many failed login attempts");
    }

    await prisma.user.update({ where: { id }, data: updates });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async count(organizationId: string): Promise<number> {
    return prisma.user.count({
      where: { organizationId, deletedAt: null },
    });
  },

  async assignRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.create({
      data: { userId, roleId },
    });
  },

  async removeRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  },

  async getRoles(userId: string) {
    return prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  },
};
