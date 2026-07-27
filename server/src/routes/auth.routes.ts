import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../validation";
import { authLimiter } from "../middleware/rateLimiter";
import { cookieParser } from "cookie-parser";

const router = Router();

// ─── Public Routes (no auth required) ──────────────────

/**
 * POST /api/v1/auth/register
 *
 * Register a new organization and owner account.
 * Rate-limited to prevent mass account creation.
 */
router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user and issue tokens.
 * Rate-limited to prevent brute-force attacks.
 */
router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * POST /api/v1/auth/refresh
 *
 * Rotate refresh token. Reads from httpOnly cookie first,
 * falls back to request body.
 */
router.post("/refresh", cookieParser(), authController.refresh);

/**
 * POST /api/v1/auth/forgot-password
 *
 * Send a password reset email. Always returns the same response
 * to prevent email enumeration.
 */
router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /api/v1/auth/reset-password
 *
 * Reset password using the token from the email.
 */
router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

/**
 * POST /api/v1/auth/verify-email
 *
 * Verify email address using the token from the email.
 */
router.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

// ─── Protected Routes (auth required) ──────────────────

/**
 * POST /api/v1/auth/logout
 *
 * Revoke the current session and clear the refresh token cookie.
 */
router.post("/logout", authenticate, authController.logout);

/**
 * POST /api/v1/auth/resend-verification
 *
 * Resend verification email for the authenticated user.
 */
router.post(
  "/resend-verification",
  authenticate,
  authController.resendVerification
);

/**
 * POST /api/v1/auth/change-password
 *
 * Change password (requires current password).
 */
router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * GET /api/v1/auth/sessions
 *
 * List all active sessions for the authenticated user.
 */
router.get("/sessions", authenticate, authController.getSessions);

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 *
 * Revoke a specific session.
 */
router.delete(
  "/sessions/:sessionId",
  authenticate,
  authController.revokeSession
);

/**
 * GET /api/v1/auth/me
 *
 * Get the current user's profile.
 */
router.get("/me", authenticate, authController.me);

export default router;
