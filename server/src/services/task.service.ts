import { taskRepository, CreateTaskInput, UpdateTaskInput } from "../repositories/task.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { NotFoundError, ForbiddenError } from "../utils/response";
import { Prisma } from "@prisma/client";

export const taskService = {
  async create(organizationId: string, input: CreateTaskInput, createdBy: string) {
    const task = await taskRepository.create({ ...input, organizationId, createdBy });

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "task_create",
      entityType: "task",
      entityId: task.id,
      newValues: { subject: input.subject, priority: input.priority, dueDate: input.dueDate } as Prisma.InputJsonValue,
    });

    return task;
  },

  async getById(taskId: string, organizationId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }
    return task;
  },

  async getAll(organizationId: string, options: Parameters<typeof taskRepository.findMany>[1]) {
    return taskRepository.findMany(organizationId, options);
  },

  async update(taskId: string, organizationId: string, input: UpdateTaskInput, updatedBy: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }

    const updated = await taskRepository.update(taskId, input, {
      taskType: input.taskType,
      reminderAt: input.reminderAt,
      recurrenceRule: input.recurrenceRule,
    });

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "task_update",
      entityType: "task",
      entityId: taskId,
      newValues: input as unknown as Prisma.InputJsonValue,
    });

    return updated;
  },

  async complete(taskId: string, organizationId: string, completedBy: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }

    if (task.activity.status === "completed") {
      throw new ForbiddenError("Task is already completed");
    }

    const updated = await taskRepository.complete(taskId, completedBy);

    await auditLogRepository.create({
      organizationId,
      userId: completedBy,
      action: "task_complete",
      entityType: "task",
      entityId: taskId,
    });

    return updated;
  },

  async delete(taskId: string, organizationId: string, deletedBy: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }

    await taskRepository.softDelete(taskId);

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "task_delete",
      entityType: "task",
      entityId: taskId,
    });
  },

  async getStats(organizationId: string) {
    return taskRepository.getStats(organizationId);
  },

  async addNote(taskId: string, organizationId: string, content: string, createdByUserId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }

    return taskRepository.addNote(taskId, organizationId, content, createdByUserId);
  },

  async getNotes(taskId: string, organizationId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError("Task");
    }

    return taskRepository.getNotes(taskId);
  },

  async deleteNote(noteId: string, taskId: string) {
    await taskRepository.deleteNote(noteId);
  },

  async getReminders(organizationId: string) {
    return taskRepository.getReminders(organizationId);
  },
};
