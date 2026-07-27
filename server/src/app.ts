import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { sanitizeInput, securityHeaders, requestId } from "./middleware/security";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import leadRoutes from "./routes/lead.routes";
import customerRoutes from "./routes/customer.routes";
import dealRoutes from "./routes/deal.routes";
import taskRoutes from "./routes/task.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

// ─── Trust Proxy (for rate limiter behind reverse proxy) ─

app.set("trust proxy", 1);

// ─── Request ID ────────────────────────────────────────

app.use(requestId);

// ─── Security Middleware ───────────────────────────────

app.use(helmet());
app.use(securityHeaders);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  })
);

// ─── Cookie Parser ─────────────────────────────────────

app.use(cookieParser());

// ─── Rate Limiting ─────────────────────────────────────

app.use("/api/", apiLimiter);

// ─── Input Sanitization ────────────────────────────────

app.use(sanitizeInput);

// ─── Body Parsing ──────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Compression ───────────────────────────────────────

app.use(compression());

// ─── Health Check ──────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/deals", dealRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ─── 404 Handler ───────────────────────────────────────

app.use(notFoundHandler);

// ─── Error Handler ─────────────────────────────────────

app.use(errorHandler);

export default app;
