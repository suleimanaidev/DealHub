import { Request, Response, NextFunction } from "express";
import { getUserScope, AuthenticatedUser } from "./auth";
import { sendForbidden } from "../utils/response";

// ─── Scope Levels ──────────────────────────────────────

type ScopeLevel = "own" | "team" | "org" | "all";

const SCOPE_PRIORITY: Record<ScopeLevel, number> = {
  own: 0,
  team: 1,
  org: 2,
  all: 3,
};

// ─── Role Guard ────────────────────────────────────────

/**
 * Middleware factory that checks if the authenticated user has
 * at least one of the specified roles.
 *
 * Usage:  router.get("/admin", authenticate, roleGuard("System Admin"), handler)
 */
export function roleGuard(...allowedRoleNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, "Not authenticated");
      return;
    }

    // Org owners bypass role checks
    if (req.user.isOwner) {
      next();
      return;
    }

    const hasRole = req.user.roles.some((role) =>
      allowedRoleNames.includes(role.name)
    );

    if (!hasRole) {
      sendForbidden(
        res,
        `Requires one of the following roles: ${allowedRoleNames.join(", ")}`
      );
      return;
    }

    next();
  };
}

// ─── Permission Guard ──────────────────────────────────

/**
 * Middleware factory that checks if the user has the specific
 * permission (resource + action) at ANY scope level.
 *
 * Usage:  router.delete("/leads/:id", authenticate, permissionGuard("lead", "delete"), handler)
 */
export function permissionGuard(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, "Not authenticated");
      return;
    }

    if (req.user.isOwner) {
      next();
      return;
    }

    const hasPermission = req.user.roles.some((role) =>
      role.permissions.some(
        (p) => p.resource === resource && p.action === action
      )
    );

    if (!hasPermission) {
      sendForbidden(
        res,
        `You don't have permission to ${action} ${resource}`
      );
      return;
    }

    next();
  };
}

// ─── Minimum Scope Guard ───────────────────────────────

/**
 * Middleware factory that ensures the user's permission for the
 * given resource+action meets or exceeds the required scope level.
 *
 * Scope hierarchy:  own < team < org < all
 *
 * Usage:  router.get("/reports", authenticate, minScopeGuard("report", "read", "org"), handler)
 */
export function minScopeGuard(
  resource: string,
  action: string,
  requiredScope: ScopeLevel
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, "Not authenticated");
      return;
    }

    if (req.user.isOwner) {
      next();
      return;
    }

    const userScope = getUserScope(req.user, resource, action);

    if (!userScope) {
      sendForbidden(
        res,
        `You don't have permission to ${action} ${resource}`
      );
      return;
    }

    const userScopePriority = SCOPE_PRIORITY[userScope as ScopeLevel] ?? 0;
    const requiredScopePriority = SCOPE_PRIORITY[requiredScope];

    if (userScopePriority < requiredScopePriority) {
      sendForbidden(
        res,
        `Insufficient scope. Required: ${requiredScope}, Your scope: ${userScope}`
      );
      return;
    }

    next();
  };
}

// ─── Scope Access Resolver ─────────────────────────────

/**
 * Utility used inside controllers to determine what records a user
 * can access based on their scope level for a resource+action pair.
 *
 * Returns a Prisma "where" filter object.
 *
 * Usage in controller:
 *   const scopeWhere = resolveScopeAccess(req.user, "lead", "read", req.user!.id, req.user!.organizationId);
 *   const leads = await prisma.lead.findMany({ where: { ...scopeWhere, organizationId } });
 */
export function resolveScopeAccess(
  user: AuthenticatedUser,
  resource: string,
  action: string,
  userId: string,
  organizationId: string,
  teamId?: string | null
): Record<string, unknown> {
  const scope = getUserScope(user, resource, action);

  switch (scope) {
    case "own":
      return { assignedToId: userId };

    case "team":
      return teamId
        ? { teamId }
        : { OR: [{ assignedToId: userId }, { teamId: null }] };

    case "org":
    case "all":
      return {};

    default:
      // No permission — return impossible filter
      return { id: "__NO_ACCESS__" };
  }
}
