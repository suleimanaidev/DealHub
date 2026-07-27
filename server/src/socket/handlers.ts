import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";

export function handleSocketConnection(io: Server, socket: Socket): void {
  const userId = (socket as any).userId as string;
  const organizationId = (socket as any).organizationId as string;

  // ─── Join User Room ────────────────────────────────
  socket.join(`user:${userId}`);
  socket.join(`org:${organizationId}`);

  logger.info({ userId, socketId: socket.id }, "Client connected via WebSocket");

  // ─── Typing Indicators ─────────────────────────────
  socket.on("typing:start", (data: { entityType: string; entityId: string }) => {
    socket.to(`org:${organizationId}`).emit("typing:start", {
      userId,
      ...data,
    });
  });

  socket.on("typing:stop", (data: { entityType: string; entityId: string }) => {
    socket.to(`org:${organizationId}`).emit("typing:stop", {
      userId,
      ...data,
    });
  });

  // ─── Presence ──────────────────────────────────────
  socket.on("presence:online", () => {
    socket.to(`org:${organizationId}`).emit("presence:online", { userId });
  });

  // ─── Disconnect ────────────────────────────────────
  socket.on("disconnect", (reason) => {
    logger.info({ userId, socketId: socket.id, reason }, "Client disconnected");
  });
}

// ─── Emission Helpers ──────────────────────────────────

export function emitToUser(io: Server, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToOrganization(io: Server, organizationId: string, event: string, data: any): void {
  io.to(`org:${organizationId}`).emit(event, data);
}
