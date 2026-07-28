import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/response";
import { sendError, sendInternalError, sendBadRequest, sendConflict } from "../utils/response";
import { HTTP_STATUS } from "../config/constants";
import { logger } from "../utils/logger";

// ─── Global Error Handler Middleware ────────────────────

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      req: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
    },
    "Unhandled error"
  );

  // ─── AppError (custom business errors) ───────────
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  // ─── Zod Validation Errors ───────────────────────
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));

    sendBadRequest(res, "Validation failed", formattedErrors);
    return;
  }

  // ─── Prisma Known Errors ─────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // ─── Prisma Validation Errors ────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ validationError: err.message }, "Prisma client validation error");
    sendBadRequest(res, "Database validation error", err.message);
    return;
  }

  // ─── JWT Errors ──────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    sendError(res, HTTP_STATUS.UNAUTHORIZED, "Invalid token", "INVALID_TOKEN");
    return;
  }

  if (err.name === "TokenExpiredError") {
    sendError(res, HTTP_STATUS.UNAUTHORIZED, "Token expired", "TOKEN_EXPIRED");
    return;
  }

  // ─── Syntax / JSON Parse Errors ──────────────────
  if (err instanceof SyntaxError && "body" in err) {
    sendBadRequest(res, "Invalid JSON in request body");
    return;
  }

  // ─── Multer File Upload Errors ───────────────────
  if (err.name === "MulterError") {
    const multerErr = err as { code: string; field?: string };
    if (multerErr.code === "LIMIT_FILE_SIZE") {
      sendBadRequest(res, "File size exceeds the 10MB limit");
      return;
    }
    if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
      sendBadRequest(res, `Unexpected file field: ${multerErr.field}`);
      return;
    }
    sendBadRequest(res, `File upload error: ${multerErr.code}`);
    return;
  }

  // ─── Unknown Errors ──────────────────────────────
  sendInternalError(res, err);
}

// ─── Prisma Error Handler ──────────────────────────────

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case "P2002": {
      // Unique constraint violation
      const target = (err.meta?.target as string[]) || [];
      const field = target.length > 0 ? target.join(", ") : "record";
      sendConflict(res, `A record with this ${field} already exists`, {
        fields: target,
      });
      break;
    }

    case "P2025": {
      // Record not found
      sendError(res, HTTP_STATUS.NOT_FOUND, "Record not found", "NOT_FOUND");
      break;
    }

    case "P2003": {
      // Foreign key constraint failed
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Referenced record does not exist",
        "FOREIGN_KEY_VIOLATION",
        { field: err.meta?.field_name }
      );
      break;
    }

    case "P2014": {
      // Required relation violation
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Required relation violation",
        "RELATION_VIOLATION",
        err.meta
      );
      break;
    }

    case "P2000": {
      // Value too long for column
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Value too long for column",
        "VALUE_TOO_LONG",
        { column: err.meta?.column_name }
      );
      break;
    }

    case "P2006": {
      // Invalid value for field
      sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid value for field",
        "INVALID_VALUE",
        err.meta
      );
      break;
    }

    default:
      logger.error({ prismaCode: err.code, prismaMessage: err.message }, "Unknown Prisma error");
      sendInternalError(res, err);
      break;
  }
}

// ─── 404 Handler ───────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, HTTP_STATUS.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND");
}
