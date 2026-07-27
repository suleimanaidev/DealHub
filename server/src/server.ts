import http from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./database";
import { logger } from "./utils/logger";
import { verifyEmailConnection } from "./services/email/emailService";
import { initSocketServer } from "./socket";
import { startReminderProcessor, stopReminderProcessor } from "./services/reminder.processor";

async function main(): Promise<void> {
  try {
    // ─── Database Connection ─────────────────────────

    logger.info("Connecting to database...");
    await prisma.$connect();
    logger.info("Database connected successfully");

    // ─── Email Connection Check ──────────────────────

    if (env.NODE_ENV === "production") {
      const emailOk = await verifyEmailConnection();
      if (!emailOk) {
        logger.warn("Email connection failed - emails will not be sent");
      }
    }

    // ─── HTTP Server + Socket.io ─────────────────────

    const server = http.createServer(app);
    const io = initSocketServer(server);

    // Make io accessible globally for notification service
    globalThis.__io = io;

    // Start reminder processor
    startReminderProcessor();

    // ─── Start Server ────────────────────────────────

    server.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
          apiVersion: "v1",
          websocket: true,
        },
        "Server started successfully"
      );
    });
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// ─── Graceful Shutdown ─────────────────────────────────

async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Shutting down gracefully...`);

    try {
      stopReminderProcessor();
      await prisma.$disconnect();
    logger.info("Database connection closed");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});

main();
