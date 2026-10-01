import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendBadRequest } from "../utils/response";

// ─── Validate Request Body ─────────────────────────────

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse({ body: req.body }).body;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        sendBadRequest(res, "Validation failed", formattedErrors);
        return;
      }
      next(error);
    }
  };
}

// ─── Validate Request Query Params ─────────────────────

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse({ query: req.query }).query as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        sendBadRequest(res, "Invalid query parameters", formattedErrors);
        return;
      }
      next(error);
    }
  };
}

// ─── Validate Request Params ───────────────────────────

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        sendBadRequest(res, "Invalid path parameters", formattedErrors);
        return;
      }
      next(error);
    }
  };
}

// ─── Common Param Validators ───────────────────────────

import { z } from "zod";

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(255),
});
