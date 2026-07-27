import { Request, Response } from "express";
import { prisma } from "../database";
import { customerRepository } from "../repositories/customer.repository";
import { noteRepository } from "../repositories/note.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
  NotFoundError,
} from "../utils/response";

export const customerController = {
  async create(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const customer = await customerRepository.create({
      ...req.body,
      organizationId,
      createdBy,
    });

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "customer_create",
      entityType: "customer",
      entityId: customer.id,
    });

    sendCreated(res, { customer }, "Customer created successfully");
  },

  async list(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const {
      page, limit, search, status, tier,
      assignedToId, teamId, sortBy, sortOrder,
    } = req.query;

    const result = await customerRepository.findMany(organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      search: search as string | undefined,
      status: status as string | undefined,
      tier: tier as string | undefined,
      assignedToId: assignedToId as string | undefined,
      teamId: teamId as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
    });

    sendPaginated(
      res,
      result.items,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Customers retrieved"
    );
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;

    const customer = await customerRepository.findById(customerId);

    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundError("Customer");
    }

    sendOk(res, { customer }, "Customer retrieved");
  },

  async update(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const existing = await customerRepository.findById(customerId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundError("Customer");
    }

    const customer = await customerRepository.update(customerId, req.body);

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "customer_update",
      entityType: "customer",
      entityId: customerId,
    });

    sendOk(res, { customer }, "Customer updated");
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    const existing = await customerRepository.findById(customerId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundError("Customer");
    }

    await customerRepository.softDelete(customerId);

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "customer_delete",
      entityType: "customer",
      entityId: customerId,
    });

    sendNoContent(res);
  },

  async assign(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;
    const assignedBy = req.user!.id;
    const { assignedToId } = req.body;

    await customerRepository.assignTo(customerId, assignedToId);

    await auditLogRepository.create({
      organizationId,
      userId: assignedBy,
      action: "customer_assign",
      entityType: "customer",
      entityId: customerId,
      newValues: { assignedToId },
    });

    sendOk(res, null, "Customer assigned");
  },

  async stats(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const stats = await customerRepository.getStats(organizationId);

    sendOk(res, { stats }, "Customer stats retrieved");
  },

  async getContacts(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;

    const customer = await customerRepository.findById(customerId);
    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundError("Customer");
    }

    const contacts = await prisma.customerContact.findMany({
      where: { customerId, organizationId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    sendOk(res, { contacts }, "Contacts retrieved");
  },

  async addContact(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const customer = await customerRepository.findById(customerId);
    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundError("Customer");
    }

    const contact = await prisma.customerContact.create({
      data: {
        ...req.body,
        customerId,
        organizationId,
        createdBy,
      },
    });

    sendCreated(res, { contact }, "Contact added");
  },

  async updateContact(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;

    const contact = await prisma.customerContact.update({
      where: { id: contactId },
      data: { ...req.body, updatedAt: new Date() },
    });

    sendOk(res, { contact }, "Contact updated");
  },

  async deleteContact(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;

    await prisma.customerContact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    sendNoContent(res);
  },

  async getTimeline(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;

    const [activities, notes, auditLogs, deals] = await Promise.all([
      prisma.activity.findMany({
        where: { customerId, organizationId, deletedAt: null },
        include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.note.findMany({
        where: { customerId, organizationId, deletedAt: null },
        include: { creator: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "customer", entityId: customerId, organizationId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.deal.findMany({
        where: { customerId, organizationId, deletedAt: null },
        select: { id: true, title: true, value: true, stageId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const timeline: Array<{
      id: string;
      type: string;
      action: string;
      content: string;
      user: { id: string; firstName: string; lastName: string } | null;
      createdAt: Date;
    }> = [];

    for (const a of activities) {
      timeline.push({
        id: a.id,
        type: "activity",
        action: `${a.type}_${a.status}`,
        content: a.subject,
        user: a.assignee,
        createdAt: a.createdAt,
      });
    }
    for (const n of notes) {
      timeline.push({
        id: n.id,
        type: "note",
        action: n.isPinned ? "note_pinned" : "note_added",
        content: n.content,
        user: n.creator,
        createdAt: n.createdAt,
      });
    }
    for (const log of auditLogs) {
      timeline.push({
        id: log.id,
        type: "audit",
        action: log.action,
        content: log.action.replace(/_/g, " "),
        user: log.user,
        createdAt: log.createdAt,
      });
    }

    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    sendOk(res, { timeline, deals }, "Customer timeline retrieved");
  },

  async getNotes(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;

    const notes = await noteRepository.findByEntity("customer", customerId);

    sendOk(res, { notes }, "Notes retrieved");
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdByUserId = req.user!.id;

    const note = await noteRepository.create({
      organizationId,
      content: req.body.content,
      entityType: "customer",
      entityId: customerId,
      isPinned: req.body.isPinned,
      createdByUserId,
    });

    sendCreated(res, { note }, "Note added");
  },

  async getDeals(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;
    const organizationId = req.user!.organizationId;

    const deals = await prisma.deal.findMany({
      where: { customerId, organizationId, deletedAt: null },
      include: {
        stage: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendOk(res, { deals }, "Customer deals retrieved");
  },
};
