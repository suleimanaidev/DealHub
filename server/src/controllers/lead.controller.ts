import { Request, Response, NextFunction } from "express";
import { leadService } from "../services/lead.service";
import { auditLogRepository } from "../repositories/auditLog.repository";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendNotFound,
} from "../utils/response";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const leadController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const result = await leadService.create(organizationId, req.body, createdBy);

    if (result.warning) {
      sendOk(res, result, result.warning);
      return;
    }

    sendCreated(res, { lead: result.lead }, "Lead created successfully");
  }),

  createForce: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const lead = await leadService.createForce(organizationId, req.body, createdBy);

    sendCreated(res, { lead }, "Lead created successfully");
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const {
      page, limit, search, status, rating, assignedToId,
      teamId, source, dateFrom, dateTo, sortBy, sortOrder,
    } = req.query;

    const result = await leadService.getAll(organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      search: search as string | undefined,
      status: status ? (status as string).split(",") : undefined,
      rating: rating ? (rating as string).split(",") : undefined,
      assignedToId: assignedToId as string | undefined,
      teamId: teamId as string | undefined,
      source: source ? (source as string).split(",") : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
    });

    sendPaginated(
      res,
      result.items,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Leads retrieved"
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    const lead = await leadService.getById(leadId, organizationId);

    sendOk(res, { lead }, "Lead retrieved");
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const lead = await leadService.update(leadId, organizationId, req.body, updatedBy);

    sendOk(res, { lead }, "Lead updated");
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    await leadService.delete(leadId, organizationId, deletedBy);

    sendNoContent(res);
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const assignedBy = req.user!.id;
    const { assignedToId } = req.body;

    const lead = await leadService.assign(leadId, organizationId, assignedToId, assignedBy);

    sendOk(res, { lead }, "Lead assigned successfully");
  }),

  transfer: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const transferredBy = req.user!.id;

    const lead = await leadService.transfer(leadId, organizationId, req.body, transferredBy);

    sendOk(res, { lead }, "Lead transferred successfully");
  }),

  convert: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const convertedBy = req.user!.id;

    const result = await leadService.convert(leadId, organizationId, req.body, convertedBy);

    sendOk(res, result, "Lead converted successfully");
  }),

  checkDuplicates: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { email, phone, companyName, excludeId } = req.query;

    const duplicates = await leadService.checkDuplicates(
      organizationId,
      email as string | undefined,
      phone as string | undefined,
      companyName as string | undefined,
      excludeId as string | undefined
    );

    sendOk(res, { duplicates }, "Duplicate check completed");
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { dateFrom, dateTo } = req.query;

    const stats = await leadService.getStats(
      organizationId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    sendOk(res, { stats }, "Lead stats retrieved");
  }),

  timeline: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    const timeline = await leadService.getTimeline(leadId, organizationId);

    sendOk(res, { timeline }, "Lead timeline retrieved");
  }),

  getNotes: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    const notes = await leadService.getNotes(leadId, organizationId);

    sendOk(res, { notes }, "Notes retrieved");
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdByUserId = req.user!.id;

    const note = await leadService.addNote(leadId, organizationId, req.body, createdByUserId);

    sendCreated(res, { note }, "Note added");
  }),

  updateNote: asyncHandler(async (req: Request, res: Response) => {
    const { leadId, noteId } = req.params;

    const note = await leadService.updateNote(noteId, leadId, req.body);

    sendOk(res, { note }, "Note updated");
  }),

  deleteNote: asyncHandler(async (req: Request, res: Response) => {
    const { leadId, noteId } = req.params;

    await leadService.deleteNote(noteId, leadId);

    sendNoContent(res);
  }),

  bulkAssign: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const assignedBy = req.user!.id;
    const { leadIds, assignedToId } = req.body;

    const result = await leadService.bulkAssign(leadIds, assignedToId, organizationId, assignedBy);

    sendOk(res, result, `${result.count} leads assigned`);
  }),

  bulkUpdateStatus: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;
    const { leadIds, status } = req.body;

    const result = await leadService.bulkUpdateStatus(leadIds, status, organizationId, updatedBy);

    sendOk(res, result, `${result.count} leads updated`);
  }),

  bulkDelete: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;
    const { leadIds } = req.body;

    const result = await leadService.bulkDelete(leadIds, organizationId, deletedBy);

    sendOk(res, result, `${result.count} leads deleted`);
  }),

  importLeads: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;

    const result = await leadService.importLeads(req.body.leads, organizationId);

    sendOk(res, result, `Imported ${result.imported} leads`);
  }),

  exportLeads: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { status, assignedToId, dateFrom, dateTo } = req.query;

    const leads = await leadService.exportLeads(organizationId, {
      status: status as string | undefined,
      assignedToId: assignedToId as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    sendOk(res, { leads }, "Leads exported");
  }),
};
