import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/user.api";
import { UserTable } from "../../components/users/UserTable";
import { UserFilterBar } from "../../components/users/UserFilterBar";
import { UserStatsCards } from "../../components/users/UserStatsCards";
import { BulkActionsBar } from "../../components/users/BulkActionsBar";
import type { UserWithRoles } from "../../types/user";

// ─── User List Page ────────────────────────────────────
// Main page for managing users in the organization.
// Features: table, search, filter, sort, bulk actions, pagination.

export function UserListPage() {
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    isActive: undefined as boolean | undefined,
    isSuspended: undefined as boolean | undefined,
    teamId: "",
    roleId: "",
    sortBy: "createdAt",
    sortOrder: "asc" as "asc" | "desc",
  });

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: 20,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search) params.search = filters.search;
      if (filters.isActive !== undefined) params.isActive = filters.isActive;
      if (filters.isSuspended !== undefined) params.isSuspended = filters.isSuspended;
      if (filters.teamId) params.teamId = filters.teamId;
      if (filters.roleId) params.roleId = filters.roleId;

      const result = await userApi.list(params as any);
      setUsers(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handlers
  function handleFilterChange(newFilters: typeof filters) {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  }

  function handleSort(field: string) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  }

  function handleView(userId: string) {
    navigate(`/users/${userId}`);
  }

  function handleEdit(userId: string) {
    navigate(`/users/${userId}/edit`);
  }

  async function handleSuspend(userId: string) {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    try {
      await userApi.suspend(userId, { reason });
      loadUsers();
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await userApi.remove(userId);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, roles, and team assignments for your organization.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/users/teams")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Manage Teams
          </button>
          <button
            onClick={() => navigate("/users/invite")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Invite User
          </button>
          <button
            onClick={() => navigate("/users/new")}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create User
          </button>
        </div>
      </div>

      {/* Stats */}
      <UserStatsCards />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onComplete={loadUsers}
      />

      {/* Filters */}
      <UserFilterBar filters={filters} onChange={handleFilterChange} />

      {/* Table */}
      <UserTable
        users={users}
        loading={loading}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onSort={handleSort}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onView={handleView}
        onEdit={handleEdit}
        onSuspend={handleSuspend}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
