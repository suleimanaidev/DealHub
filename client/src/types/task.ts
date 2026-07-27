export interface Task {
  id: string;
  organizationId: string;
  taskType: string;
  reminderAt?: string;
  reminderSent: boolean;
  completedBy?: string;
  recurrenceRule?: string;
  createdAt: string;
  updatedAt: string;
  activity: TaskActivity;
  completer?: { id: string; firstName: string; lastName: string };
}

export interface TaskActivity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  assignedTo?: string;
  createdBy: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  creator: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  lead?: { id: string; firstName: string; lastName: string };
  customer?: { id: string; firstName?: string; lastName?: string; name?: string };
  deal?: { id: string; title: string; amount?: number };
  notes?: TaskNote[];
}

export interface TaskNote {
  id: string;
  content: string;
  createdAt: string;
  createdByUser?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  completionRate: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  taskType?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdueOnly?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateTaskInput {
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedToId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  taskType?: string;
  reminderAt?: string;
  recurrenceRule?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export interface ApiResponse<T = unknown> {
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
