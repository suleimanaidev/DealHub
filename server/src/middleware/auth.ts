import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../database";
import { sendUnauthorized, sendForbidden } from "../utils/response";
import { logger } from "../utils/logger";

// ─── JWT Payload Types ─────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isOwner: boolean;
  roles: Array<{
    id: string;
    name: string;
    permissions: Array<{
      resource: string;
      action: string;
      scope: string;
    }>;
  }>;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ─── Extract Token ─────────────────────────────────────

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }

  return null;
}

// ─── Verify JWT ────────────────────────────────────────

function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

// ─── Authentication Middleware ──────────────────────────

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      sendUnauthorized(res, "No authentication token provided");
      return;
    }

    // Verify access token
    let payload: JwtPayload;
    try {
      payload = verifyToken(token, env.JWT_SECRET);
    } catch {
      sendUnauthorized(res, "Invalid or expired token");
      return;
    }

    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      sendUnauthorized(res, "User not found or deactivated");
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      sendUnauthorized(res, "Account is temporarily locked. Please try again later");
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      isOwner: user.isOwner,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map((rp) => ({
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.scope,
        })),
      })),
    };

    next();
  } catch (error) {
    logger.error({ error }, "Authentication middleware error");
    sendUnauthorized(res, "Authentication failed");
  }
}

// ─── Authorization Middleware (RBAC) ────────────────────

export function authorize(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, "Not authenticated");
      return;
    }

    // Org owners bypass RBAC
    if (req.user.isOwner) {
      next();
      return;
    }

    // Check if user has the required permission
    const hasPermission = req.user.roles.some((role) =>
      role.permissions.some(
        (perm) => perm.resource === resource && perm.action === action
      )
    );

    if (!hasPermission) {
      sendForbidden(res, `You don't have permission to ${action} ${resource}`);
      return;
    }

    next();
  };
}

// ─── Scope Resolution Helper ───────────────────────────

export function getUserScope(
  user: AuthenticatedUser,
  resource: string,
  action: string
): "own" | "team" | "org" | "all" | null {
  // Org owners get full access
  if (user.isOwner) {
    return "all";
  }

  let highestScope: "own" | "team" | "org" | "all" | null = null;
  const scopePriority = { own: 0, team: 1, org: 2, all: 3 };

  for (const role of user.roles) {
    for (const perm of role.permissions) {
      if (perm.resource === resource && perm.action === action) {
        const currentPriority = scopePriority[perm.scope as keyof typeof scopePriority] ?? 0;
        const highestPriority = highestScope ? scopePriority[highestScope] : -1;

        if (currentPriority > highestPriority) {
          highestScope = perm.scope as "own" | "team" | "org" | "all";
        }
      }
    }
  }

  return highestScope;
}

// ─── Optional Auth (attaches user if token present) ─────

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (user && user.isActive && !user.deletedAt) {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        isOwner: user.isOwner,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          permissions: ur.role.permissions.map((rp) => ({
            resource: rp.permission.resource,
            action: rp.permission.action,
            scope: rp.scope,
          })),
        })),
      };
    }
  } catch {
    // Token invalid - continue without user
  }

  next();
}
