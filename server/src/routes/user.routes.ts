import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateBody, validateParams } from "../middleware/validate";
import {
  updateUserSchema,
  updateProfileSchema,
  inviteUserSchema,
  listUsersSchema,
  createUserSchema,
  suspendUserSchema,
  resetUserPasswordSchema,
  assignRolesSchema,
  bulkUserIdsSchema,
  bulkAssignRoleSchema,
  bulkChangeTeamSchema,
  createTeamSchema,
  updateTeamSchema,
} from "../validation";
import { z } from "zod";

const router = Router();

// ─── All routes require authentication ─────────────────

router.use(authenticate);

// ─── Param Schemas ─────────────────────────────────────

const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

const teamIdParamSchema = z.object({
  teamId: z.string().uuid("Invalid team ID"),
});

const teamMemberParamSchema = z.object({
  teamId: z.string().uuid("Invalid team ID"),
  userId: z.string().uuid("Invalid user ID"),
});

// ═══════════════════════════════════════════════════════
//  PROFILE ROUTES (self)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/users/me
 *
 * Get current user's profile with roles and team.
 */
router.get("/me", userController.me);

/**
 * PATCH /api/v1/users/me
 *
 * Update current user's profile.
 */
router.patch("/me", validateBody(updateProfileSchema), userController.updateMe);

// ═══════════════════════════════════════════════════════
//  BULK OPERATIONS (must be before /:userId routes)
// ═══════════════════════════════════════════════════════

/**
 * POST /api/v1/users/bulk/activate
 *
 * Activate multiple users.
 */
router.post(
  "/bulk/activate",
  permissionGuard("user", "update"),
  validateBody(bulkUserIdsSchema),
  userController.bulkActivate
);

/**
 * POST /api/v1/users/bulk/deactivate
 *
 * Deactivate multiple users.
 */
router.post(
  "/bulk/deactivate",
  permissionGuard("user", "update"),
  validateBody(bulkUserIdsSchema),
  userController.bulkDeactivate
);

/**
 * POST /api/v1/users/bulk/delete
 *
 * Soft-delete multiple users.
 */
router.post(
  "/bulk/delete",
  permissionGuard("user", "delete"),
  validateBody(bulkUserIdsSchema),
  userController.bulkDelete
);

/**
 * POST /api/v1/users/bulk/assign-role
 *
 * Assign a role to multiple users.
 */
router.post(
  "/bulk/assign-role",
  permissionGuard("user", "update"),
  validateBody(bulkAssignRoleSchema),
  userController.bulkAssignRole
);

/**
 * POST /api/v1/users/bulk/change-team
 *
 * Change team for multiple users.
 */
router.post(
  "/bulk/change-team",
  permissionGuard("user", "update"),
  validateBody(bulkChangeTeamSchema),
  userController.bulkChangeTeam
);

// ═══════════════════════════════════════════════════════
//  TEAM ROUTES (must be before /:userId routes)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/users/teams
 *
 * List all teams in the organization.
 */
router.get(
  "/teams",
  permissionGuard("user", "read"),
  userController.listTeams
);

/**
 * GET /api/v1/users/roles/available
 *
 * List all available roles.
 */
router.get(
  "/roles/available",
  permissionGuard("user", "read"),
  userController.availableRoles
);

/**
 * GET /api/v1/users/activity/organization
 *
 * Get organization-wide activity summary.
 */
router.get(
  "/activity/organization",
  permissionGuard("audit", "read"),
  userController.organizationActivity
);

/**
 * POST /api/v1/users/teams
 *
 * Create a new team.
 */
router.post(
  "/teams",
  permissionGuard("user", "create"),
  validateBody(createTeamSchema),
  userController.createTeam
);

/**
 * GET /api/v1/users/teams/:teamId
 *
 * Get a team with its members.
 */
router.get(
  "/teams/:teamId",
  validateParams(teamIdParamSchema),
  permissionGuard("user", "read"),
  userController.getTeam
);

/**
 * PATCH /api/v1/users/teams/:teamId
 *
 * Update a team.
 */
router.patch(
  "/teams/:teamId",
  validateParams(teamIdParamSchema),
  permissionGuard("user", "update"),
  validateBody(updateTeamSchema),
  userController.updateTeam
);

/**
 * DELETE /api/v1/users/teams/:teamId
 *
 * Soft-delete a team.
 */
router.delete(
  "/teams/:teamId",
  validateParams(teamIdParamSchema),
  permissionGuard("user", "delete"),
  userController.deleteTeam
);

/**
 * POST /api/v1/users/teams/:teamId/members
 *
 * Add a member to a team.
 */
const addTeamMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});

router.post(
  "/teams/:teamId/members",
  validateParams(teamIdParamSchema),
  validateBody(addTeamMemberSchema),
  permissionGuard("user", "update"),
  userController.addTeamMember
);

/**
 * DELETE /api/v1/users/teams/:teamId/members/:userId
 *
 * Remove a member from a team.
 */
router.delete(
  "/teams/:teamId/members/:userId",
  validateParams(teamMemberParamSchema),
  permissionGuard("user", "update"),
  userController.removeTeamMember
);

// ═══════════════════════════════════════════════════════
//  USER CRUD ROUTES
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/users
 *
 * List all users with search, filter, sort, pagination.
 */
router.get(
  "/",
  permissionGuard("user", "read"),
  userController.list
);

/**
 * GET /api/v1/users/stats
 *
 * Get comprehensive user statistics.
 */
router.get(
  "/stats",
  permissionGuard("user", "read"),
  userController.stats
);

/**
 * POST /api/v1/users
 *
 * Create a new user directly (admin).
 */
router.post(
  "/",
  permissionGuard("user", "create"),
  validateBody(createUserSchema),
  userController.create
);

/**
 * POST /api/v1/users/invite
 *
 * Invite a new user via email.
 */
router.post(
  "/invite",
  permissionGuard("user", "invite"),
  validateBody(inviteUserSchema),
  userController.invite
);

// ═══════════════════════════════════════════════════════
//  SINGLE USER ROUTES (must be after all static routes)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/users/:userId
 *
 * Get a single user by ID with full details.
 */
router.get(
  "/:userId",
  validateParams(userIdParamSchema),
  permissionGuard("user", "read"),
  userController.getById
);

/**
 * PATCH /api/v1/users/:userId
 *
 * Update a user's profile, roles, status, team.
 */
router.patch(
  "/:userId",
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  permissionGuard("user", "update"),
  userController.update
);

/**
 * DELETE /api/v1/users/:userId
 *
 * Soft-delete a user.
 */
router.delete(
  "/:userId",
  validateParams(userIdParamSchema),
  permissionGuard("user", "delete"),
  userController.remove
);

// ─── Suspend / Unsuspend ───────────────────────────────

/**
 * POST /api/v1/users/:userId/suspend
 *
 * Suspend a user account.
 */
router.post(
  "/:userId/suspend",
  validateParams(userIdParamSchema),
  permissionGuard("user", "update"),
  validateBody(suspendUserSchema),
  userController.suspend
);

/**
 * POST /api/v1/users/:userId/unsuspend
 *
 * Unsuspend a user account.
 */
router.post(
  "/:userId/unsuspend",
  validateParams(userIdParamSchema),
  permissionGuard("user", "update"),
  userController.unsuspend
);

// ─── Role Management ───────────────────────────────────

/**
 * PUT /api/v1/users/:userId/roles
 *
 * Replace all roles for a user.
 */
router.put(
  "/:userId/roles",
  validateParams(userIdParamSchema),
  permissionGuard("user", "update"),
  validateBody(assignRolesSchema),
  userController.assignRoles
);

/**
 * GET /api/v1/users/:userId/roles
 *
 * Get a user's current roles.
 */
router.get(
  "/:userId/roles",
  validateParams(userIdParamSchema),
  permissionGuard("user", "read"),
  userController.getRoles
);

// ─── Password Reset ────────────────────────────────────

/**
 * POST /api/v1/users/:userId/reset-password
 *
 * Admin reset a user's password.
 */
router.post(
  "/:userId/reset-password",
  validateParams(userIdParamSchema),
  permissionGuard("user", "update"),
  validateBody(resetUserPasswordSchema),
  userController.resetPassword
);

// ─── Activity Logs ─────────────────────────────────────

/**
 * GET /api/v1/users/:userId/activity
 *
 * Get a user's activity/audit logs.
 */
router.get(
  "/:userId/activity",
  validateParams(userIdParamSchema),
  permissionGuard("audit", "read"),
  userController.activityLogs
);

/**
 * GET /api/v1/users/:userId/activity/summary
 *
 * Get a user's activity summary.
 */
router.get(
  "/:userId/activity/summary",
  validateParams(userIdParamSchema),
  permissionGuard("audit", "read"),
  userController.activitySummary
);

export default router;
