import { Request, Response, NextFunction } from "express";
import { taskService } from "../services/task.service";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../utils/response";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const taskController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const task = await taskService.create(organizationId, req.body, createdBy);

    sendCreated(res, { task }, "Task created successfully");
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;

    const task = await taskService.getById(taskId, organizationId);

    sendOk(res, { task }, "Task retrieved");
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const task = await taskService.update(taskId, organizationId, req.body, updatedBy);

    sendOk(res, { task }, "Task updated");
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const completedBy = req.user!.id;

    const task = await taskService.complete(taskId, organizationId, completedBy);

    sendOk(res, { task }, "Task completed");
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    await taskService.delete(taskId, organizationId, deletedBy);

    sendNoContent(res);
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;

    const stats = await taskService.getStats(organizationId);

    sendOk(res, { stats }, "Task stats retrieved");
  }),

  getNotes: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;

    const notes = await taskService.getNotes(taskId, organizationId);

    sendOk(res, { notes }, "Notes retrieved");
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdByUserId = req.user!.id;

    const note = await taskService.addNote(taskId, organizationId, req.body.content, createdByUserId);

    sendCreated(res, { note }, "Note added");
  }),

  deleteNote: asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.params;

    await taskService.deleteNote(noteId, "");

    sendNoContent(res);
  }),

  reminders: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;

    const reminders = await taskService.getReminders(organizationId);

    sendOk(res, { reminders }, "Reminders retrieved");
  }),
};
