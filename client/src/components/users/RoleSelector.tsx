import React, { useState, useEffect } from "react";
import { userApi } from "../../api/user.api";
import type { Role } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface RoleSelectorProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}

// ─── Role Selector Component ───────────────────────────
// Dropdown multi-select for choosing roles.
// Fetches available roles from the API on mount.

export function RoleSelector({
  selectedRoleIds,
  onChange,
  disabled = false,
  multiple = true,
}: RoleSelectorProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const result = await userApi.getAvailableRoles();
      setRoles(result.data.roles);
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(roleId: string) {
    if (disabled) return;

    if (multiple) {
      if (selectedRoleIds.includes(roleId)) {
        onChange(selectedRoleIds.filter((id) => id !== roleId));
      } else {
        onChange([...selectedRoleIds, roleId]);
      }
    } else {
      onChange([roleId]);
      setIsOpen(false);
    }
  }

  function getSelectedNames() {
    const selected = roles.filter((r) => selectedRoleIds.includes(r.id));
    if (selected.length === 0) return "Select roles...";
    if (selected.length === 1) return selected[0].name;
    return `${selected.length} roles selected`;
  }

  if (loading) {
    return (
      <div className="animate-pulse h-10 bg-gray-200 rounded-md" />
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`relative w-full bg-white border rounded-md pl-3 pr-10 py-2 text-left cursor-default ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : "border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        }`}
      >
        <span className="block truncate text-sm">{getSelectedNames()}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200">
          {roles.length === 0 ? (
            <div className="py-2 px-3 text-sm text-gray-500">No roles available</div>
          ) : (
            roles.map((role) => {
              const isSelected = selectedRoleIds.includes(role.id);
              return (
                <div
                  key={role.id}
                  className={`cursor-pointer select-none relative py-2 pl-10 pr-4 hover:bg-blue-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                  onClick={() => toggleRole(role.id)}
                >
                  {/* Checkbox */}
                  <span
                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                      isSelected ? "text-blue-600" : "text-transparent"
                    }`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>

                  {/* Role info */}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500 truncate">{role.description}</div>
                    )}
                    {role._count && (
                      <div className="text-xs text-gray-400">{role._count.users} users</div>
                    )}
                  </div>

                  {/* System badge */}
                  {role.isSystem && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                      System
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single Role Selector ──────────────────────────────
// For use in forms where only one role is needed.

interface SingleRoleSelectorProps {
  value: string | null;
  onChange: (roleId: string | null) => void;
  disabled?: boolean;
}

export function SingleRoleSelector({
  value,
  onChange,
  disabled = false,
}: SingleRoleSelectorProps) {
  const handleMultiChange = (roleIds: string[]) => {
    onChange(roleIds.length > 0 ? roleIds[0] : null);
  };

  return (
    <RoleSelector
      selectedRoleIds={value ? [value] : []}
      onChange={handleMultiChange}
      disabled={disabled}
      multiple={false}
    />
  );
}
