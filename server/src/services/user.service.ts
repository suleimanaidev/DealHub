import crypto from "crypto";
import { prisma } from "../database";
import { userRepository, CreateUserInput } from "../repositories/user.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { hashPassword } from "../utils/password";
import { generateRandomToken } from "../utils/token";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "../utils/response";
import { sendEmail, buildInvitationEmail } from "./email/emailService";
import { logger } from "../utils/logger";
import { Prisma, Role, User } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────

export interface CreateAdminUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  teamId?: string;
  roleIds?: string[];
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  teamId?: string | null;
  roleIds?: string[];
  isActive?: boolean;
}

export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}

export interface SuspendUserInput {
  reason: string;
  suspendedUntil?: Date;
}

export interface ResetUserPasswordInput {
  newPassword: string;
  sendEmail?: boolean;
}

export interface UserWithRoles extends User {
  roles?: (UserRole & { role: Role })[];
  organization?: { name: string; slug: string };
  team?: { id: string; name: string } | null;
}

interface UserRole {
  roleId: string;
  role: Role;
}

// ─── User Service ──────────────────────────────────────

export const userService = {
  // ─── Profile Management ────────────────────────────

  async getProfile(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    return user;
  },

  async getProfileWithRoles(userId: string) {
    const user = await userRepository.findByIdWithRoles(userId);
    if (!user) throw new NotFoundError("User");
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");

    return userRepository.update(userId, data);
  },

  // ─── Password Management ───────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundError("User");
    }

    const { comparePassword, validatePasswordStrength } = await import("../utils/password");

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ForbiddenError("Current password is incorrect");
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationError("Password does not meet requirements", validation.errors);
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await auditLogRepository.create({
      organizationId: user.organizationId,
      userId,
      action: "password_change",
      entityType: "user",
      entityId: userId,
    });
  },

  async adminResetPassword(
    userId: string,
    organizationId: string,
    input: ResetUserPasswordInput,
    resetBy: string
  ): Promise<{ tempPassword?: string }> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");

    const tempPassword = input.newPassword || crypto.randomBytes(12).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId } });

    if (input.sendEmail) {
      const emailContent = `
        <h2>Your password has been reset</h2>
        <p>An administrator has reset your password.</p>
        <p><strong>New Password:</strong> ${tempPassword}</p>
        <p>Please change your password after logging in.</p>
      `;
      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html: emailContent,
      });
    }

    await auditLogRepository.create({
      organizationId,
      userId: resetBy,
      action: "admin_password_reset",
      entityType: "user",
      entityId: userId,
      metadata: { resetByEmail: user.email },
    });

    return input.sendEmail ? {} : { tempPassword };
  },

  // ─── User CRUD (Admin) ────────────────────────────

  async createByAdmin(
    organizationId: string,
    input: CreateAdminUserInput,
    createdBy: string
  ): Promise<User> {
    // Check email uniqueness within org
    const existingUser = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase().trim(),
        organizationId,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictError("A user with this email already exists in this organization");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      organizationId,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      jobTitle: input.jobTitle,
      department: input.department,
      emailVerified: true,
    });

    // Assign team
    if (input.teamId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: input.teamId },
      });
    }

    // Assign roles
    if (input.roleIds && input.roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: input.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "user_create",
      entityType: "user",
      entityId: user.id,
      newValues: { email: user.email, firstName: user.firstName, lastName: user.lastName } as Prisma.InputJsonValue,
    });

    return user;
  },

  async getById(
    userId: string,
    organizationId: string
  ): Promise<UserWithRoles> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        team: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) throw new NotFoundError("User");
    return user;
  },

  async getAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      teamId?: string;
      roleId?: string;
      isSuspended?: boolean;
      lastLoginFrom?: Date;
      lastLoginTo?: Date;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    const {
      page = 1,
      limit = 25,
      search,
      isActive,
      teamId,
      roleId,
      isSuspended,
      lastLoginFrom,
      lastLoginTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const where: Prisma.UserWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (roleId) {
      where.roles = { some: { roleId } };
    }

    if (isSuspended !== undefined) {
      if (isSuspended) {
        where.lockedUntil = { gt: new Date() };
      } else {
        where.OR = [
          { lockedUntil: null },
          { lockedUntil: { lte: new Date() } },
        ];
      }
    }

    if (lastLoginFrom || lastLoginTo) {
      where.lastLoginAt = {};
      if (lastLoginFrom) where.lastLoginAt.gte = lastLoginFrom;
      if (lastLoginTo) where.lastLoginAt.lte = lastLoginTo;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder as "asc" | "desc",
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          roles: {
            include: { role: { select: { id: true, name: true } } },
          },
          team: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
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

  async updateByAdmin(
    userId: string,
    organizationId: string,
    data: UpdateUserInput,
    updatedBy: string
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");

    if (userId === updatedBy && data.isActive === false) {
      throw new ForbiddenError("Cannot deactivate your own account");
    }

    if (user.isOwner && data.isActive === false) {
      throw new ForbiddenError("Cannot deactivate the organization owner");
    }

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          organizationId,
          id: { not: userId },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictError("A user with this email already exists");
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Handle role changes
    if (data.roleIds) {
      await prisma.userRole.deleteMany({ where: { userId } });

      if (data.roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: data.roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        roles: { include: { role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "user_update",
      entityType: "user",
      entityId: userId,
      oldValues: { email: user.email, firstName: user.firstName, lastName: user.lastName } as Prisma.InputJsonValue,
      newValues: updateData as Prisma.InputJsonValue,
    });

    return updatedUser;
  },

  async suspend(
    userId: string,
    organizationId: string,
    input: SuspendUserInput,
    suspendedBy: string
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");
    if (user.isOwner) throw new ForbiddenError("Cannot suspend the organization owner");
    if (userId === suspendedBy) throw new ForbiddenError("Cannot suspend your own account");

    const suspendedUntil = input.suspendedUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        lockedUntil: suspendedUntil,
        updatedAt: new Date(),
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId } });

    await auditLogRepository.create({
      organizationId,
      userId: suspendedBy,
      action: "user_suspend",
      entityType: "user",
      entityId: userId,
      metadata: {
        reason: input.reason,
        suspendedUntil: suspendedUntil.toISOString(),
      },
    });

    return updatedUser;
  },

  async unsuspend(
    userId: string,
    organizationId: string,
    unsuspendedBy: string
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        lockedUntil: null,
        failedLoginAttempts: 0,
        updatedAt: new Date(),
      },
    });

    await auditLogRepository.create({
      organizationId,
      userId: unsuspendedBy,
      action: "user_unsuspend",
      entityType: "user",
      entityId: userId,
    });

    return updatedUser;
  },

  async softDelete(
    userId: string,
    organizationId: string,
    deletedBy: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");
    if (user.isOwner) throw new ForbiddenError("Cannot delete the organization owner");
    if (userId === deletedBy) throw new ForbiddenError("Cannot delete your own account");

    await userRepository.softDelete(userId);

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId } });

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "user_delete",
      entityType: "user",
      entityId: userId,
      metadata: { deletedUserEmail: user.email, deletedUserName: `${user.firstName} ${user.lastName}` },
    });
  },

  // ─── Role Assignment ───────────────────────────────

  async assignRoles(
    userId: string,
    organizationId: string,
    roleIds: string[],
    assignedBy: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");

    // Verify all roles exist in this org
    const validRoles = await prisma.role.findMany({
      where: { id: { in: roleIds }, organizationId },
    });

    if (validRoles.length !== roleIds.length) {
      throw new ValidationError("One or more role IDs are invalid");
    }

    // Remove existing, assign new
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);

    const newRoles = validRoles.map((r) => r.name).join(", ");

    await auditLogRepository.create({
      organizationId,
      userId: assignedBy,
      action: "user_role_change",
      entityType: "user",
      entityId: userId,
      newValues: { roles: newRoles } as Prisma.InputJsonValue,
    });
  },

  async getAvailableRoles(organizationId: string) {
    return prisma.role.findMany({
      where: { organizationId },
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  // ─── Activity Logs ─────────────────────────────────

  async getActivityLogs(
    userId: string,
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!user) throw new NotFoundError("User");

    return auditLogRepository.findMany(organizationId, {
      ...options,
      userId,
    });
  },

  async getActivitySummary(organizationId: string, userId: string) {
    return auditLogRepository.getUserActivitySummary(organizationId, userId);
  },

  // ─── Invitation ────────────────────────────────────

  async invite(
    organizationId: string,
    inviterId: string,
    data: InviteUserInput
  ): Promise<{ message: string; userId: string }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        organizationId,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictError("A user with this email already exists in this organization");
    }

    const passwordHash = await hashPassword(crypto.randomBytes(16).toString("hex"));
    const user = await userRepository.create({
      organizationId,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      emailVerified: false,
    });

    if (data.roleIds && data.roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invitationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const inviter = await userRepository.findById(inviterId);
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });

    const { env } = await import("../config/env");
    const inviteUrl = `${env.APP_URL}/accept-invitation?token=${token}`;
    const emailOptions = buildInvitationEmail(
      inviteUrl,
      data.firstName,
      inviter ? `${inviter.firstName} ${inviter.lastName}` : "An administrator",
      org?.name || "the organization"
    );
    await sendEmail({ ...emailOptions, to: data.email });

    await auditLogRepository.create({
      organizationId,
      userId: inviterId,
      action: "user_invite",
      entityType: "user",
      entityId: user.id,
      metadata: { invitedEmail: data.email },
    });

    return { message: "Invitation sent successfully", userId: user.id };
  },

  // ─── Statistics ────────────────────────────────────

  async getStats(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      newLast30Days,
      newLast7Days,
      byTeam,
      byRole,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId, deletedAt: null } }),
      prisma.user.count({ where: { organizationId, isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { organizationId, isActive: false, deletedAt: null } }),
      prisma.user.count({
        where: { organizationId, lockedUntil: { gt: new Date() }, deletedAt: null },
      }),
      prisma.user.count({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
      prisma.user.count({
        where: { organizationId, createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      }),
      prisma.user.groupBy({
        by: ["teamId"],
        _count: true,
        where: { organizationId, deletedAt: null },
      }),
      prisma.userRole.groupBy({
        by: ["roleId"],
        _count: true,
        where: { user: { organizationId, deletedAt: null } },
      }),
    ]);

    // Resolve team names
    const teamIds = byTeam.filter((t) => t.teamId).map((t) => t.teamId!);
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    // Resolve role names
    const roleIds = byRole.map((r) => r.roleId);
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.name]));

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      newLast30Days,
      newLast7Days,
      byTeam: byTeam.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamId ? teamMap.get(t.teamId) || "Unknown" : "Unassigned",
        count: t._count,
      })),
      byRole: byRole.map((r) => ({
        roleId: r.roleId,
        roleName: roleMap.get(r.roleId) || "Unknown",
        count: r._count,
      })),
    };
  },

  // ─── Bulk Operations ───────────────────────────────

  async bulkActivate(userIds: string[], organizationId: string, updatedBy: string) {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, organizationId, deletedAt: null },
      data: { isActive: true, lockedUntil: null, updatedAt: new Date() },
    });

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "user_bulk_activate",
      entityType: "user",
      metadata: { userIds, count: result.count },
    });

    return { count: result.count };
  },

  async bulkDeactivate(userIds: string[], organizationId: string, updatedBy: string) {
    // Prevent deactivating self
    const filteredIds = userIds.filter((id) => id !== updatedBy);

    const result = await prisma.user.updateMany({
      where: { id: { in: filteredIds }, organizationId, deletedAt: null, isOwner: false },
      data: { isActive: false, updatedAt: new Date() },
    });

    // Invalidate sessions
    await prisma.session.deleteMany({
      where: { userId: { in: filteredIds } },
    });

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "user_bulk_deactivate",
      entityType: "user",
      metadata: { userIds: filteredIds, count: result.count },
    });

    return { count: result.count };
  },

  async bulkDelete(userIds: string[], organizationId: string, deletedBy: string) {
    const filteredIds = userIds.filter((id) => id !== deletedBy);

    const result = await prisma.user.updateMany({
      where: { id: { in: filteredIds }, organizationId, deletedAt: null, isOwner: false },
      data: { deletedAt: new Date(), isActive: false },
    });

    await prisma.session.deleteMany({
      where: { userId: { in: filteredIds } },
    });

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "user_bulk_delete",
      entityType: "user",
      metadata: { userIds: filteredIds, count: result.count },
    });

    return { count: result.count };
  },

  async bulkAssignRole(userIds: string[], roleId: string, organizationId: string, assignedBy: string) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) throw new NotFoundError("Role");

    const entries = userIds.map((userId) => ({ userId, roleId }));

    await prisma.userRole.createMany({
      data: entries,
      skipDuplicates: true,
    });

    await auditLogRepository.create({
      organizationId,
      userId: assignedBy,
      action: "user_bulk_role_assign",
      entityType: "user",
      metadata: { userIds, roleId, roleName: role.name },
    });

    return { count: userIds.length };
  },

  async bulkRemoveRole(userIds: string[], roleId: string, organizationId: string, removedBy: string) {
    await prisma.userRole.deleteMany({
      where: {
        userId: { in: userIds },
        roleId,
      },
    });

    await auditLogRepository.create({
      organizationId,
      userId: removedBy,
      action: "user_bulk_role_remove",
      entityType: "user",
      metadata: { userIds, roleId },
    });

    return { count: userIds.length };
  },

  async bulkChangeTeam(userIds: string[], teamId: string | null, organizationId: string, updatedBy: string) {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, organizationId, deletedAt: null },
      data: { teamId, updatedAt: new Date() },
    });

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "user_bulk_team_change",
      entityType: "user",
      metadata: { userIds, teamId },
    });

    return { count: result.count };
  },
};
