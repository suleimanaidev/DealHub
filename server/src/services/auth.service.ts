import crypto from "crypto";
// @ts-nocheck
import { prisma } from "../database";
import { userRepository, CreateUserInput } from "../repositories/user.repository";
import { organizationRepository } from "../repositories/organization.repository";
import { hashPassword, comparePassword, validatePasswordStrength } from "../utils/password";
import { generateAccessToken, generateRefreshToken, generateRandomToken, parseExpiry, verifyRefreshToken } from "../utils/token";
import { slugify, generateUniqueSlug } from "../utils/helpers";
import { JwtPayload } from "../middleware/auth";
import { UnauthorizedError, ConflictError, NotFoundError, ValidationError, AppError } from "../utils/response";
import { HTTP_STATUS } from "../config/constants";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail, buildInvitationEmail } from "./email/emailService";

// ─── Types ─────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    isOwner: boolean;
  };
}

// ─── Auth Service ──────────────────────────────────────

export const authService = {
  async register(input: RegisterInput): Promise<{ message: string; userId: string }> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError("Password does not meet requirements", passwordValidation.errors);
    }

    // Check if user already exists globally
    const existingUser = await userRepository.findByEmailGlobal(input.email);
    if (existingUser) {
      throw new ConflictError("An account with this email already exists");
    }

    // Create organization
    const slug = await generateUniqueSlug(input.organizationName, organizationRepository.slugExists);
    const organization = await organizationRepository.create({
      name: input.organizationName,
      slug,
    });

    // Create user
    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      organizationId: organization.id,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isOwner: true,
      emailVerified: false,
    });

    // Seed default roles and permissions
    await seedDefaultRoles(organization.id);

    // Assign System Admin role to owner
    const adminRole = await prisma.role.findFirst({
      where: { organizationId: organization.id, name: "System Admin" },
    });
    if (adminRole) {
      await userRepository.assignRole(user.id, adminRole.id);
    }

    // Generate verification token
    const verificationToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // Send verification email (non-blocking - don't block registration if email fails)
    const verificationUrl = `${env.APP_URL}/verify-email?token=${verificationToken}`;
    const emailOptions = buildVerificationEmail(verificationUrl, input.firstName);
    sendEmail({ ...emailOptions, to: input.email }).catch((err) =>
      logger.warn({ err }, "Failed to send verification email - user can still log in")
    );

    logger.info({ userId: user.id, email: input.email }, "User registered successfully");

    return {
      message: "Registration successful. Please check your email to verify your account.",
      userId: user.id,
    };
  },

  async login(input: LoginInput): Promise<AuthTokens> {
    // Find user
    const user = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase().trim(), deletedAt: null },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError("Account is temporarily locked. Please try again later");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError("Account has been deactivated");
    }

    // Verify password
    if (!user.passwordHash) {
      throw new UnauthorizedError("Please log in with your social account");
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      await userRepository.incrementFailedAttempts(user.id);
      throw new UnauthorizedError("Invalid email or password");
    }

    // Update login info
    await userRepository.updateLoginInfo(user.id);

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    const expiresAt = parseExpiry(env.JWT_REFRESH_EXPIRES_IN);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "login",
        entityType: "user",
        entityId: user.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    logger.info({ userId: user.id }, "User logged in successfully");

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        isOwner: user.isOwner,
      },
    };
  },

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Find session
    const session = await prisma.session.findFirst({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError("Session not found");
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError("Refresh token expired");
    }

    if (!session.user.isActive || session.user.deletedAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError("User account is not active");
    }

    // Generate new tokens
    const newPayload: JwtPayload = {
      userId: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId,
    };

    const accessToken = generateAccessToken(newPayload);
    const refreshToken = generateRefreshToken(newPayload);

    // Rotate refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken,
        expiresAt: parseExpiry(env.JWT_REFRESH_EXPIRES_IN),
        lastActiveAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  },

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific session
      await prisma.session.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      // Revoke all sessions
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    logger.info({ userId }, "User logged out");
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If an account exists, a password reset email has been sent." };
    }

    // Invalidate existing tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate reset token
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send reset email (non-blocking)
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    const emailOptions = buildPasswordResetEmail(resetUrl, user.firstName);
    sendEmail({ ...emailOptions, to: user.email }).catch((err) =>
      logger.warn({ err }, "Failed to send password reset email")
    );

    return { message: "If an account exists, a password reset email has been sent." };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Validate password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError("Password does not meet requirements", passwordValidation.errors);
    }

    // Find token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token, usedAt: null },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    if (resetToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Reset token has expired");
    }

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: resetToken.user.organizationId,
        userId: resetToken.userId,
        action: "password_change",
        entityType: "user",
        entityId: resetToken.userId,
      },
    });

    return { message: "Password reset successful. Please log in with your new password." };
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: { token, verifiedAt: null },
    });

    if (!verificationToken) {
      throw new UnauthorizedError("Invalid or expired verification token");
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Verification token has expired");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { verifiedAt: new Date() },
      }),
    ]);

    return { message: "Email verified successfully" };
  },

  async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User");
    if (user.emailVerified) return { message: "Email already verified" };

    // Invalidate existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, verifiedAt: null },
    });

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });

    const verificationUrl = `${env.APP_URL}/verify-email?token=${token}`;
    const emailOptions = buildVerificationEmail(verificationUrl, user.firstName);
    sendEmail({ ...emailOptions, to: user.email }).catch((err) =>
      logger.warn({ err }, "Failed to resend verification email")
    );

    return { message: "Verification email sent" };
  },

  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: "desc" },
    });
  },

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundError("Session");
    }

    await prisma.session.delete({ where: { id: sessionId } });
  },
};

// ─── Seed Default Roles ────────────────────────────────

async function seedDefaultRoles(organizationId: string): Promise<void> {
  const roles = [
    {
      name: "System Admin",
      description: "Full access to all organization settings and data",
      isSystem: true,
      permissions: ["*"],
    },
    {
      name: "Sales Manager",
      description: "Manages sales team and pipeline",
      isSystem: true,
      permissions: [
        { resource: "lead", action: "create", scope: "org" },
        { resource: "lead", action: "read", scope: "team" },
        { resource: "lead", action: "update", scope: "team" },
        { resource: "lead", action: "delete", scope: "team" },
        { resource: "lead", action: "assign", scope: "team" },
        { resource: "lead", action: "convert", scope: "team" },
        { resource: "lead", action: "export", scope: "team" },
        { resource: "contact", action: "create", scope: "org" },
        { resource: "contact", action: "read", scope: "team" },
        { resource: "contact", action: "update", scope: "team" },
        { resource: "contact", action: "delete", scope: "team" },
        { resource: "deal", action: "create", scope: "org" },
        { resource: "deal", action: "read", scope: "team" },
        { resource: "deal", action: "update", scope: "team" },
        { resource: "deal", action: "delete", scope: "team" },
        { resource: "deal", action: "export", scope: "team" },
        { resource: "activity", action: "create", scope: "org" },
        { resource: "activity", action: "read", scope: "team" },
        { resource: "activity", action: "update", scope: "team" },
        { resource: "activity", action: "delete", scope: "team" },
        { resource: "report", action: "read", scope: "team" },
        { resource: "report", action: "export", scope: "team" },
        { resource: "user", action: "read", scope: "org" },
        { resource: "settings", action: "read", scope: "org" },
      ],
    },
    {
      name: "Sales Representative",
      description: "Individual sales contributor",
      isSystem: true,
      permissions: [
        { resource: "lead", action: "create", scope: "own" },
        { resource: "lead", action: "read", scope: "own" },
        { resource: "lead", action: "update", scope: "own" },
        { resource: "lead", action: "delete", scope: "own" },
        { resource: "lead", action: "convert", scope: "own" },
        { resource: "contact", action: "create", scope: "own" },
        { resource: "contact", action: "read", scope: "own" },
        { resource: "contact", action: "update", scope: "own" },
        { resource: "deal", action: "create", scope: "own" },
        { resource: "deal", action: "read", scope: "own" },
        { resource: "deal", action: "update", scope: "own" },
        { resource: "activity", action: "create", scope: "own" },
        { resource: "activity", action: "read", scope: "own" },
        { resource: "activity", action: "update", scope: "own" },
        { resource: "activity", action: "delete", scope: "own" },
      ],
    },
    {
      name: "Marketing Manager",
      description: "Manages marketing campaigns and lead sources",
      isSystem: true,
      permissions: [
        { resource: "lead", action: "create", scope: "org" },
        { resource: "lead", action: "read", scope: "org" },
        { resource: "lead", action: "update", scope: "org" },
        { resource: "lead", action: "assign", scope: "org" },
        { resource: "lead", action: "export", scope: "org" },
        { resource: "contact", action: "create", scope: "org" },
        { resource: "contact", action: "read", scope: "org" },
        { resource: "contact", action: "update", scope: "org" },
        { resource: "contact", action: "export", scope: "org" },
        { resource: "activity", action: "create", scope: "org" },
        { resource: "activity", action: "read", scope: "org" },
        { resource: "report", action: "read", scope: "org" },
        { resource: "report", action: "export", scope: "org" },
      ],
    },
  ];

  // Ensure all permissions exist
  const permissionPairs = [
    // Lead permissions
    { resource: "lead", action: "create" }, { resource: "lead", action: "read" },
    { resource: "lead", action: "update" }, { resource: "lead", action: "delete" },
    { resource: "lead", action: "assign" }, { resource: "lead", action: "convert" },
    { resource: "lead", action: "export" }, { resource: "lead", action: "import" },
    // Contact permissions
    { resource: "contact", action: "create" }, { resource: "contact", action: "read" },
    { resource: "contact", action: "update" }, { resource: "contact", action: "delete" },
    { resource: "contact", action: "export" }, { resource: "contact", action: "import" },
    // Customer permissions
    { resource: "customer", action: "create" }, { resource: "customer", action: "read" },
    { resource: "customer", action: "update" }, { resource: "customer", action: "delete" },
    { resource: "customer", action: "export" },
    // Deal permissions
    { resource: "deal", action: "create" }, { resource: "deal", action: "read" },
    { resource: "deal", action: "update" }, { resource: "deal", action: "delete" },
    { resource: "deal", action: "export" },
    // Activity permissions
    { resource: "activity", action: "create" }, { resource: "activity", action: "read" },
    { resource: "activity", action: "update" }, { resource: "activity", action: "delete" },
    // Report permissions
    { resource: "report", action: "read" }, { resource: "report", action: "export" },
    // User permissions
    { resource: "user", action: "create" }, { resource: "user", action: "read" },
    { resource: "user", action: "update" }, { resource: "user", action: "delete" },
    { resource: "user", action: "invite" },
    // Settings permissions
    { resource: "settings", action: "read" }, { resource: "settings", action: "update" },
    // Role permissions
    { resource: "role", action: "create" }, { resource: "role", action: "read" },
    { resource: "role", action: "update" }, { resource: "role", action: "delete" },
    // Audit
    { resource: "audit", action: "read" },
    // Notification
    { resource: "notification", action: "read" }, { resource: "notification", action: "update" },
  ];

  await prisma.$transaction(
    permissionPairs.map((p) =>
      prisma.permission.upsert({
        where: { resource_action: p },
        create: p,
        update: {},
      })
    )
  );

  // Create roles
  for (const roleDef of roles) {
    const role = await prisma.role.create({
      data: {
        organizationId,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    // Assign permissions
    if (roleDef.permissions.includes("*")) {
      // Admin gets all permissions
      const allPermissions = await prisma.permission.findMany();
      await prisma.rolePermission.createMany({
        data: allPermissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
          scope: "all",
        })),
      });
    } else {
      const allPerms = await prisma.permission.findMany();
      const rolePerms = roleDef.permissions.map((rp) => {
        const [resource, action] = typeof rp === "string" ? [rp, rp] : [rp.resource, rp.action];
        const perm = allPerms.find((p) => p.resource === resource && p.action === action);
        if (!perm) return null;
        return {
          roleId: role.id,
          permissionId: perm.id,
          scope: typeof rp === "object" && "scope" in rp ? rp.scope : "own",
        };
      }).filter(Boolean) as { roleId: string; permissionId: string; scope: string }[];

      if (rolePerms.length > 0) {
        await prisma.rolePermission.createMany({ data: rolePerms });
      }
    }
  }
}
