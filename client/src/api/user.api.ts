import { apiClient } from "./client";
import type {
  User,
  UserWithRoles,
  Role,
  Team,
  AuditLog,
  UserStats,
  ActivitySummary,
  UserListParams,
  CreateUserInput,
  UpdateUserInput,
  SuspendUserInput,
  ResetPasswordInput,
  InviteUserInput,
  PaginatedResponse,
  ApiResponse,
} from "../types/user";

// ─── User API ──────────────────────────────────────────

export const userApi = {
  // ─── Profile ────────────────────────────────────────

  async getMe(): Promise<ApiResponse<{ user: UserWithRoles }>> {
    const { data } = await apiClient.get("/users/me");
    return data;
  },

  async updateMe(input: Partial<UpdateUserInput>): Promise<ApiResponse<{ user: User }>> {
    const { data } = await apiClient.patch("/users/me", input);
    return data;
  },

  // ─── List & Stats ───────────────────────────────────

  async list(params: UserListParams = {}): Promise<PaginatedResponse<UserWithRoles>> {
    const { data } = await apiClient.get("/users", { params });
    return data;
  },

  async getById(userId: string): Promise<ApiResponse<{ user: UserWithRoles }>> {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data;
  },

  async getStats(): Promise<ApiResponse<{ stats: UserStats }>> {
    const { data } = await apiClient.get("/users/stats");
    return data;
  },

  // ─── CRUD ───────────────────────────────────────────

  async create(input: CreateUserInput): Promise<ApiResponse<{ user: User }>> {
    const { data } = await apiClient.post("/users", input);
    return data;
  },

  async update(userId: string, input: UpdateUserInput): Promise<ApiResponse<{ user: UserWithRoles }>> {
    const { data } = await apiClient.patch(`/users/${userId}`, input);
    return data;
  },

  async remove(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  },

  async invite(input: InviteUserInput): Promise<ApiResponse<{ userId: string; message: string }>> {
    const { data } = await apiClient.post("/users/invite", input);
    return data;
  },

  // ─── Suspend / Unsuspend ────────────────────────────

  async suspend(userId: string, input: SuspendUserInput): Promise<ApiResponse<{ user: User }>> {
    const { data } = await apiClient.post(`/users/${userId}/suspend`, input);
    return data;
  },

  async unsuspend(userId: string): Promise<ApiResponse<{ user: User }>> {
    const { data } = await apiClient.post(`/users/${userId}/unsuspend`);
    return data;
  },

  // ─── Roles ──────────────────────────────────────────

  async getRoles(userId: string): Promise<ApiResponse<{ roles: UserWithRoles["roles"] }>> {
    const { data } = await apiClient.get(`/users/${userId}/roles`);
    return data;
  },

  async assignRoles(userId: string, roleIds: string[]): Promise<ApiResponse<null>> {
    const { data } = await apiClient.put(`/users/${userId}/roles`, { roleIds });
    return data;
  },

  async getAvailableRoles(): Promise<ApiResponse<{ roles: Role[] }>> {
    const { data } = await apiClient.get("/users/roles/available");
    return data;
  },

  // ─── Password Reset ─────────────────────────────────

  async resetPassword(
    userId: string,
    input: ResetPasswordInput
  ): Promise<ApiResponse<{ tempPassword?: string }>> {
    const { data } = await apiClient.post(`/users/${userId}/reset-password`, input);
    return data;
  },

  // ─── Activity Logs ──────────────────────────────────

  async getActivityLogs(
    userId: string,
    params: { page?: number; limit?: number; action?: string; entityType?: string } = {}
  ): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await apiClient.get(`/users/${userId}/activity`, { params });
    return data;
  },

  async getActivitySummary(userId: string): Promise<ApiResponse<{ summary: ActivitySummary }>> {
    const { data } = await apiClient.get(`/users/${userId}/activity/summary`);
    return data;
  },

  async getOrganizationActivity(): Promise<
    ApiResponse<{
      summary: {
        last24h: number;
        last7d: number;
        byAction: { action: string; count: number }[];
        activeUserCount: number;
        recentActivity: AuditLog[];
      };
    }>
  > {
    const { data } = await apiClient.get("/users/activity/organization");
    return data;
  },

  // ─── Bulk Operations ────────────────────────────────

  async bulkActivate(userIds: string[]): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/users/bulk/activate", { userIds });
    return data;
  },

  async bulkDeactivate(userIds: string[]): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/users/bulk/deactivate", { userIds });
    return data;
  },

  async bulkDelete(userIds: string[]): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/users/bulk/delete", { userIds });
    return data;
  },

  async bulkAssignRole(userIds: string[], roleId: string): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/users/bulk/assign-role", { userIds, roleId });
    return data;
  },

  async bulkChangeTeam(userIds: string[], teamId: string | null): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/users/bulk/change-team", { userIds, teamId });
    return data;
  },

  // ─── Teams ──────────────────────────────────────────

  async listTeams(): Promise<ApiResponse<{ teams: Team[] }>> {
    const { data } = await apiClient.get("/users/teams");
    return data;
  },

  async getTeam(teamId: string): Promise<ApiResponse<{ team: Team }>> {
    const { data } = await apiClient.get(`/users/teams/${teamId}`);
    return data;
  },

  async createTeam(input: { name: string; description?: string; managerId?: string }): Promise<
    ApiResponse<{ team: Team }>
  > {
    const { data } = await apiClient.post("/users/teams", input);
    return data;
  },

  async updateTeam(
    teamId: string,
    input: { name?: string; description?: string; managerId?: string | null }
  ): Promise<ApiResponse<{ team: Team }>> {
    const { data } = await apiClient.patch(`/users/teams/${teamId}`, input);
    return data;
  },

  async deleteTeam(teamId: string): Promise<void> {
    await apiClient.delete(`/users/teams/${teamId}`);
  },

  async addTeamMember(teamId: string, userId: string): Promise<ApiResponse<null>> {
    const { data } = await apiClient.post(`/users/teams/${teamId}/members`, { userId });
    return data;
  },

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await apiClient.delete(`/users/teams/${teamId}/members/${userId}`);
  },
};
