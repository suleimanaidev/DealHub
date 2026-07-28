import { apiClient } from './client';
import type { Notification, NotificationListResponse, UnreadCountResponse } from '../types/notification';

export const notificationApi = {
  async getAll(params?: { page?: number; limit?: number; isRead?: boolean; type?: string }) {
    const { data } = await apiClient.get<NotificationListResponse>('/notifications', { params });
    return data;
  },

  async getUnreadCount() {
    const { data } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data } = await apiClient.patch<Notification>(`/notifications/${notificationId}/read`);
    return data;
  },

  async markAllAsRead() {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data;
  },

  async delete(notificationId: string) {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  async deleteAll() {
    await apiClient.delete('/notifications/all');
  },
};
