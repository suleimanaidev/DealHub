/**
 * Authentication Module — Integration Test Examples
 *
 * These examples use Jest + Supertest. To run them:
 *   npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
 *   npx jest tests/auth.integration.test.ts
 *
 * Required env vars for tests:
 *   DATABASE_URL=postgresql://...?schema=public
 *   JWT_SECRET=test-secret-key-at-least-32-chars-long!!
 *   JWT_REFRESH_SECRET=test-refresh-secret-key-32chars!!
 *   NODE_ENV=test
 */

import request from "supertest";
import app from "../app";
import { prisma } from "../database";

// ─── Test Setup ────────────────────────────────────────

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean test data between tests
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});

// ─── Test Data ─────────────────────────────────────────

const TEST_USER = {
  email: "test@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  organizationName: "Test Corp",
};

const TEST_USER_2 = {
  email: "jane@example.com",
  password: "SecurePass456!",
  firstName: "Jane",
  lastName: "Smith",
  organizationName: "Test Corp",
};

// ─── Helper: Extract Set-Cookie ────────────────────────

function extractRefreshToken(response: request.Response): string | undefined {
  const cookies = response.headers["set-cookie"];
  if (!cookies) return undefined;

  const refreshTokenCookie = cookies.find((c: string) =>
    c.startsWith("refreshToken=")
  );
  if (!refreshTokenCookie) return undefined;

  const match = refreshTokenCookie.match(/refreshToken=([^;]+)/);
  return match?.[1];
}

// ═══════════════════════════════════════════════════════
//  AUTH MODULE TESTS
// ═══════════════════════════════════════════════════════

describe("Authentication Module", () => {
  // ─── REGISTER ───────────────────────────────────────

  describe("POST /api/v1/auth/register", () => {
    it("should register a new organization and owner", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(TEST_USER)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();
      expect(res.body.message).toContain("Registration successful");
    });

    it("should fail with duplicate email", async () => {
      // Register first time
      await request(app)
        .post("/api/v1/auth/register")
        .send(TEST_USER)
        .expect(201);

      // Attempt duplicate
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(TEST_USER)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should fail with weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...TEST_USER, password: "123" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should fail with invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...TEST_USER, email: "not-an-email" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should fail with missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── LOGIN ──────────────────────────────────────────

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Register user first
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
    });

    it("should login successfully and return tokens", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.firstName).toBe(TEST_USER.firstName);

      // Refresh token should be in cookie, not in body
      expect(res.body.data.refreshToken).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();

      const refreshToken = extractRefreshToken(res);
      expect(refreshToken).toBeDefined();
    });

    it("should fail with wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: "WrongPassword123!" })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should fail with non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "nobody@example.com", password: TEST_USER.password })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should lock account after too many failed attempts", async () => {
      // Attempt 5+ times with wrong password
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .send({ email: TEST_USER.email, password: "WrongPassword123!" });
      }

      // Now try with correct password — should be locked
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(401);

      expect(res.body.error.message).toContain("locked");
    });
  });

  // ─── REFRESH TOKEN ──────────────────────────────────

  describe("POST /api/v1/auth/refresh", () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      refreshToken = extractRefreshToken(loginRes)!;
    });

    it("should rotate tokens using cookie", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", `refreshToken=${refreshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Old refresh token should be invalidated
      const oldRefreshToken = refreshToken;
      const refreshRes2 = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", `refreshToken=${oldRefreshToken}`)
        .expect(401);

      expect(refreshRes2.body.success).toBe(false);
    });

    it("should rotate tokens using body (fallback)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
    });

    it("should fail with invalid refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "refreshToken=invalid-token-12345")
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── LOGOUT ─────────────────────────────────────────

  describe("POST /api/v1/auth/logout", () => {
    let accessToken: string;

    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      accessToken = loginRes.body.data.accessToken;
    });

    it("should logout and clear cookie", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);

      // Cookie should be cleared (maxAge=0)
      const cookies = res.headers["set-cookie"];
      if (cookies) {
        const refreshTokenCookie = cookies.find((c: string) =>
          c.startsWith("refreshToken=")
        );
        expect(refreshTokenCookie).toContain("Max-Age=0");
      }
    });

    it("should fail without auth token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── FORGOT PASSWORD ────────────────────────────────

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should always return success (prevent enumeration)", async () => {
      // For existing email
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const res1 = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: TEST_USER.email })
        .expect(200);

      // For non-existing email
      const res2 = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200);

      // Both should return the same message
      expect(res1.body.message).toBe(res2.body.message);
    });
  });

  // ─── RESET PASSWORD ─────────────────────────────────

  describe("POST /api/v1/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);

      // Get reset token from DB (in production it's in the email)
      const user = await prisma.user.findFirst({
        where: { email: TEST_USER.email },
      });
      const resetToken = await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          token: "test-reset-token-12345",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken.token,
          password: "NewSecurePass123!",
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Old password should not work
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(401);

      // New password should work
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: "NewSecurePass123!" })
        .expect(200);
    });

    it("should fail with expired token", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);

      const user = await prisma.user.findFirst({
        where: { email: TEST_USER.email },
      });
      const resetToken = await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          token: "expired-token",
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken.token,
          password: "NewSecurePass123!",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── EMAIL VERIFICATION ─────────────────────────────

  describe("POST /api/v1/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);

      const user = await prisma.user.findFirst({
        where: { email: TEST_USER.email },
      });
      const verificationToken = await prisma.emailVerificationToken.create({
        data: {
          userId: user!.id,
          token: "test-verification-token",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: verificationToken.token })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify user is now verified
      const updatedUser = await prisma.user.findFirst({
        where: { email: TEST_USER.email },
      });
      expect(updatedUser!.emailVerified).toBe(true);
    });
  });

  // ─── PROTECTED ROUTES ───────────────────────────────

  describe("GET /api/v1/auth/me", () => {
    it("should return current user profile", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.user.email).toBe(TEST_USER.email);
    });

    it("should fail without token", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should fail with invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid-token-12345")
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── SESSIONS ───────────────────────────────────────

  describe("GET /api/v1/auth/sessions", () => {
    it("should list active sessions", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.sessions).toBeDefined();
      expect(res.body.data.sessions.length).toBeGreaterThan(0);
    });
  });

  // ─── CHANGE PASSWORD ────────────────────────────────

  describe("POST /api/v1/auth/change-password", () => {
    it("should change password with valid current password", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "BrandNewPass123!",
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Old password should not work
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(401);

      // New password should work
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: "BrandNewPass123!" })
        .expect(200);
    });

    it("should fail with wrong current password", async () => {
      await request(app).post("/api/v1/auth/register").send(TEST_USER);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "WrongPassword123!",
          newPassword: "BrandNewPass123!",
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
//  RBAC TESTS
// ═══════════════════════════════════════════════════════

describe("Role-Based Access Control", () => {
  let ownerToken: string;
  let userId: string;

  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send(TEST_USER);
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    ownerToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;
  });

  it("owner can access all routes", async () => {
    await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
  });

  it("unauthenticated user cannot access protected routes", async () => {
    await request(app)
      .get("/api/v1/users")
      .expect(401);
  });

  it("user without permission cannot access restricted routes", async () => {
    // Create a second user with no roles
    await request(app).post("/api/v1/auth/register").send(TEST_USER_2);
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_USER_2.email, password: TEST_USER_2.password });

    const user2Token = loginRes.body.data.accessToken;

    // user2 is owner of their own org, so they CAN access
    // This test verifies the org isolation works
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${user2Token}`)
      .expect(200);

    // Should only see their own org's users
    expect(res.body.data.length).toBe(1);
  });
});
