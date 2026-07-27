import { apiClient } from "./client";
import type {
  Task,
  TaskStats,
  TaskNote,
  TaskListParams,
  CreateTaskInput,
  UpdateTaskInput,
  ApiResponse,
  PaginatedResponse,
} from "../types/task";

export const taskApi = {
  async list(params: TaskListParams = {}): Promise<PaginatedResponse<Task>> {
    const { data } = await apiClient.get("/tasks", { params });
    return data;
  },

  async getById(taskId: string): Promise<ApiResponse<{ task: Task }>> {
    const { data } = await apiClient.get(`/tasks/${taskId}`);
    return data;
  },

  async create(input: CreateTaskInput): Promise<ApiResponse<{ task: Task }>> {
    const { data } = await apiClient.post("/tasks", input);
    return data;
  },

  async update(taskId: string, input: UpdateTaskInput): Promise<ApiResponse<{ task: Task }>> {
    const { data } = await apiClient.patch(`/tasks/${taskId}`, input);
    return data;
  },

  async complete(taskId: string): Promise<ApiResponse<{ task: Task }>> {
    const { data } = await apiClient.post(`/tasks/${taskId}/complete`);
    return data;
  },

  async remove(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  async stats(): Promise<ApiResponse<{ stats: TaskStats }>> {
    const { data } = await apiClient.get("/tasks/stats");
    return data;
  },

  async getNotes(taskId: string): Promise<ApiResponse<{ notes: TaskNote[] }>> {
    const { data } = await apiClient.get(`/tasks/${taskId}/notes`);
    return data;
  },

  async addNote(taskId: string, content: string): Promise<ApiResponse<{ note: TaskNote }>> {
    const { data } = await apiClient.post(`/tasks/${taskId}/notes`, { content });
    return data;
  },

  async deleteNote(taskId: string, noteId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/notes/${noteId}`);
  },

  async reminders(): Promise<ApiResponse<{ reminders: Task[] }>> {
    const { data } = await apiClient.get("/tasks/reminders");
    return data;
  },
};
