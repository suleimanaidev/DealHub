// @ts-nocheck
import { prisma } from "../database";
import { leadRepository, CreateLeadInput, UpdateLeadInput } from "../repositories/lead.repository";
import { noteRepository } from "../repositories/note.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "../utils/response";
import { logger } from "../utils/logger";
import { Prisma } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────

export interface CreateLeadServiceInput extends CreateLeadInput {}

export interface UpdateLeadServiceInput extends UpdateLeadInput {}

export interface TransferLeadInput {
  assignedToId: string | null;
  reason?: string;
}

export interface ConvertLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  createDeal?: boolean;
  dealTitle?: string;
  dealAmount?: number;
}

export interface AddNoteInput {
  content: string;
  isPinned?: boolean;
}

export interface UpdateNoteInput {
  content: string;
}

// ─── Lead Service ──────────────────────────────────────

export const leadService = {
  async create(
    organizationId: string,
    input: CreateLeadServiceInput,
    createdBy: string
  ) {
    // Duplicate detection
    if (input.email || input.phone || input.companyName) {
      const duplicates = await leadRepository.findDuplicates(
        organizationId,
        input.email,
        input.phone,
        input.companyName
      );

      if (duplicates.length > 0) {
        return {
          lead: null,
          duplicates,
          warning: `Found ${duplicates.length} potential duplicate(s). Proceed with creation?`,
        };
      }
    }

    const lead = await leadRepository.create({ ...input, organizationId, createdBy });

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "lead_create",
      entityType: "lead",
      entityId: lead.id,
      newValues: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, companyName: lead.companyName } as Prisma.InputJsonValue,
    });

    return { lead, duplicates: [], warning: null };
  },

  async createForce(organizationId: string, input: CreateLeadServiceInput, createdBy: string) {
    const lead = await leadRepository.create({ ...input, organizationId, createdBy });

    await auditLogRepository.create({
      organizationId,
      userId: createdBy,
      action: "lead_create",
      entityType: "lead",
      entityId: lead.id,
      newValues: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, companyName: lead.companyName } as Prisma.InputJsonValue,
    });

    return lead;
  },

  async getById(leadId: string, organizationId: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }
    return lead;
  },

  async getAll(organizationId: string, options: Parameters<typeof leadRepository.findMany>[1]) {
    return leadRepository.findMany(organizationId, options);
  },

  async update(
    leadId: string,
    organizationId: string,
    input: UpdateLeadServiceInput,
    updatedBy: string
  ) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && (lead as Record<string, unknown>)[key] !== value) {
        oldValues[key] = (lead as Record<string, unknown>)[key];
        newValues[key] = value;
      }
    }

    const updated = await leadRepository.update(leadId, input);

    if (Object.keys(newValues).length > 0) {
      await auditLogRepository.create({
        organizationId,
        userId: updatedBy,
        action: "lead_update",
        entityType: "lead",
        entityId: leadId,
        oldValues: oldValues as Prisma.InputJsonValue,
        newValues: newValues as Prisma.InputJsonValue,
      });
    }

    return updated;
  },

  async delete(leadId: string, organizationId: string, deletedBy: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    if (lead.status === "converted") {
      throw new ForbiddenError("Cannot delete a converted lead");
    }

    await leadRepository.softDelete(leadId);

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "lead_delete",
      entityType: "lead",
      entityId: leadId,
      metadata: { deletedLeadName: `${lead.firstName} ${lead.lastName}`, email: lead.email },
    });
  },

  async transfer(
    leadId: string,
    organizationId: string,
    input: TransferLeadInput,
    transferredBy: string
  ) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    const updated = await leadRepository.transfer(leadId, input.assignedToId, transferredBy);

    if (input.reason) {
      await noteRepository.create({
        organizationId,
        content: `Lead transferred. Reason: ${input.reason}`,
        entityType: "lead",
        entityId: leadId,
        createdByUserId: transferredBy,
      });
    }

    return updated;
  },

  async assign(
    leadId: string,
    organizationId: string,
    assignedToId: string,
    assignedBy: string
  ) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    const updated = await leadRepository.transfer(leadId, assignedToId, assignedBy);

    await auditLogRepository.create({
      organizationId,
      userId: assignedBy,
      action: "lead_assign",
      entityType: "lead",
      entityId: leadId,
      newValues: { assignedToId } as Prisma.InputJsonValue,
    });

    return updated;
  },

  async convert(
    leadId: string,
    organizationId: string,
    input: ConvertLeadInput,
    convertedBy: string
  ) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    if (lead.status === "converted") {
      throw new ForbiddenError("Lead is already converted");
    }

    // Create customer from lead
    const customer = await prisma.customer.create({
      data: {
        organizationId,
        firstName: input.firstName || lead.firstName,
        lastName: input.lastName || lead.lastName,
        email: input.email || lead.email,
        phone: input.phone || lead.phone,
        companyName: input.companyName || lead.companyName,
        industry: lead.industry,
        website: lead.website,
        source: lead.source,
        assignedToId: lead.assignedToId,
        teamId: lead.teamId,
        status: "active",
        tags: lead.tags,
      },
    });

    // Update lead
    const updated = await leadRepository.convertToCustomer(leadId, customer.id);

    // Optionally create deal
    if (input.createDeal && input.dealTitle) {
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { organizationId, isDefault: true },
        include: { stages: { orderBy: { position: "asc" }, take: 1 } },
      });

      if (defaultPipeline && defaultPipeline.stages.length > 0) {
        await prisma.deal.create({
          data: {
            organizationId,
            title: input.dealTitle,
            customerId: customer.id,
            pipelineId: defaultPipeline.id,
            stageId: defaultPipeline.stages[0].id,
            amount: input.dealAmount || lead.estimatedValue || 0,
            assignedToId: lead.assignedToId,
            teamId: lead.teamId,
            status: "open",
          },
        });
      }
    }

    await auditLogRepository.create({
      organizationId,
      userId: convertedBy,
      action: "lead_convert",
      entityType: "lead",
      entityId: leadId,
      newValues: { customerId: customer.id } as Prisma.InputJsonValue,
    });

    return { lead: updated, customer };
  },

  async checkDuplicates(organizationId: string, email?: string, phone?: string, companyName?: string, excludeId?: string) {
    return leadRepository.findDuplicates(organizationId, email, phone, companyName, excludeId);
  },

  // ─── Notes ──────────────────────────────────────────

  async addNote(
    leadId: string,
    organizationId: string,
    input: AddNoteInput,
    createdByUserId: string
  ) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    const note = await noteRepository.create({
      organizationId,
      content: input.content,
      entityType: "lead",
      entityId: leadId,
      isPinned: input.isPinned,
      createdByUserId,
    });

    return note;
  },

  async updateNote(noteId: string, leadId: string, input: UpdateNoteInput) {
    const note = await noteRepository.findById(noteId);
    if (!note || note.leadId !== leadId) {
      throw new NotFoundError("Note");
    }

    return noteRepository.update(noteId, input);
  },

  async deleteNote(noteId: string, leadId: string) {
    const note = await noteRepository.findById(noteId);
    if (!note || note.leadId !== leadId) {
      throw new NotFoundError("Note");
    }

    await noteRepository.softDelete(noteId);
  },

  async getNotes(leadId: string, organizationId: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    return noteRepository.findByEntity("lead", leadId);
  },

  // ─── Timeline ───────────────────────────────────────

  async getTimeline(leadId: string, organizationId: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundError("Lead");
    }

    return leadRepository.getTimeline(leadId);
  },

  // ─── Bulk Operations ────────────────────────────────

  async bulkAssign(leadIds: string[], assignedToId: string, organizationId: string, assignedBy: string) {
    const result = await leadRepository.bulkAssign(leadIds, assignedToId, organizationId);

    await auditLogRepository.create({
      organizationId,
      userId: assignedBy,
      action: "lead_bulk_assign",
      entityType: "lead",
      metadata: { leadIds, assignedToId, count: result.count },
    });

    return result;
  },

  async bulkUpdateStatus(leadIds: string[], status: string, organizationId: string, updatedBy: string) {
    const result = await leadRepository.bulkUpdateStatus(leadIds, status, organizationId);

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "lead_bulk_status_change",
      entityType: "lead",
      metadata: { leadIds, status, count: result.count },
    });

    return result;
  },

  async bulkUpdateRating(leadIds: string[], rating: string, organizationId: string, updatedBy: string) {
    const result = await leadRepository.bulkUpdateRating(leadIds, rating, organizationId);

    await auditLogRepository.create({
      organizationId,
      userId: updatedBy,
      action: "lead_bulk_rating_change",
      entityType: "lead",
      metadata: { leadIds, rating, count: result.count },
    });

    return result;
  },

  async bulkDelete(leadIds: string[], organizationId: string, deletedBy: string) {
    const result = await leadRepository.softDeleteMany(leadIds, organizationId);

    await auditLogRepository.create({
      organizationId,
      userId: deletedBy,
      action: "lead_bulk_delete",
      entityType: "lead",
      metadata: { leadIds, count: result.count },
    });

    return result;
  },

  // ─── Stats ──────────────────────────────────────────

  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    return leadRepository.getStats(organizationId, dateFrom, dateTo);
  },

  // ─── Import/Export ──────────────────────────────────

  async importLeads(leads: CreateLeadInput[], organizationId: string) {
    return leadRepository.importLeads(leads, organizationId);
  },

  async exportLeads(organizationId: string, filters: Parameters<typeof leadRepository.exportLeads>[1]) {
    return leadRepository.exportLeads(organizationId, filters);
  },
};
