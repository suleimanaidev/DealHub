import { apiClient } from "./client";
import type {
  Lead,
  LeadWithDetails,
  LeadStats,
  LeadTimelineEntry,
  Note,
  LeadListParams,
  CreateLeadInput,
  UpdateLeadInput,
  ConvertLeadInput,
  PaginatedResponse,
  ApiResponse,
} from "../types/lead";

export const leadApi = {
  async list(params: LeadListParams = {}): Promise<PaginatedResponse<Lead>> {
    const { data } = await apiClient.get("/leads", { params });
    return data;
  },

  async getById(leadId: string): Promise<ApiResponse<{ lead: LeadWithDetails }>> {
    const { data } = await apiClient.get(`/leads/${leadId}`);
    return data;
  },

  async create(input: CreateLeadInput): Promise<ApiResponse<{ lead: Lead; duplicates?: Lead[]; warning?: string }>> {
    const { data } = await apiClient.post("/leads", input);
    return data;
  },

  async createForce(input: CreateLeadInput): Promise<ApiResponse<{ lead: Lead }>> {
    const { data } = await apiClient.post("/leads/force", input);
    return data;
  },

  async update(leadId: string, input: UpdateLeadInput): Promise<ApiResponse<{ lead: Lead }>> {
    const { data } = await apiClient.patch(`/leads/${leadId}`, input);
    return data;
  },

  async remove(leadId: string): Promise<void> {
    await apiClient.delete(`/leads/${leadId}`);
  },

  async assign(leadId: string, assignedToId: string): Promise<ApiResponse<{ lead: Lead }>> {
    const { data } = await apiClient.post(`/leads/${leadId}/assign`, { assignedToId });
    return data;
  },

  async transfer(leadId: string, input: { assignedToId: string | null; reason?: string }): Promise<ApiResponse<{ lead: Lead }>> {
    const { data } = await apiClient.post(`/leads/${leadId}/transfer`, input);
    return data;
  },

  async convert(leadId: string, input: ConvertLeadInput): Promise<ApiResponse<{ lead: Lead; customer: unknown }>> {
    const { data } = await apiClient.post(`/leads/${leadId}/convert`, input);
    return data;
  },

  async checkDuplicates(params: { email?: string; phone?: string; companyName?: string; excludeId?: string }) {
    const { data } = await apiClient.get("/leads/check-duplicates", { params });
    return data;
  },

  async stats(params: { dateFrom?: string; dateTo?: string } = {}): Promise<ApiResponse<{ stats: LeadStats }>> {
    const { data } = await apiClient.get("/leads/stats", { params });
    return data;
  },

  async timeline(leadId: string): Promise<ApiResponse<{ timeline: LeadTimelineEntry[] }>> {
    const { data } = await apiClient.get(`/leads/${leadId}/timeline`);
    return data;
  },

  async getNotes(leadId: string): Promise<ApiResponse<{ notes: Note[] }>> {
    const { data } = await apiClient.get(`/leads/${leadId}/notes`);
    return data;
  },

  async addNote(leadId: string, content: string, isPinned?: boolean): Promise<ApiResponse<{ note: Note }>> {
    const { data } = await apiClient.post(`/leads/${leadId}/notes`, { content, isPinned });
    return data;
  },

  async updateNote(leadId: string, noteId: string, content: string): Promise<ApiResponse<{ note: Note }>> {
    const { data } = await apiClient.patch(`/leads/${leadId}/notes/${noteId}`, { content });
    return data;
  },

  async deleteNote(leadId: string, noteId: string): Promise<void> {
    await apiClient.delete(`/leads/${leadId}/notes/${noteId}`);
  },

  async bulkAssign(leadIds: string[], assignedToId: string): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/leads/bulk/assign", { leadIds, assignedToId });
    return data;
  },

  async bulkUpdateStatus(leadIds: string[], status: string): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/leads/bulk/status", { leadIds, status });
    return data;
  },

  async bulkDelete(leadIds: string[]): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post("/leads/bulk/delete", { leadIds });
    return data;
  },

  async exportLeads(params: { status?: string; assignedToId?: string; dateFrom?: string; dateTo?: string }) {
    const { data } = await apiClient.get("/leads/export", { params });
    return data;
  },

  async importLeads(leads: CreateLeadInput[]): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    const { data } = await apiClient.post("/leads/import", { leads });
    return data;
  },
};
