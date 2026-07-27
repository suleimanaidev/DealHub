import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { cookieService } from "../services/cookie.service";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
} from "../utils/response";
import { logger } from "../utils/logger";

// ─── Auth Controller ───────────────────────────────────

export const authController = {
  /**
   * POST /api/v1/auth/register
   *
   * Registers a new organization owner with:
   *  - Email + password account
   *  - Organization creation
   *  - Default roles and permissions seeding
   *  - System Admin role assigned to the owner
   *  - Verification email sent
   *
   * Request body:
   *   { email, password, firstName, lastName, organizationName }
   *
   * Response:
   *   201 { message, userId }
   *   400 validation error
   *   409 email already exists
   */
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, organizationName } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      organizationName,
    });

    sendCreated(res, { userId: result.userId }, result.message);
  },

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates a user:
   *  - Verifies email + password via bcrypt
   *  - Checks account lock status and active state
   *  - Generates access + refresh tokens
   *  - Sets refresh token as httpOnly cookie (NOT in response body)
   *  - Stores session in DB with IP + user-agent
   *  - Logs audit entry
   *
   * Request body:
   *   { email, password }
   *
   * Response:
   *   200 { accessToken, user: { id, email, firstName, lastName, organizationId, isOwner } }
   *   401 invalid credentials / locked / deactivated
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    const result = await authService.login({
      email,
      password,
      ipAddress,
      userAgent,
    });

    // Set refresh token as secure httpOnly cookie
    cookieService.setRefreshTokenCookie(res, result.refreshToken);

    // Return access token + user info (NEVER return refresh token in body)
    sendOk(
      res,
      {
        accessToken: result.accessToken,
        user: result.user,
      },
      "Login successful"
    );
  },

  /**
   * POST /api/v1/auth/logout
   *
   * Revokes the current session:
   *  - Deletes session from DB
   *  - Clears the refresh token cookie
   *
   * Request:  Authorization: Bearer <accessToken>
   * Response: 204 No Content
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    // Get refresh token from cookie to revoke specific session
    const refreshToken = cookieService.getRefreshTokenFromCookie(req);
    await authService.logout(userId, refreshToken);

    // Clear cookie
    cookieService.clearRefreshTokenCookie(res);

    sendNoContent(res);
  },

  /**
   * POST /api/v1/auth/refresh
   *
   * Rotates the refresh token:
   *  - Reads refresh token from httpOnly cookie (fallback to body)
   *  - Validates token + checks session in DB
   *  - Issues new access + refresh token pair
   *  - Sets new refresh token cookie
   *  - Old refresh token is invalidated
   *
   * Request body (optional — cookie is preferred):
   *   { refreshToken }
   *
   * Response:
   *   200 { accessToken, refreshToken }
   *   401 invalid/expired refresh token
   */
  async refresh(req: Request, res: Response): Promise<void> {
    // Prefer cookie, fallback to body
    const refreshToken =
      cookieService.getRefreshTokenFromCookie(req) || req.body.refreshToken;

    if (!refreshToken) {
      sendUnauthorized(res, "Refresh token not provided");
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Set new refresh token cookie
    cookieService.setRefreshTokenCookie(res, tokens.refreshToken);

    sendOk(
      res,
      {
        accessToken: tokens.accessToken,
        // Don't send refreshToken in body — it's in the cookie
      },
      "Token refreshed successfully"
    );
  },

  /**
   * POST /api/v1/auth/forgot-password
   *
   * Initiates the password reset flow:
   *  - Generates a cryptographically random token
   *  - Stores hashed token in DB with 15-minute expiry
   *  - Sends reset email (always returns success to prevent enumeration)
   *
   * Request body:
   *   { email }
   *
   * Response:
   *   200 { message }  (always the same message regardless of email existence)
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    sendOk(res, null, result.message);
  },

  /**
   * POST /api/v1/auth/reset-password
   *
   * Resets the user's password:
   *  - Validates the reset token (not expired, not used)
   *  - Validates password strength
   *  - Hashes new password with bcrypt (12 rounds)
   *  - Updates password hash
   *  - Invalidates all existing sessions (force re-login)
   *  - Marks token as used
   *
   * Request body:
   *   { token, password }
   *
   * Response:
   *   200 { message }
   *   400 validation error / weak password
   *   401 invalid/expired token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    // Clear refresh token cookie — user must log in again
    cookieService.clearRefreshTokenCookie(res);

    sendOk(res, null, result.message);
  },

  /**
   * POST /api/v1/auth/verify-email
   *
   * Verifies the user's email address:
   *  - Validates the verification token
   *  - Sets emailVerified = true on the user
   *  - Marks token as verified
   *
   * Request body:
   *   { token }
   *
   * Response:
   *   200 { message }
   *   401 invalid/expired token
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    sendOk(res, null, result.message);
  },

  /**
   * POST /api/v1/auth/resend-verification
   *
   * Resends the verification email:
   *  - Generates a new verification token
   *  - Invalidates any existing unverified tokens
   *  - Sends new verification email
   *
   * Request:  Authorization: Bearer <accessToken>
   * Response: 200 { message }
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await authService.resendVerification(userId);

    sendOk(res, null, result.message);
  },

  /**
   * GET /api/v1/auth/sessions
   *
   * Lists all active sessions for the current user.
   *
   * Request:  Authorization: Bearer <accessToken>
   * Response: 200 { sessions: [{ id, ipAddress, userAgent, createdAt, lastActiveAt }] }
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const sessions = await authService.getSessions(userId);

    sendOk(res, { sessions }, "Sessions retrieved");
  },

  /**
   * DELETE /api/v1/auth/sessions/:sessionId
   *
   * Revokes a specific session (useful for "log out everywhere except here").
   *
   * Request:  Authorization: Bearer <accessToken>
   * Response: 204 No Content
   */
  async revokeSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    await authService.revokeSession(userId, sessionId);

    sendNoContent(res);
  },

  /**
   * POST /api/v1/auth/change-password
   *
   * Changes the user's password (requires current password):
   *  - Verifies current password
   *  - Validates new password strength
   *  - Hashes and stores new password
   *  - Logs audit entry
   *
   * Request body:
   *   { currentPassword, newPassword }
   *
   * Response:
   *   200 { message }
   *   400 validation error / weak password
   *   403 incorrect current password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Import here to avoid circular dependency
    const { userService } = await import("../services/user.service");

    await userService.changePassword(userId, currentPassword, newPassword);

    // Clear all cookies — force re-login on all devices
    cookieService.clearRefreshTokenCookie(res);

    sendOk(res, null, "Password changed successfully. Please log in again.");
  },

  /**
   * GET /api/v1/auth/me
   *
   * Returns the currently authenticated user's profile.
   *
   * Request:  Authorization: Bearer <accessToken>
   * Response: 200 { user }
   */
  async me(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    // Import here to avoid circular dependency
    const { userService } = await import("../services/user.service");

    const user = await userService.getProfile(userId);

    sendOk(res, { user }, "Profile retrieved");
  },
};
