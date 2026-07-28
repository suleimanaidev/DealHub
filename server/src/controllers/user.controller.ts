import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { teamRepository } from "../repositories/team.repository";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../utils/response";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ─── User Controller ───────────────────────────────────

export const userController = {
  // ─── Profile ───────────────────────────────────────

  /**
   * GET /api/v1/users/me
   *
   * Get current user's profile with roles and team.
   */
  me: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await userService.getProfileWithRoles(userId);
    sendOk(res, { user }, "Profile retrieved");
  }),

  /**
   * PATCH /api/v1/users/me
   *
   * Update current user's profile.
   */
  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await userService.updateProfile(userId, req.body);
    sendOk(res, { user }, "Profile updated");
  }),

  // ─── Admin CRUD ────────────────────────────────────

  /**
   * GET /api/v1/users
   *
   * List all users with search, filter, sort, pagination.
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const {
      page, limit, search, isActive, teamId, roleId,
      isSuspended, lastLoginFrom, lastLoginTo, sortBy, sortOrder,
    } = req.query;

    const result = await userService.getAll(organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      search: search as string | undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      teamId: teamId as string | undefined,
      roleId: roleId as string | undefined,
      isSuspended: isSuspended !== undefined ? isSuspended === "true" : undefined,
      lastLoginFrom: lastLoginFrom ? new Date(lastLoginFrom as string) : undefined,
      lastLoginTo: lastLoginTo ? new Date(lastLoginTo as string) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });

    sendPaginated(
      res,
      result.users,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Users retrieved"
    );
  }),

  /**
   * GET /api/v1/users/stats
   *
   * Get comprehensive user statistics.
   */
  stats: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const stats = await userService.getStats(organizationId);
    sendOk(res, { stats }, "User stats retrieved");
  }),

  /**
   * POST /api/v1/users
   *
   * Create a new user directly (admin).
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const user = await userService.createByAdmin(organizationId, req.body, createdBy);

    sendCreated(res, { user }, "User created successfully");
  }),

  /**
   * GET /api/v1/users/:userId
   *
   * Get a single user with roles, team, and org info.
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;

    const user = await userService.getById(userId, organizationId);

    sendOk(res, { user }, "User retrieved");
  }),

  /**
   * PATCH /api/v1/users/:userId
   *
   * Update a user's profile, roles, status, team.
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const user = await userService.updateByAdmin(userId, organizationId, req.body, updatedBy);

    sendOk(res, { user }, "User updated");
  }),

  /**
   * DELETE /api/v1/users/:userId
   *
   * Soft-delete a user.
   */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    await userService.softDelete(userId, organizationId, deletedBy);

    sendNoContent(res);
  }),

  // ─── Suspend / Unsuspend ───────────────────────────

  /**
   * POST /api/v1/users/:userId/suspend
   *
   * Suspend a user account.
   */
  suspend: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const suspendedBy = req.user!.id;

    const user = await userService.suspend(userId, organizationId, req.body, suspendedBy);

    sendOk(res, { user }, "User suspended");
  }),

  /**
   * POST /api/v1/users/:userId/unsuspend
   *
   * Unsuspend a user account.
   */
  unsuspend: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const unsuspendedBy = req.user!.id;

    const user = await userService.unsuspend(userId, organizationId, unsuspendedBy);

    sendOk(res, { user }, "User unsuspended");
  }),

  // ─── Role Management ───────────────────────────────

  /**
   * PUT /api/v1/users/:userId/roles
   *
   * Replace all roles for a user.
   */
  assignRoles: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const assignedBy = req.user!.id;

    await userService.assignRoles(userId, organizationId, req.body.roleIds, assignedBy);

    sendOk(res, null, "Roles assigned successfully");
  }),

  /**
   * GET /api/v1/users/:userId/roles
   *
   * Get a user's current roles.
   */
  getRoles: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;

    const user = await userService.getById(userId, organizationId);

    sendOk(res, { roles: user.roles }, "Roles retrieved");
  }),

  /**
   * GET /api/v1/users/roles/available
   *
   * List all available roles in the organization.
   */
  availableRoles: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const roles = await userService.getAvailableRoles(organizationId);
    sendOk(res, { roles }, "Available roles retrieved");
  }),

  // ─── Password Reset ────────────────────────────────

  /**
   * POST /api/v1/users/:userId/reset-password
   *
   * Admin reset a user's password.
   */
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const resetBy = req.user!.id;

    const result = await userService.adminResetPassword(userId, organizationId, req.body, resetBy);

    sendOk(res, result, "Password reset successfully");
  }),

  // ─── Activity Logs ─────────────────────────────────

  /**
   * GET /api/v1/users/:userId/activity
   *
   * Get a user's activity/audit logs.
   */
  activityLogs: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;
    const { page, limit, action, entityType, dateFrom, dateTo } = req.query;

    const result = await userService.getActivityLogs(userId, organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      action: action as string | undefined,
      entityType: entityType as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    sendPaginated(
      res,
      result.items,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Activity logs retrieved"
    );
  }),

  /**
   * GET /api/v1/users/:userId/activity/summary
   *
   * Get a user's activity summary (last 30 days).
   */
  activitySummary: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId;

    const summary = await userService.getActivitySummary(organizationId, userId);

    sendOk(res, { summary }, "Activity summary retrieved");
  }),

  // ─── Bulk Operations ───────────────────────────────

  /**
   * POST /api/v1/users/invite
   *
   * Invite a new user via email.
   */
  invite: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const user = await userService.createByAdmin(organizationId, req.body, createdBy);

    sendCreated(res, { user }, "User invited successfully");
  }),

  /**
   * POST /api/v1/users/bulk/activate
   *
   * Activate multiple users.
   */
  bulkActivate: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const result = await userService.bulkActivate(req.body.userIds, organizationId, updatedBy);

    sendOk(res, result, `${result.count} users activated`);
  }),

  /**
   * POST /api/v1/users/bulk/deactivate
   *
   * Deactivate multiple users.
   */
  bulkDeactivate: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const result = await userService.bulkDeactivate(req.body.userIds, organizationId, updatedBy);

    sendOk(res, result, `${result.count} users deactivated`);
  }),

  /**
   * POST /api/v1/users/bulk/delete
   *
   * Soft-delete multiple users.
   */
  bulkDelete: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    const result = await userService.bulkDelete(req.body.userIds, organizationId, deletedBy);

    sendOk(res, result, `${result.count} users deleted`);
  }),

  /**
   * POST /api/v1/users/bulk/assign-role
   *
   * Assign a role to multiple users.
   */
  bulkAssignRole: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const assignedBy = req.user!.id;

    const result = await userService.bulkAssignRole(
      req.body.userIds,
      req.body.roleId,
      organizationId,
      assignedBy
    );

    sendOk(res, result, `Role assigned to ${result.count} users`);
  }),

  /**
   * POST /api/v1/users/bulk/change-team
   *
   * Change team for multiple users.
   */
  bulkChangeTeam: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const result = await userService.bulkChangeTeam(
      req.body.userIds,
      req.body.teamId,
      organizationId,
      updatedBy
    );

    sendOk(res, result, `Team changed for ${result.count} users`);
  }),

  // ─── Team Management ───────────────────────────────

  /**
   * POST /api/v1/users/teams
   *
   * Create a new team.
   */
  createTeam: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;

    const team = await teamRepository.create({ ...req.body, organizationId });

    sendCreated(res, { team }, "Team created");
  }),

  /**
   * GET /api/v1/users/teams
   *
   * List all teams.
   */
  listTeams: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const teams = await teamRepository.findMany(organizationId);
    sendOk(res, { teams }, "Teams retrieved");
  }),

  /**
   * GET /api/v1/users/teams/:teamId
   *
   * Get a team with its members.
   */
  getTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const team = await teamRepository.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }
    sendOk(res, { team }, "Team retrieved");
  }),

  /**
   * PATCH /api/v1/users/teams/:teamId
   *
   * Update a team.
   */
  updateTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const team = await teamRepository.update(teamId, req.body);
    sendOk(res, { team }, "Team updated");
  }),

  /**
   * DELETE /api/v1/users/teams/:teamId
   *
   * Soft-delete a team.
   */
  deleteTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    await teamRepository.softDelete(teamId);
    sendNoContent(res);
  }),

  /**
   * POST /api/v1/users/teams/:teamId/members
   *
   * Add a member to a team.
   */
  addTeamMember: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    await teamRepository.addMember(teamId, req.body.userId);
    sendOk(res, null, "Member added to team");
  }),

  /**
   * DELETE /api/v1/users/teams/:teamId/members/:userId
   *
   * Remove a member from a team.
   */
  removeTeamMember: asyncHandler(async (req: Request, res: Response) => {
    const { teamId, userId } = req.params;
    await teamRepository.removeMember(teamId, userId);
    sendNoContent(res);
  }),

  // ─── Organization Activity ─────────────────────────

  /**
   * GET /api/v1/users/activity/organization
   *
   * Get organization-wide activity summary.
   */
  organizationActivity: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const summary = await auditLogRepository.getOrganizationActivitySummary(organizationId);
    sendOk(res, { summary }, "Organization activity retrieved");
  }),
};
