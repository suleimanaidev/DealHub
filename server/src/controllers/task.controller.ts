import { Request, Response } from "express";
import { taskService } from "../services/task.service";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../utils/response";

export const taskController = {
  async create(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const task = await taskService.create(organizationId, req.body, createdBy);

    sendCreated(res, { task }, "Task created successfully");
  },

  async list(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const {
      page, limit, search, status, priority, assignedToId,
      taskType, leadId, customerId, dealId, dueDateFrom, dueDateTo,
      overdueOnly, sortBy, sortOrder,
    } = req.query;

    const result = await taskService.getAll(organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      search: search as string | undefined,
      status: status ? (status as string).split(",") : undefined,
      priority: priority ? (priority as string).split(",") : undefined,
      assignedToId: assignedToId as string | undefined,
      taskType: taskType as string | undefined,
      leadId: leadId as string | undefined,
      customerId: customerId as string | undefined,
      dealId: dealId as string | undefined,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom as string) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo as string) : undefined,
      overdueOnly: overdueOnly === "true",
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
    });

    sendPaginated(
      res,
      result.items,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Tasks retrieved"
    );
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;

    const task = await taskService.getById(taskId, organizationId);

    sendOk(res, { task }, "Task retrieved");
  },

  async update(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const task = await taskService.update(taskId, organizationId, req.body, updatedBy);

    sendOk(res, { task }, "Task updated");
  },

  async complete(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const completedBy = req.user!.id;

    const task = await taskService.complete(taskId, organizationId, completedBy);

    sendOk(res, { task }, "Task completed");
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    await taskService.delete(taskId, organizationId, deletedBy);

    sendNoContent(res);
  },

  async stats(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const stats = await taskService.getStats(organizationId);

    sendOk(res, { stats }, "Task stats retrieved");
  },

  async getNotes(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;

    const notes = await taskService.getNotes(taskId, organizationId);

    sendOk(res, { notes }, "Notes retrieved");
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdByUserId = req.user!.id;

    const note = await taskService.addNote(taskId, organizationId, req.body.content, createdByUserId);

    sendCreated(res, { note }, "Note added");
  },

  async deleteNote(req: Request, res: Response): Promise<void> {
    const { noteId } = req.params;

    await taskService.deleteNote(noteId, "");

    sendNoContent(res);
  },

  async reminders(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const reminders = await taskService.getReminders(organizationId);

    sendOk(res, { reminders }, "Reminders retrieved");
  },
};
