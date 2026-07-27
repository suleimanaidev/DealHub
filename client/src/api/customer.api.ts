import { apiClient } from "./client";
import type {
  Customer,
  CustomerContact,
  CustomerStats,
  CustomerTimelineEntry,
  CustomerListParams,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../types/customer";
import type { ApiResponse, PaginatedResponse } from "../types/lead";

export const customerApi = {
  async list(params: CustomerListParams = {}): Promise<PaginatedResponse<Customer>> {
    const { data } = await apiClient.get("/customers", { params });
    return data;
  },

  async getById(customerId: string): Promise<ApiResponse<{ customer: Customer }>> {
    const { data } = await apiClient.get(`/customers/${customerId}`);
    return data;
  },

  async create(input: CreateCustomerInput): Promise<ApiResponse<{ customer: Customer }>> {
    const { data } = await apiClient.post("/customers", input);
    return data;
  },

  async update(customerId: string, input: UpdateCustomerInput): Promise<ApiResponse<{ customer: Customer }>> {
    const { data } = await apiClient.patch(`/customers/${customerId}`, input);
    return data;
  },

  async remove(customerId: string): Promise<void> {
    await apiClient.delete(`/customers/${customerId}`);
  },

  async assign(customerId: string, assignedToId: string): Promise<ApiResponse<null>> {
    const { data } = await apiClient.post(`/customers/${customerId}/assign`, { assignedToId });
    return data;
  },

  async stats(): Promise<ApiResponse<{ stats: CustomerStats }>> {
    const { data } = await apiClient.get("/customers/stats");
    return data;
  },

  async getTimeline(customerId: string): Promise<ApiResponse<{ timeline: CustomerTimelineEntry[]; deals: unknown[] }>> {
    const { data } = await apiClient.get(`/customers/${customerId}/timeline`);
    return data;
  },

  async getContacts(customerId: string): Promise<ApiResponse<{ contacts: CustomerContact[] }>> {
    const { data } = await apiClient.get(`/customers/${customerId}/contacts`);
    return data;
  },

  async addContact(customerId: string, input: Partial<CustomerContact>): Promise<ApiResponse<{ contact: CustomerContact }>> {
    const { data } = await apiClient.post(`/customers/${customerId}/contacts`, input);
    return data;
  },

  async updateContact(customerId: string, contactId: string, input: Partial<CustomerContact>): Promise<ApiResponse<{ contact: CustomerContact }>> {
    const { data } = await apiClient.patch(`/customers/${customerId}/contacts/${contactId}`, input);
    return data;
  },

  async deleteContact(customerId: string, contactId: string): Promise<void> {
    await apiClient.delete(`/customers/${customerId}/contacts/${contactId}`);
  },

  async getNotes(customerId: string): Promise<ApiResponse<{ notes: unknown[] }>> {
    const { data } = await apiClient.get(`/customers/${customerId}/notes`);
    return data;
  },

  async addNote(customerId: string, content: string): Promise<ApiResponse<{ note: unknown }>> {
    const { data } = await apiClient.post(`/customers/${customerId}/notes`, { content });
    return data;
  },

  async getDeals(customerId: string): Promise<ApiResponse<{ deals: unknown[] }>> {
    const { data } = await apiClient.get(`/customers/${customerId}/deals`);
    return data;
  },
};
