import { apiClient } from "./client";
import type {
  Deal,
  Pipeline,
  KanbanStage,
  DealStats,
  RevenueForecast,
  DealTimelineEntry,
  DealListParams,
  CreateDealInput,
  UpdateDealInput,
} from "../types/deal";
import type { ApiResponse, PaginatedResponse } from "../types/lead";

export const dealApi = {
  async list(params: DealListParams = {}): Promise<PaginatedResponse<Deal>> {
    const { data } = await apiClient.get("/deals", { params });
    return data;
  },

  async getById(dealId: string): Promise<ApiResponse<{ deal: Deal }>> {
    const { data } = await apiClient.get(`/deals/${dealId}`);
    return data;
  },

  async create(input: CreateDealInput): Promise<ApiResponse<{ deal: Deal }>> {
    const { data } = await apiClient.post("/deals", input);
    return data;
  },

  async update(dealId: string, input: UpdateDealInput): Promise<ApiResponse<{ deal: Deal }>> {
    const { data } = await apiClient.patch(`/deals/${dealId}`, input);
    return data;
  },

  async remove(dealId: string): Promise<void> {
    await apiClient.delete(`/deals/${dealId}`);
  },

  async moveStage(dealId: string, stageId: string): Promise<ApiResponse<{ deal: Deal }>> {
    const { data } = await apiClient.post(`/deals/${dealId}/move-stage`, { stageId });
    return data;
  },

  async assign(dealId: string, assignedToId: string): Promise<ApiResponse<null>> {
    const { data } = await apiClient.post(`/deals/${dealId}/assign`, { assignedToId });
    return data;
  },

  async stats(pipelineId?: string): Promise<ApiResponse<{ stats: DealStats }>> {
    const { data } = await apiClient.get("/deals/stats", { params: { pipelineId } });
    return data;
  },

  async forecast(): Promise<ApiResponse<{ forecast: RevenueForecast }>> {
    const { data } = await apiClient.get("/deals/forecast");
    return data;
  },

  async kanban(pipelineId?: string): Promise<ApiResponse<{ stages: KanbanStage[]; pipeline: Pipeline; totalValue: number }>> {
    const { data } = await apiClient.get("/deals/kanban", { params: { pipelineId } });
    return data;
  },

  async timeline(dealId: string): Promise<ApiResponse<{ timeline: DealTimelineEntry[] }>> {
    const { data } = await apiClient.get(`/deals/${dealId}/timeline`);
    return data;
  },

  async getNotes(dealId: string): Promise<ApiResponse<{ notes: unknown[] }>> {
    const { data } = await apiClient.get(`/deals/${dealId}/notes`);
    return data;
  },

  async addNote(dealId: string, content: string): Promise<ApiResponse<{ note: unknown }>> {
    const { data } = await apiClient.post(`/deals/${dealId}/notes`, { content });
    return data;
  },

  // ─── Pipeline ─────────────────────────────────────

  async listPipelines(): Promise<ApiResponse<{ pipelines: Pipeline[] }>> {
    const { data } = await apiClient.get("/deals/pipelines");
    return data;
  },

  async getPipeline(pipelineId: string): Promise<ApiResponse<{ pipeline: Pipeline }>> {
    const { data } = await apiClient.get(`/deals/pipelines/${pipelineId}`);
    return data;
  },

  async createPipeline(input: { name: string; description?: string }): Promise<ApiResponse<{ pipeline: Pipeline }>> {
    const { data } = await apiClient.post("/deals/pipelines", input);
    return data;
  },

  async updatePipeline(pipelineId: string, input: { name?: string; description?: string }): Promise<ApiResponse<{ pipeline: Pipeline }>> {
    const { data } = await apiClient.patch(`/deals/pipelines/${pipelineId}`, input);
    return data;
  },

  async deletePipeline(pipelineId: string): Promise<void> {
    await apiClient.delete(`/deals/pipelines/${pipelineId}`);
  },

  async createStage(pipelineId: string, input: { name: string; position: number; color?: string; probability?: number }): Promise<ApiResponse<{ stage: unknown }>> {
    const { data } = await apiClient.post(`/deals/pipelines/${pipelineId}/stages`, input);
    return data;
  },

  async updateStage(stageId: string, input: { name?: string; color?: string; probability?: number }): Promise<ApiResponse<{ stage: unknown }>> {
    const { data } = await apiClient.patch(`/deals/stages/${stageId}`, input);
    return data;
  },

  async deleteStage(stageId: string): Promise<void> {
    await apiClient.delete(`/deals/stages/${stageId}`);
  },

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<ApiResponse<null>> {
    const { data } = await apiClient.put(`/deals/pipelines/${pipelineId}/stages/reorder`, { stageIds });
    return data;
  },
};
