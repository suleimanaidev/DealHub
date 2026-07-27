import React, { useState, useEffect } from "react";
import { userApi } from "../../api/user.api";
import type { Role, Team } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface UserFilterBarProps {
  filters: {
    search: string;
    isActive: boolean | undefined;
    isSuspended: boolean | undefined;
    teamId: string;
    roleId: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
  onChange: (filters: UserFilterBarProps["filters"]) => void;
}

// ─── User Filter Bar Component ─────────────────────────
// Search bar + filter dropdowns for the user list page.

export function UserFilterBar({ filters, onChange }: UserFilterBarProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  async function loadFilterOptions() {
    try {
      const [rolesRes, teamsRes] = await Promise.all([
        userApi.getAvailableRoles(),
        userApi.listTeams(),
      ]);
      setRoles(rolesRes.data.roles);
      setTeams(teamsRes.data.teams);
    } catch (error) {
      console.error("Failed to load filter options:", error);
    }
  }

  function updateFilter(key: string, value: unknown) {
    onChange({ ...filters, [key]: value });
  }

  function clearFilters() {
    onChange({
      search: "",
      isActive: undefined,
      isSuspended: undefined,
      teamId: "",
      roleId: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setSearchInput("");
  }

  const hasActiveFilters =
    filters.search ||
    filters.isActive !== undefined ||
    filters.isSuspended !== undefined ||
    filters.teamId ||
    filters.roleId;

  return (
    <div className="bg-white shadow rounded-lg p-4 space-y-4">
      {/* Search + Sort Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, phone, job title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split("-");
            onChange({ ...filters, sortBy, sortOrder: sortOrder as "asc" | "desc" });
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="firstName-asc">Name (A-Z)</option>
          <option value="firstName-desc">Name (Z-A)</option>
          <option value="email-asc">Email (A-Z)</option>
          <option value="lastLoginAt-desc">Last Login (Recent)</option>
          <option value="isActive-desc">Active First</option>
        </select>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <select
          value={filters.isActive === undefined ? "" : filters.isActive ? "active" : "inactive"}
          onChange={(e) => {
            const value = e.target.value === "" ? undefined : e.target.value === "active";
            updateFilter("isActive", value);
          }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Suspension Filter */}
        <select
          value={filters.isSuspended === undefined ? "" : filters.isSuspended ? "suspended" : "not_suspended"}
          onChange={(e) => {
            const value = e.target.value === "" ? undefined : e.target.value === "suspended";
            updateFilter("isSuspended", value);
          }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="not_suspended">Not Suspended</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Team Filter */}
        <select
          value={filters.teamId}
          onChange={(e) => updateFilter("teamId", e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Teams</option>
          <option value="unassigned">Unassigned</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team._count?.members || 0})
            </option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={filters.roleId}
          onChange={(e) => updateFilter("roleId", e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} ({role._count?.users || 0})
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
