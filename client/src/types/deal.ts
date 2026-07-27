export interface Deal {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stageId: string;
  pipelineId: string;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  customerId?: string;
  contactId?: string;
  leadId?: string;
  assignedTo?: string;
  createdBy: string;
  winReason?: string;
  lossReason?: string;
  lostReasonCategory?: string;
  customFields: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  customer?: { id: string; name?: string; firstName?: string; lastName?: string; companyName?: string };
  assignedUser?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  stage?: { id: string; name: string; position?: number };
  pipeline?: { id: string; name: string };
}

export interface Pipeline {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  currency: string;
  stages: PipelineStage[];
  _count?: { deals: number };
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  key: string;
  probability: number;
  sortOrder: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

export interface KanbanStage extends PipelineStage {
  deals: Deal[];
  totalValue: number;
}

export interface DealStats {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  pipelineValue: number;
  wonValue: number;
  byStage: { stageId: string; count: number; value: number }[];
  byStatus: { status: string; count: number; value: number }[];
}

export interface RevenueForecast {
  currentMonth: { deals: Deal[]; totalValue: number };
  nextMonth: { deals: Deal[]; totalValue: number };
  weightedPipeline: number;
}

export interface DealTimelineEntry {
  id: string;
  type: string;
  action: string;
  content: string;
  user: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface DealListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  stageId?: string;
  pipelineId?: string;
  assignedToId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateDealInput {
  title: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  assignedToId?: string;
  amount: number;
  currency?: string;
  expectedCloseDate?: string;
  probability?: number;
  description?: string;
  tags?: string[];
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  status?: string;
  lostReason?: string;
  wonReason?: string;
  actualCloseDate?: string;
}
