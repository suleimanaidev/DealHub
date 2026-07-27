// ─── HTTP Status Codes ──────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── Pagination ─────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ─── Lead Statuses ──────────────────────────────────────

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  UNQUALIFIED: "unqualified",
  CONVERTED: "converted",
  LOST: "lost",
} as const;

// ─── Customer Statuses ──────────────────────────────────

export const CUSTOMER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  CHURNED: "churned",
} as const;

// ─── Activity Types ─────────────────────────────────────

export const ACTIVITY_TYPE = {
  TASK: "task",
  MEETING: "meeting",
  CALL: "call",
  NOTE: "note",
  EMAIL: "email",
  STATUS_CHANGE: "status_change",
  SYSTEM: "system",
} as const;

// ─── Activity Statuses ──────────────────────────────────

export const ACTIVITY_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// ─── Priority Levels ────────────────────────────────────

export const PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

// ─── Invoice Statuses ───────────────────────────────────

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

// ─── Payment Statuses ───────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

// ─── Payment Methods ────────────────────────────────────

export const PAYMENT_METHOD = {
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  BANK_TRANSFER: "bank_transfer",
  PAYPAL: "paypal",
  STRIPE: "stripe",
  CASH: "cash",
  CHECK: "check",
  OTHER: "other",
} as const;

// ─── Call Outcomes ──────────────────────────────────────

export const CALL_OUTCOME = {
  CONNECTED: "connected",
  VOICEMAIL: "voicemail",
  NO_ANSWER: "no_answer",
  BUSY: "busy",
  WRONG_NUMBER: "wrong_number",
  CANCELLED: "cancelled",
} as const;

// ─── Notification Types ─────────────────────────────────

export const NOTIFICATION_TYPE = {
  LEAD_ASSIGNED: "lead_assigned",
  DEAL_CREATED: "deal_created",
  DEAL_STAGE_CHANGED: "deal_stage_changed",
  TASK_ASSIGNED: "task_assigned",
  TASK_DUE: "task_due",
  MEETING_SCHEDULED: "meeting_scheduled",
  MENTION: "mention",
  INVITATION: "invitation",
  SYSTEM: "system",
} as const;

// ─── Audit Actions ──────────────────────────────────────

export const AUDIT_ACTION = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  FAILED_LOGIN: "failed_login",
  PASSWORD_CHANGE: "password_change",
  EXPORT: "export",
  IMPORT: "import",
  CONVERT: "convert",
  ASSIGN: "assign",
} as const;

// ─── RBAC Scopes ────────────────────────────────────────

export const RBAC_SCOPE = {
  OWN: "own",
  TEAM: "team",
  ORG: "org",
  ALL: "all",
} as const;

// ─── File Upload ────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/csv",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Organization Sizes ─────────────────────────────────

export const ORG_SIZE = {
  "1_10": "1-10",
  "11_50": "11-50",
  "51_200": "51-200",
  "201_500": "201-500",
  "501_1000": "501-1000",
  "1000_PLUS": "1000+",
} as const;

// ─── Plans ──────────────────────────────────────────────

export const PLAN = {
  FREE: "free",
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

// ─── Task Types ─────────────────────────────────────────

export const TASK_TYPE = {
  GENERAL: "general",
  FOLLOW_UP: "follow_up",
  PREPARATION: "preparation",
  RESEARCH: "research",
  OUTREACH: "outreach",
  OTHER: "other",
} as const;

// ─── Email Template Categories ──────────────────────────

export const EMAIL_CATEGORY = {
  GENERAL: "general",
  SALES: "sales",
  MARKETING: "marketing",
  SUPPORT: "support",
  TRANSACTIONAL: "transactional",
} as const;

// ─── Report Types ───────────────────────────────────────

export const REPORT_TYPE = {
  PIPELINE: "pipeline",
  REVENUE: "revenue",
  LEAD: "lead",
  ACTIVITY: "activity",
  TEAM: "team",
  CUSTOM: "custom",
} as const;

// ─── Lost Reason Categories ─────────────────────────────

export const LOST_REASON = {
  PRICE: "price",
  COMPETITOR: "competitor",
  NO_BUDGET: "no_budget",
  NO_DECISION_MAKER: "no_decision_maker",
  TIMING: "timing",
  PRODUCT_FIT: "product_fit",
  OTHER: "other",
} as const;
