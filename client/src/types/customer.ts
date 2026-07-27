export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  size?: string;
  annualRevenue?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  leadId?: string;
  assignedTo?: string;
  createdBy: string;
  status: string;
  customFields: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  assignedToUser?: { id: string; firstName: string; lastName: string; email?: string };
  _count?: { deals: number; activities: number; contacts: number };
}

export interface CustomerContact {
  id: string;
  customerId: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  isPrimary: boolean;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  birthday?: string;
  createdAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  byTier: { tier: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface CustomerTimelineEntry {
  id: string;
  type: string;
  action: string;
  content: string;
  user: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tier?: string;
  assignedToId?: string;
  teamId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  website?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  assignedToId?: string;
  teamId?: string;
  status?: string;
  tier?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}
