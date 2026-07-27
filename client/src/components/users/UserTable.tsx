import React, { useState, useMemo } from "react";
import type { UserWithRoles } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface UserTableProps {
  users: UserWithRoles[];
  loading?: boolean;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onView: (userId: string) => void;
  onEdit: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onDelete: (userId: string) => void;
}

// ─── User Table Component ──────────────────────────────

export function UserTable({
  users,
  loading,
  selectedIds,
  onSelect,
  onSort,
  sortBy,
  sortOrder,
  onView,
  onEdit,
  onSuspend,
  onDelete,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.includes(u.id));

  function handleSelectAll() {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(users.map((u) => u.id));
    }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  }

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    const isActive = sortBy === field;
    const arrow = isActive ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => onSort(field)}
      >
        {children}
        {arrow}
      </th>
    );
  }

  function UserStatusBadge({ user }: { user: UserWithRoles }) {
    if (user.isOwner) {
      return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Owner</span>;
    }
    if (!user.isActive) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
  }

  function UserRoles({ roles }: { roles: UserWithRoles["roles"] }) {
    if (!roles || roles.length === 0) {
      return <span className="text-sm text-gray-400 italic">No roles</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.slice(0, 2).map((ur) => (
          <span
            key={ur.roleId}
            className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded"
          >
            {ur.role.name}
          </span>
        ))}
        {roles.length > 2 && (
          <span className="px-2 py-0.5 text-xs text-gray-500">
            +{roles.length - 2} more
          </span>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 px-4 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </th>
              <SortHeader field="firstName">User</SortHeader>
              <SortHeader field="email">Email</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
              <SortHeader field="isActive">Status</SortHeader>
              <SortHeader field="lastLoginAt">Last Login</SortHeader>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(user.id) ? "bg-blue-50" : ""}`}
                onClick={() => onView(user.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => handleSelectOne(user.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.avatarUrl ? (
                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.jobTitle || "No title"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <UserRoles roles={user.roles} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.team?.name || "Unassigned"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <UserStatusBadge user={user} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-right text-sm space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEdit(user.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onSuspend(user.id)}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
