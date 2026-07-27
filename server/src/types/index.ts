import {
  User,
  Organization,
  Lead,
  Customer,
  Deal,
  Contact,
  Activity,
  Task,
  Meeting,
  Call,
  Note,
  Pipeline,
  PipelineStage,
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuditLog,
  Session,
  Setting,
  Team,
  Campaign,
  FileAttachment,
  EmailVerificationToken,
  PasswordResetToken,
  InvitationToken,
} from "@prisma/client";

// ─── Re-export Prisma Types ───────────────────────────

export type {
  User,
  Organization,
  Lead,
  Customer,
  Deal,
  Contact,
  Activity,
  Task,
  Meeting,
  Call,
  Note,
  Pipeline,
  PipelineStage,
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuditLog,
  Session,
  Setting,
  Team,
  Campaign,
  FileAttachment,
  EmailVerificationToken,
  PasswordResetToken,
  InvitationToken,
};

// ─── Auth Types ────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isOwner: boolean;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── API Response Types ────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ─── Query Types ───────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DateRangeQuery {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface LeadQuery extends SearchQuery, SortQuery, DateRangeQuery {
  status?: string;
  rating?: string;
  assignedToId?: string;
  teamId?: string;
  source?: string;
}

export interface CustomerQuery extends SearchQuery, SortQuery {
  status?: string;
  tier?: string;
  assignedToId?: string;
  teamId?: string;
}

export interface DealQuery extends SearchQuery, SortQuery, DateRangeQuery {
  status?: string;
  stageId?: string;
  pipelineId?: string;
  assignedToId?: string;
  teamId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ActivityQuery extends PaginationQuery, SortQuery, DateRangeQuery {
  type?: "task" | "meeting" | "call";
  status?: string;
  priority?: string;
  assignedToId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

// ─── Stats Types ───────────────────────────────────────

export interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalDeals: number;
  pipelineValue: number;
  wonDeals: number;
  wonValue: number;
  conversionRate: number;
  overdueActivities: number;
}

export interface PipelineStats {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineValue: number;
  wonValue: number;
  winRate: number;
  byStage: {
    stageId: string;
    count: number;
    value: number;
  }[];
  byStatus: {
    status: string;
    count: number;
    value: number;
  }[];
}

export interface LeadStats {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  byRating: { rating: string; count: number }[];
}

export interface ActivityStats {
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  completionRate: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  byTier: { tier: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

// ─── User Types ────────────────────────────────────────

export interface UserProfile extends User {
  roles?: (UserRole & { role: Role })[];
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export interface UserListItem extends User {
  roles?: (UserRole & { role: Role })[];
  _count?: {
    activities: number;
    assignedLeads: number;
    assignedDeals: number;
  };
}

// ─── Pipeline Types ────────────────────────────────────

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
  _count?: {
    deals: number;
  };
}

export interface StageWithStats extends PipelineStage {
  dealCount: number;
  totalValue: number;
}
