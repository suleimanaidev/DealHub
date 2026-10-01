export interface Lead {
  id: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  sourceId?: string;
  status: string;
  score: number;
  assignedTo?: string | {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string;
  };
  createdBy: string;
  convertedAt?: string;
  convertedCustomerId?: string;
  convertedDealId?: string;
  customFields: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  source?: {
    id: string;
    name: string;
    color?: string;
  };
  _count?: {
    notes: number;
    activities: number;
    attachments: number;
  };
}

export interface LeadWithDetails extends Lead {
  notes: Note[];
  activities: Activity[];
  attachments: Attachment[];
  auditLogs: AuditLogEntry[];
}

export interface LeadStats {
  totalLeads: number;
  convertedLeads: number;
  unassignedLeads: number;
  conversionRate: number;
  totalPipelineValue: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  byRating: { rating: string; count: number }[];
}

export interface LeadTimelineEntry {
  id: string;
  type: "note" | "activity" | "audit";
  action: string;
  content: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl?: string } | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  createdBy: string;
  createdByUser?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  assignee?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  user?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdAt: string;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  rating?: string;
  assignedToId?: string;
  teamId?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateLeadInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  source?: string;
  campaignId?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  rating?: string;
  estimatedValue?: number;
  description?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {}

export interface ConvertLeadInput {
  firstName: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  createDeal?: boolean;
  dealTitle?: string;
  dealAmount?: number;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}
