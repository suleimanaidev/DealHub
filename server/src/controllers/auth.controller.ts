import { Request, Response, NextFunction } from "express";
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

// ─── Async Handler Wrapper ─────────────────────────────
// Express doesn't handle async errors — this wrapper catches them
// and forwards to the error handler middleware.

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ─── Auth Controller ───────────────────────────────────

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, organizationName } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      organizationName,
    });

    sendCreated(res, { userId: result.userId }, result.message);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    const result = await authService.login({
      email,
      password,
      ipAddress,
      userAgent,
    });

    cookieService.setRefreshTokenCookie(res, result.refreshToken);

    sendOk(
      res,
      {
        accessToken: result.accessToken,
        user: result.user,
      },
      "Login successful"
    );
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const refreshToken = cookieService.getRefreshTokenFromCookie(req);
    await authService.logout(userId, refreshToken);

    cookieService.clearRefreshTokenCookie(res);

    sendNoContent(res);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken =
      cookieService.getRefreshTokenFromCookie(req) || req.body.refreshToken;

    if (!refreshToken) {
      sendUnauthorized(res, "Refresh token not provided");
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    cookieService.setRefreshTokenCookie(res, tokens.refreshToken);

    sendOk(
      res,
      {
        accessToken: tokens.accessToken,
      },
      "Token refreshed successfully"
    );
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    sendOk(res, null, result.message);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    cookieService.clearRefreshTokenCookie(res);

    sendOk(res, null, result.message);
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    sendOk(res, null, result.message);
  }),

  resendVerification: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await authService.resendVerification(userId);

    sendOk(res, null, result.message);
  }),

  getSessions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const sessions = await authService.getSessions(userId);

    sendOk(res, { sessions }, "Sessions retrieved");
  }),

  revokeSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    await authService.revokeSession(userId, sessionId);

    sendNoContent(res);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const { userService } = await import("../services/user.service");

    await userService.changePassword(userId, currentPassword, newPassword);

    cookieService.clearRefreshTokenCookie(res);

    sendOk(res, null, "Password changed successfully. Please log in again.");
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { userService } = await import("../services/user.service");

    const user = await userService.getProfile(userId);

    sendOk(res, { user }, "Profile retrieved");
  }),
};
