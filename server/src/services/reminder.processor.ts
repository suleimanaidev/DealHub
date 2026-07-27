import { prisma } from "../database";
import { notificationService } from "./notification.service";
import { logger } from "../utils/logger";

// ─── Reminder Processor ────────────────────────────────
// Polls for tasks with reminderAt <= now and sends notifications

const POLL_INTERVAL_MS = 60_000; // 1 minute
let intervalId: NodeJS.Timeout | null = null;

async function processReminders(): Promise<void> {
  try {
    const now = new Date();

    // Find tasks with reminders that haven't been processed yet
    const tasksWithReminders = await prisma.activity.findMany({
      where: {
        type: "task",
        reminderAt: { lte: now },
        status: { in: ["pending", "in_progress"] },
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const task of tasksWithReminders) {
      if (!task.assignedToId) continue;

      // Check if we already sent a notification for this reminder
      const existingNotification = await prisma.notification.findFirst({
        where: {
          entityType: "activity",
          entityId: task.id,
          type: "TASK_DUE",
          userId: task.assignedToId,
        },
      });

      if (existingNotification) continue;

      // Send notification
      await notificationService.create({
        organizationId: task.organizationId,
        userId: task.assignedToId,
        type: "TASK_DUE",
        title: `Task Reminder: ${task.subject}`,
        message: `Your task "${task.subject}" is due${task.dueDate ? ` on ${task.dueDate.toLocaleDateString()}` : ""}.`,
        entityType: "activity",
        entityId: task.id,
        actionUrl: `/tasks/${task.id}`,
      });

      logger.debug({ taskId: task.id, userId: task.assignedToId }, "Reminder notification sent");
    }
  } catch (error) {
    logger.error({ error }, "Error processing reminders");
  }
}

export function startReminderProcessor(): void {
  if (intervalId) return;
  intervalId = setInterval(processReminders, POLL_INTERVAL_MS);
  logger.info("Reminder processor started");
}

export function stopReminderProcessor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Reminder processor stopped");
  }
}
