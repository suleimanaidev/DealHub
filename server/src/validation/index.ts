import { z } from "zod";

// ─── Common Schemas ────────────────────────────────────

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const emailSchema = z.string().email("Invalid email address").toLowerCase().trim();

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const dateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

// ─── Common Password Schema ─────────────────────────────

const strongPassword = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character");

// ─── Auth Schemas ──────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: strongPassword,
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    organizationName: z.string().min(1, "Organization name is required").max(255),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    password: strongPassword,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

// ─── User Schemas ──────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    dateFormat: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    roleIds: z.array(uuidSchema).optional(),
    teamId: uuidSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    email: emailSchema,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    roleIds: z.array(uuidSchema).optional(),
  }),
});

export const listUsersSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    teamId: uuidSchema.optional(),
    roleId: uuidSchema.optional(),
    isSuspended: z.coerce.boolean().optional(),
    lastLoginFrom: z.coerce.date().optional(),
    lastLoginTo: z.coerce.date().optional(),
    sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "lastLoginAt", "isActive"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: strongPassword,
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    phone: z.string().optional(),
    jobTitle: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    teamId: uuidSchema.optional(),
    roleIds: z.array(uuidSchema).optional(),
  }),
});

export const suspendUserSchema = z.object({
  body: z.object({
    reason: z.string().min(1, "Reason is required").max(500),
    suspendedUntil: z.coerce.date().optional(),
  }),
});

export const resetUserPasswordSchema = z.object({
  body: z.object({
    newPassword: strongPassword.optional(),
    sendEmail: z.boolean().default(false),
  }),
});

export const assignRolesSchema = z.object({
  body: z.object({
    roleIds: z.array(uuidSchema).min(1, "At least one role is required"),
  }),
});

export const bulkUserIdsSchema = z.object({
  body: z.object({
    userIds: z.array(uuidSchema).min(1, "At least one user is required").max(100),
  }),
});

export const bulkAssignRoleSchema = z.object({
  body: z.object({
    userIds: z.array(uuidSchema).min(1).max(100),
    roleId: uuidSchema,
  }),
});

export const bulkChangeTeamSchema = z.object({
  body: z.object({
    userIds: z.array(uuidSchema).min(1).max(100),
    teamId: uuidSchema.nullable(),
  }),
});

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Team name is required").max(255),
    description: z.string().max(1000).optional(),
    managerId: uuidSchema.optional(),
  }),
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    managerId: uuidSchema.nullable().optional(),
  }),
});

// ─── Lead Schemas ──────────────────────────────────────

export const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().max(100).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    companyName: z.string().max(255).optional(),
    jobTitle: z.string().max(100).optional(),
    source: z.string().optional(),
    campaignId: uuidSchema.optional(),
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    status: z.enum(["new", "contacted", "qualified", "unqualified"]).default("new"),
    rating: z.enum(["hot", "warm", "cold"]).optional(),
    estimatedValue: z.number().min(0).optional(),
    description: z.string().optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({
    leadId: uuidSchema,
  }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    companyName: z.string().max(255).optional(),
    jobTitle: z.string().max(100).optional(),
    source: z.string().optional(),
    assignedToId: uuidSchema.nullable().optional(),
    teamId: uuidSchema.nullable().optional(),
    status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
    rating: z.enum(["hot", "warm", "cold"]).optional(),
    estimatedValue: z.number().min(0).optional(),
    description: z.string().optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const listLeadsSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    status: z.string().optional(),
    rating: z.string().optional(),
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    source: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "estimatedValue"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});

export const convertLeadSchema = z.object({
  params: z.object({
    leadId: uuidSchema,
  }),
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    email: emailSchema.optional(),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    createDeal: z.boolean().default(false),
    dealTitle: z.string().optional(),
    dealAmount: z.number().min(0).optional(),
  }),
});

export const bulkLeadSchema = z.object({
  body: z.object({
    leadIds: z.array(uuidSchema).min(1).max(100),
  }),
});

export const bulkAssignLeadSchema = z.object({
  body: z.object({
    leadIds: z.array(uuidSchema).min(1).max(100),
    assignedToId: uuidSchema,
  }),
});

export const bulkUpdateLeadStatusSchema = z.object({
  body: z.object({
    leadIds: z.array(uuidSchema).min(1).max(100),
    status: z.enum(["new", "contacted", "qualified", "unqualified"]),
  }),
});

// ─── Customer Schemas ──────────────────────────────────

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Customer name is required").max(255),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    companyName: z.string().max(255).optional(),
    industry: z.string().optional(),
    website: z.string().url().optional(),
    annualRevenue: z.number().min(0).optional(),
    numberOfEmployees: z.number().int().min(0).optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    status: z.enum(["active", "inactive", "churned"]).default("active"),
    tier: z.enum(["enterprise", "mid_market", "smb", "freelancer"]).optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    customerId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    companyName: z.string().max(255).optional(),
    industry: z.string().optional(),
    website: z.string().url().optional(),
    annualRevenue: z.number().min(0).optional(),
    numberOfEmployees: z.number().int().min(0).optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    assignedToId: uuidSchema.nullable().optional(),
    teamId: uuidSchema.nullable().optional(),
    status: z.enum(["active", "inactive", "churned"]).optional(),
    tier: z.enum(["enterprise", "mid_market", "smb", "freelancer"]).optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const listCustomersSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    status: z.string().optional(),
    tier: z.string().optional(),
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});

// ─── Deal Schemas ──────────────────────────────────────

export const createDealSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Deal title is required").max(255),
    customerId: uuidSchema,
    pipelineId: uuidSchema,
    stageId: uuidSchema,
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    amount: z.number().min(0, "Amount must be positive"),
    currency: z.string().length(3).default("USD"),
    expectedCloseDate: z.coerce.date().optional(),
    probability: z.number().min(0).max(100).optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const updateDealSchema = z.object({
  params: z.object({
    dealId: uuidSchema,
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    stageId: uuidSchema.optional(),
    assignedToId: uuidSchema.nullable().optional(),
    teamId: uuidSchema.nullable().optional(),
    amount: z.number().min(0).optional(),
    expectedCloseDate: z.coerce.date().optional(),
    actualCloseDate: z.coerce.date().optional(),
    probability: z.number().min(0).max(100).optional(),
    status: z.enum(["open", "won", "lost"]).optional(),
    lostReason: z.string().optional(),
    wonReason: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const listDealsSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    status: z.string().optional(),
    stageId: uuidSchema.optional(),
    pipelineId: uuidSchema.optional(),
    assignedToId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    minAmount: z.coerce.number().optional(),
    maxAmount: z.coerce.number().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z.enum(["title", "amount", "expectedCloseDate", "createdAt"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});

// ─── Activity Schemas ──────────────────────────────────

export const createActivitySchema = z.object({
  body: z.object({
    type: z.enum(["task", "meeting", "call"]),
    subject: z.string().min(1, "Subject is required").max(255),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    assignedToId: uuidSchema.optional(),
    leadId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    dealId: uuidSchema.optional(),
    contactId: uuidSchema.optional(),
    dueDate: z.coerce.date().optional(),
    // Task-specific
    taskType: z.string().optional(),
    // Meeting-specific
    meetingDate: z.coerce.date().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    location: z.string().optional(),
    isVirtual: z.boolean().optional(),
    meetingUrl: z.string().url().optional(),
    attendees: z.array(z.string()).optional(),
    // Call-specific
    callDate: z.coerce.date().optional(),
    callDuration: z.number().int().min(0).optional(),
    callOutcome: z.string().optional(),
    callNotes: z.string().optional(),
  }),
});

export const updateActivitySchema = z.object({
  params: z.object({
    activityId: uuidSchema,
  }),
  body: z.object({
    subject: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedToId: uuidSchema.nullable().optional(),
    dueDate: z.coerce.date().optional(),
    taskType: z.string().optional(),
    meetingDate: z.coerce.date().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    location: z.string().optional(),
    isVirtual: z.boolean().optional(),
    meetingUrl: z.string().url().optional(),
    attendees: z.array(z.string()).optional(),
    callDate: z.coerce.date().optional(),
    callDuration: z.number().int().min(0).optional(),
    callOutcome: z.string().optional(),
    callNotes: z.string().optional(),
  }),
});

export const listActivitiesSchema = z.object({
  query: paginationSchema.extend({
    type: z.enum(["task", "meeting", "call"]).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToId: uuidSchema.optional(),
    leadId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    dealId: uuidSchema.optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z.enum(["subject", "dueDate", "createdAt", "priority"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});

// ─── Contact Schemas ───────────────────────────────────

export const createContactSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    mobilePhone: z.string().optional(),
    jobTitle: z.string().max(100).optional(),
    department: z.string().optional(),
    customerId: uuidSchema,
    isPrimary: z.boolean().optional(),
    preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

export const updateContactSchema = z.object({
  params: z.object({
    contactId: uuidSchema,
  }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: emailSchema.optional(),
    phone: z.string().optional(),
    mobilePhone: z.string().optional(),
    jobTitle: z.string().max(100).optional(),
    department: z.string().optional(),
    isPrimary: z.boolean().optional(),
    preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
});

// ─── Note Schemas ──────────────────────────────────────

export const createNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Note content is required"),
    entityType: z.enum(["lead", "customer", "deal", "contact", "activity"]),
    entityId: uuidSchema,
    isPinned: z.boolean().optional(),
  }),
});

export const updateNoteSchema = z.object({
  params: z.object({
    noteId: uuidSchema,
  }),
  body: z.object({
    content: z.string().min(1).optional(),
    isPinned: z.boolean().optional(),
  }),
});

// ─── Pipeline Schemas ──────────────────────────────────

export const createPipelineSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Pipeline name is required").max(255),
    description: z.string().optional(),
    isDefault: z.boolean().optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const createStageSchema = z.object({
  params: z.object({
    pipelineId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    position: z.number().int().min(0),
    color: z.string().optional(),
    probability: z.number().min(0).max(100).optional(),
    stageType: z.string().optional(),
    rotDays: z.number().int().min(0).optional(),
    rotAction: z.string().optional(),
    autoAssignUserId: uuidSchema.optional(),
  }),
});

export const reorderStagesSchema = z.object({
  params: z.object({
    pipelineId: uuidSchema,
  }),
  body: z.object({
    stageIds: z.array(uuidSchema).min(1),
  }),
});

// ─── Settings Schemas ──────────────────────────────────

export const updateSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]),
    description: z.string().optional(),
  }),
});

export const getSettingSchema = z.object({
  params: z.object({
    key: z.string().min(1),
  }),
});

// ─── Task Schemas ─────────────────────────────────────

export const createTaskSchema = z.object({
  body: z.object({
    subject: z.string().min(1, "Subject is required").max(255),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    dueDate: z.coerce.date().optional(),
    assignedToId: uuidSchema.optional(),
    leadId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    dealId: uuidSchema.optional(),
    contactId: uuidSchema.optional(),
    taskType: z.string().max(50).default("general"),
    reminderAt: z.coerce.date().optional(),
    recurrenceRule: z.string().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    taskId: uuidSchema,
  }),
  body: z.object({
    subject: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.coerce.date().optional().nullable(),
    assignedToId: uuidSchema.nullable().optional(),
    leadId: uuidSchema.nullable().optional(),
    customerId: uuidSchema.nullable().optional(),
    dealId: uuidSchema.nullable().optional(),
    contactId: uuidSchema.nullable().optional(),
    taskType: z.string().max(50).optional(),
    reminderAt: z.coerce.date().optional().nullable(),
    recurrenceRule: z.string().optional().nullable(),
  }),
});

export const listTasksSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToId: uuidSchema.optional(),
    taskType: z.string().optional(),
    leadId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    dealId: uuidSchema.optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    overdueOnly: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["subject", "dueDate", "priority", "createdAt"]).default("createdAt"),
    sortOrder: sortOrderSchema,
  }),
});
