import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// ─── Key generator: uses X-Forwarded-For or IP ─────────

function getKey(req: any): string {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
}

// ─── General API Rate Limiter ──────────────────────────

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  skip: (req: any) => {
    // Admins get higher limits (10x)
    if (req.user?.roles?.some((r: any) => r.role?.name === "super_admin" || r.role?.name === "admin")) {
      return true;
    }
    return false;
  },
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests",
    },
  },
});

// ─── Auth Rate Limiter (stricter) ──────────────────────

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts",
    },
  },
});

// ─── Upload Rate Limiter ───────────────────────────────

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: getKey,
  message: {
    success: false,
    message: "Too many file uploads. Please wait before uploading again.",
    error: {
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
      message: "Too many file uploads",
    },
  },
});

// ─── Password Reset Rate Limiter (very strict) ─────────

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again in 1 hour.",
    error: {
      code: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
      message: "Too many password reset attempts",
    },
  },
});

// ─── Notification Rate Limiter ─────────────────────────

export const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: getKey,
  message: {
    success: false,
    message: "Too many notification requests.",
    error: {
      code: "NOTIFICATION_RATE_LIMIT_EXCEEDED",
      message: "Too many notification requests",
    },
  },
});
