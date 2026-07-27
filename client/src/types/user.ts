// ─── User Types ────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  isActive: boolean;
  isOwner: boolean;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRoles extends User {
  roles: UserRole[];
  team?: { id: string; name: string } | null;
  organization?: { id: string; name: string; slug: string };
}

export interface UserRole {
  roleId: string;
  role: Role;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  organizationId: string;
  permissions?: RolePermission[];
  _count?: { users: number };
}

export interface RolePermission {
  permissionId: string;
  scope: string;
  permission: {
    id: string;
    resource: string;
    action: string;
  };
}

// ─── Team Types ────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  managerId?: string | null;
  createdAt: string;
  manager?: { id: string; firstName: string; lastName: string };
  members?: User[];
  _count?: { members: number };
}

// ─── Audit Log Types ───────────────────────────────────

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
}

export interface ActivitySummary {
  totalActions: number;
  byAction: { action: string; count: number }[];
  recentActivity: AuditLog[];
  lastActivityAt: string | null;
}

// ─── API Response Types ────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string; code?: string }[];
  };
}

// ─── User Stats ────────────────────────────────────────

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  newLast30Days: number;
  newLast7Days: number;
  byTeam: { teamId: string | null; teamName: string; count: number }[];
  byRole: { roleId: string; roleName: string; count: number }[];
}

// ─── Query Types ───────────────────────────────────────

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  teamId?: string;
  roleId?: string;
  isSuspended?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Form Types ────────────────────────────────────────

export interface CreateUserInput {
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

export interface SuspendUserInput {
  reason: string;
  suspendedUntil?: string;
}

export interface ResetPasswordInput {
  newPassword?: string;
  sendEmail: boolean;
}

export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}
