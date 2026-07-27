import React, { useState, useEffect } from "react";
import { userApi } from "../../api/user.api";
import type { Role, Team } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

// ─── Bulk Actions Bar Component ────────────────────────
// Appears when users are selected in the table.
// Provides bulk activate, deactivate, delete, assign role, change team.

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onComplete,
}: BulkActionsBarProps) {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showRoleDropdown || showTeamDropdown) {
      loadData();
    }
  }, [showRoleDropdown, showTeamDropdown]);

  async function loadData() {
    try {
      const [rolesRes, teamsRes] = await Promise.all([
        userApi.getAvailableRoles(),
        userApi.listTeams(),
      ]);
      setRoles(rolesRes.data.roles);
      setTeams(teamsRes.data.teams);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  async function handleBulkAction(action: string, params?: Record<string, unknown>) {
    if (!confirm(`Are you sure you want to ${action} ${selectedCount} users?`)) return;

    setLoading(true);
    try {
      switch (action) {
        case "activate":
          await userApi.bulkActivate(selectedIds);
          break;
        case "deactivate":
          await userApi.bulkDeactivate(selectedIds);
          break;
        case "delete":
          await userApi.bulkDelete(selectedIds);
          break;
        case "assignRole":
          if (params?.roleId) {
            await userApi.bulkAssignRole(selectedIds, params.roleId as string);
          }
          break;
        case "changeTeam":
          await userApi.bulkChangeTeam(selectedIds, (params?.teamId as string) || null);
          break;
      }
      onClearSelection();
      onComplete();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    } finally {
      setLoading(false);
      setShowRoleDropdown(false);
      setShowTeamDropdown(false);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-800">
          {selectedCount} user{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear selection
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Activate */}
        <button
          onClick={() => handleBulkAction("activate")}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 disabled:opacity-50"
        >
          Activate
        </button>

        {/* Deactivate */}
        <button
          onClick={() => handleBulkAction("deactivate")}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100 disabled:opacity-50"
        >
          Deactivate
        </button>

        {/* Assign Role */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowTeamDropdown(false);
            }}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100 disabled:opacity-50"
          >
            Assign Role ▾
          </button>
          {showRoleDropdown && (
            <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleBulkAction("assignRole", { roleId: role.id })}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {role.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Change Team */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTeamDropdown(!showTeamDropdown);
              setShowRoleDropdown(false);
            }}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-300 rounded-md hover:bg-teal-100 disabled:opacity-50"
          >
            Change Team ▾
          </button>
          {showTeamDropdown && (
            <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
              <button
                onClick={() => handleBulkAction("changeTeam", { teamId: null })}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Unassign
              </button>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleBulkAction("changeTeam", { teamId: team.id })}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => handleBulkAction("delete")}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
