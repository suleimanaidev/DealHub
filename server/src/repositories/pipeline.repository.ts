import { Prisma, Pipeline, PipelineStage } from "@prisma/client";
import { prisma } from "../database";

export interface CreatePipelineInput {
  organizationId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  currency?: string;
}

export interface CreateStageInput {
  pipelineId: string;
  name: string;
  description?: string;
  position: number;
  color?: string;
  probability?: number;
  stageType?: string;
  rotDays?: number;
  rotAction?: string;
  autoAssignUserId?: string;
}

export const pipelineRepository = {
  async create(data: CreatePipelineInput): Promise<Pipeline> {
    return prisma.pipeline.create({ data });
  },

  async findById(id: string): Promise<Pipeline | null> {
    return prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { position: "asc" } },
        _count: { select: { deals: true } },
      },
    });
  },

  async findMany(organizationId: string): Promise<Pipeline[]> {
    return prisma.pipeline.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        stages: { orderBy: { position: "asc" } },
        _count: { select: { deals: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async update(id: string, data: Partial<CreatePipelineInput>): Promise<Pipeline> {
    return prisma.pipeline.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  // ─── Stages ───────────────────────────────────────

  async createStage(data: CreateStageInput): Promise<PipelineStage> {
    return prisma.pipelineStage.create({ data });
  },

  async updateStage(id: string, data: Partial<CreateStageInput>): Promise<PipelineStage> {
    return prisma.pipelineStage.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async deleteStage(id: string): Promise<void> {
    await prisma.pipelineStage.delete({ where: { id } });
  },

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    await prisma.$transaction(
      stageIds.map((stageId, index) =>
        prisma.pipelineStage.update({
          where: { id: stageId, pipelineId },
          data: { position: index },
        })
      )
    );
  },

  async getStageStats(pipelineId: string) {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { position: "asc" },
      include: {
        deals: {
          where: { deletedAt: null, status: "open" },
          select: { id: true, amount: true },
        },
      },
    });

    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      color: stage.color,
      dealCount: stage.deals.length,
      totalValue: stage.deals.reduce((sum, deal) => sum + deal.amount, 0),
    }));
  },
};
