import { Response } from "express";
import { env } from "../config/env";
import { parseExpiry } from "../utils/token";
import { logger } from "../utils/logger";

// ─── Cookie Configuration ──────────────────────────────

export interface CookieOptions {
  name: string;
  value: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  domain?: string;
}

// ─── Cookie Service ────────────────────────────────────

export const cookieService = {
  /**
   * Default cookie options for secure auth cookies.
   * - httpOnly: true  → inaccessible to JavaScript (XSS protection)
   * - secure: true    → only sent over HTTPS
   * - sameSite: "lax" → protects against CSRF for top-level navigations
   * - path: "/"       → available across the entire app
   */
  getDefaultOptions(): Omit<CookieOptions, "name" | "value"> {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };
  },

  /**
   * Set the refresh token as an httpOnly cookie.
   * The refresh token is NEVER exposed to browser JS — only the access token
   * is returned in the response body for the client to store in memory.
   */
  setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const expires = parseExpiry(env.JWT_REFRESH_EXPIRES_IN);

    res.cookie("refreshToken", refreshToken, {
      ...this.getDefaultOptions(),
      maxAge: expires.getTime() - Date.now(),
    });

    logger.debug("Refresh token cookie set");
  },

  /**
   * Clear the refresh token cookie (used during logout).
   */
  clearRefreshTokenCookie(res: Response): void {
    res.cookie("refreshToken", "", {
      ...this.getDefaultOptions(),
      maxAge: 0,
    });

    logger.debug("Refresh token cookie cleared");
  },

  /**
   * Read the refresh token from the cookie.
   * Returns undefined if the cookie is not present.
   */
  getRefreshTokenFromCookie(req: { cookies?: Record<string, string> }): string | undefined {
    return req.cookies?.refreshToken;
  },
};
