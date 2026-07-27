import { Request, Response } from "express";
import { dealRepository } from "../repositories/deal.repository";
import { pipelineRepository } from "../repositories/pipeline.repository";
import { noteRepository } from "../repositories/note.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { prisma } from "../database";
import {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPaginated,
  NotFoundError,
} from "../utils/response";

export const dealController = {
  // ─── Deal CRUD ──────────────────────────────────────

  async create(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const createdBy = req.user!.id;

    const deal = await dealRepository.create({
      ...req.body,
      organizationId,
      createdBy,
    });

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "deal_create",
      entityType: "deal",
      entityId: deal.id,
      newValues: { title: deal.title, value: deal.value } as any,
    });

    sendCreated(res, { deal }, "Deal created successfully");
  },

  async list(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const {
      page, limit, search, status, stageId, pipelineId,
      assignedToId, minAmount, maxAmount,
      dateFrom, dateTo, sortBy, sortOrder,
    } = req.query;

    const result = await dealRepository.findMany(organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 25,
      search: search as string | undefined,
      status: status as string | undefined,
      stageId: stageId as string | undefined,
      pipelineId: pipelineId as string | undefined,
      assignedToId: assignedToId as string | undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
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
      "Deals retrieved"
    );
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;

    const deal = await dealRepository.findById(dealId);
    if (!deal) {
      throw new NotFoundError("Deal");
    }

    sendOk(res, { deal }, "Deal retrieved");
  },

  async update(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const deal = await dealRepository.update(dealId, req.body);

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "deal_update",
      entityType: "deal",
      entityId: dealId,
    });

    sendOk(res, { deal }, "Deal updated");
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const organizationId = req.user!.organizationId;
    const deletedBy = req.user!.id;

    await dealRepository.softDelete(dealId);

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "deal_delete",
      entityType: "deal",
      entityId: dealId,
    });

    sendNoContent(res);
  },

  async moveStage(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const { stageId } = req.body;
    const organizationId = req.user!.organizationId;
    const updatedBy = req.user!.id;

    const deal = await dealRepository.moveStage(dealId, stageId);

    // Check if this is a terminal stage
    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (stage) {
      const updateData: any = {};
      if (stage.isWon) {
        updateData.status = "won";
        updateData.actualCloseDate = new Date();
      } else if (stage.isLost) {
        updateData.status = "lost";
        updateData.actualCloseDate = new Date();
      }
      if (Object.keys(updateData).length > 0) {
        await dealRepository.update(dealId, updateData);
      }
    }

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "deal_stage_change",
      entityType: "deal",
      entityId: dealId,
      newValues: { stageId },
    });

    sendOk(res, { deal }, "Deal stage updated");
  },

  async assign(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const { assignedToId } = req.body;

    await dealRepository.assignTo(dealId, assignedToId);

    sendOk(res, null, "Deal assigned");
  },

  async stats(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const { pipelineId } = req.query;

    const stats = await dealRepository.getStats(organizationId, pipelineId as string | undefined);

    sendOk(res, { stats }, "Deal stats retrieved");
  },

  async forecast(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const forecast = await dealRepository.getForecast(organizationId);

    sendOk(res, { forecast }, "Revenue forecast retrieved");
  },

  async getTimeline(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const organizationId = req.user!.organizationId;

    const [activities, notes, auditLogs] = await Promise.all([
      prisma.activity.findMany({
        where: { dealId, organizationId, deletedAt: null },
        include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.note.findMany({
        where: { dealId, organizationId, deletedAt: null },
        include: { creator: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "deal", entityId: dealId, organizationId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
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
      timeline.push({ id: a.id, type: "activity", action: `${a.type}_${a.status}`, content: a.subject, user: a.assignee, createdAt: a.createdAt });
    }
    for (const n of notes) {
      timeline.push({ id: n.id, type: "note", action: "note_added", content: n.content, user: n.creator, createdAt: n.createdAt });
    }
    for (const log of auditLogs) {
      timeline.push({ id: log.id, type: "audit", action: log.action, content: log.action.replace(/_/g, " "), user: log.user, createdAt: log.createdAt });
    }

    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    sendOk(res, { timeline }, "Deal timeline retrieved");
  },

  async getNotes(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const notes = await noteRepository.findByEntity("deal", dealId);
    sendOk(res, { notes }, "Notes retrieved");
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const { dealId } = req.params;
    const organizationId = req.user!.organizationId;
    const createdByUserId = req.user!.id;

    const note = await noteRepository.create({
      organizationId,
      content: req.body.content,
      entityType: "deal",
      entityId: dealId,
      isPinned: req.body.isPinned,
      createdByUserId,
    });

    sendCreated(res, { note }, "Note added");
  },

  // ─── Pipeline Routes ────────────────────────────────

  async listPipelines(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const pipelines = await pipelineRepository.findMany(organizationId);

    sendOk(res, { pipelines }, "Pipelines retrieved");
  },

  async getPipeline(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;

    const pipeline = await pipelineRepository.findById(pipelineId);
    if (!pipeline) {
      throw new NotFoundError("Pipeline");
    }

    sendOk(res, { pipeline }, "Pipeline retrieved");
  },

  async createPipeline(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;

    const pipeline = await pipelineRepository.create({
      ...req.body,
      organizationId,
    });

    sendCreated(res, { pipeline }, "Pipeline created");
  },

  async updatePipeline(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;

    const pipeline = await pipelineRepository.update(pipelineId, req.body);

    sendOk(res, { pipeline }, "Pipeline updated");
  },

  async deletePipeline(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;

    await pipelineRepository.softDelete(pipelineId);

    sendNoContent(res);
  },

  async getStageStats(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;

    const stats = await pipelineRepository.getStageStats(pipelineId);

    sendOk(res, { stages: stats }, "Stage stats retrieved");
  },

  async createStage(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;

    const stage = await pipelineRepository.createStage({
      ...req.body,
      pipelineId,
    });

    sendCreated(res, { stage }, "Stage created");
  },

  async updateStage(req: Request, res: Response): Promise<void> {
    const { stageId } = req.params;

    const stage = await pipelineRepository.updateStage(stageId, req.body);

    sendOk(res, { stage }, "Stage updated");
  },

  async deleteStage(req: Request, res: Response): Promise<void> {
    const { stageId } = req.params;

    await pipelineRepository.deleteStage(stageId);

    sendNoContent(res);
  },

  async reorderStages(req: Request, res: Response): Promise<void> {
    const { pipelineId } = req.params;
    const { stageIds } = req.body;

    await pipelineRepository.reorderStages(pipelineId, stageIds);

    sendOk(res, null, "Stages reordered");
  },

  // ─── Kanban View ────────────────────────────────────

  async kanban(req: Request, res: Response): Promise<void> {
    const organizationId = req.user!.organizationId;
    const { pipelineId } = req.query;

    const pipelines = await pipelineRepository.findMany(organizationId);
    const targetPipelineId = pipelineId as string || pipelines[0]?.id;

    if (!targetPipelineId) {
      sendOk(res, { stages: [], pipeline: null }, "No pipelines found");
      return;
    }

    const pipeline = await pipelineRepository.findById(targetPipelineId);
    if (!pipeline) {
      throw new NotFoundError("Pipeline");
    }

    const deals = await prisma.deal.findMany({
      where: {
        organizationId,
        pipelineId: targetPipelineId,
        deletedAt: null,
        status: "open",
      },
      include: {
        customer: { select: { id: true, name: true, firstName: true, lastName: true, companyName: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stages = pipeline.stages.map((stage) => ({
      ...stage,
      deals: deals.filter((d) => d.stageId === stage.id),
      totalValue: deals.filter((d) => d.stageId === stage.id).reduce((sum, d) => sum + Number(d.value), 0),
    }));

    sendOk(res, { stages, pipeline, totalValue: deals.reduce((sum, d) => sum + Number(d.value), 0) }, "Kanban data retrieved");
  },
};
