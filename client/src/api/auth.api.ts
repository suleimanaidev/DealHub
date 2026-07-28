import axios from "axios";
import { apiClient, setAccessToken } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    if (data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
    }
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) {
    const { data } = await publicClient.post("/auth/register", payload);
    return data;
  },

  async logout() {
    await apiClient.post("/auth/logout");
    setAccessToken(null);
  },

  async me() {
    const { data } = await publicClient.get("/auth/me");
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await apiClient.post("/auth/change-password", { currentPassword, newPassword });
    return data;
  },

  async refreshToken() {
    const { data } = await publicClient.post("/auth/refresh", {});
    if (data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
    }
    return data;
  },
};
