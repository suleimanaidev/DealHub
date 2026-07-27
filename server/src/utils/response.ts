import { Response } from "express";
import { HTTP_STATUS, PAGINATION } from "../config/constants";

// ─── Standard API Response Shape ────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

// ─── Success Responses ─────────────────────────────────

export function sendOk<T>(res: Response, data: T, message = "Success"): void {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
  } satisfies ApiResponse<T>);
}

export function sendCreated<T>(res: Response, data: T, message = "Created successfully"): void {
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message,
    data,
  } satisfies ApiResponse<T>);
}

export function sendNoContent(res: Response): void {
  res.status(HTTP_STATUS.NO_CONTENT).end();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message = "Success"
): void {
  const totalPages = Math.ceil(total / pageSize);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
    },
  } satisfies ApiResponse<T[]>);
}

// ─── Error Responses ───────────────────────────────────

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      message,
      details,
    },
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === "development" && details instanceof Error) {
    response.error!.stack = details.stack;
  }
  // Note: process.env used intentionally here to avoid circular import with env config

  res.status(statusCode).json(response);
}

export function sendBadRequest(res: Response, message: string, details?: unknown): void {
  sendError(res, HTTP_STATUS.BAD_REQUEST, message, "BAD_REQUEST", details);
}

export function sendUnauthorized(res: Response, message = "Unauthorized"): void {
  sendError(res, HTTP_STATUS.UNAUTHORIZED, message, "UNAUTHORIZED");
}

export function sendForbidden(res: Response, message = "Forbidden"): void {
  sendError(res, HTTP_STATUS.FORBIDDEN, message, "FORBIDDEN");
}

export function sendNotFound(res: ResourceNotFound): void {
  sendError(res.response, HTTP_STATUS.NOT_FOUND, res.message, "NOT_FOUND");
}

export function sendConflict(res: Response, message: string, details?: unknown): void {
  sendError(res, HTTP_STATUS.CONFLICT, message, "CONFLICT", details);
}

export function sendTooManyRequests(res: Response, message = "Too many requests"): void {
  sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, message, "RATE_LIMIT_EXCEEDED");
}

export function sendInternalError(res: Response, error?: Error): void {
  const message = "Internal server error";
  sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, message, "INTERNAL_ERROR", error);
}

// ─── Pagination Helper ─────────────────────────────────

export function parsePagination(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, parseInt(query.page || "", 10) || PAGINATION.DEFAULT_PAGE);
  const pageSize = Math.min(
    PAGINATION.MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.pageSize || "", 10) || PAGINATION.DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

// ─── Sort Helper ───────────────────────────────────────

export function parseSort(query: { sort?: string; order?: string }, allowedFields: string[]) {
  const field = allowedFields.includes(query.sort || "") ? query.sort! : "created_at";
  const direction = query.order?.toLowerCase() === "asc" ? "asc" : "desc";

  return { field, direction };
}

// ─── Search Helper ─────────────────────────────────────

export function parseSearch(query: { q?: string }): string | undefined {
  const q = query.q?.trim();
  return q && q.length > 0 ? q : undefined;
}

// ─── Filter Helper ─────────────────────────────────────

export function parseFilter(query: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  const filters: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (query[field] !== undefined && query[field] !== null && query[field] !== "") {
      const value = query[field];

      // Handle comma-separated values (IN queries)
      if (typeof value === "string" && value.includes(",")) {
        filters[field] = { in: value.split(",").map((v) => v.trim()) };
      } else {
        filters[field] = value;
      }
    }
  }

  return filters;
}

// ─── Date Range Helper ─────────────────────────────────

export function parseDateRange(query: { startDate?: string; endDate?: string }) {
  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;

  if (startDate && isNaN(startDate.getTime())) {
    throw new Error("Invalid startDate");
  }
  if (endDate && isNaN(endDate.getTime())) {
    throw new Error("Invalid endDate");
  }

  return { startDate, endDate };
}

// ─── Custom Error Classes ──────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier '${identifier}' not found` : `${resource} not found`;
    super(HTTP_STATUS.NOT_FOUND, "NOT_FOUND", msg);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(HTTP_STATUS.BAD_REQUEST, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(HTTP_STATUS.FORBIDDEN, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(HTTP_STATUS.CONFLICT, "CONFLICT", message, details);
    this.name = "ConflictError";
  }
}

interface ResourceNotFound {
  response: Response;
  message: string;
}
