import React from "react";
import type { UserWithRoles } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface UserCardProps {
  user: UserWithRoles;
  onEdit: () => void;
  onSuspend: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

// ─── User Card Component ───────────────────────────────
// Displays a user's profile information in a card layout.
// Used in the UserDetailPage sidebar.

export function UserCard({ user, onEdit, onSuspend, onResetPassword, onDelete }: UserCardProps) {
  const isSuspended = user.lockedUntil && new Date(user.lockedUntil) > new Date();

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header with avatar and name */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-16 w-16">
            {user.avatarUrl ? (
              <img className="h-16 w-16 rounded-full" src={user.avatarUrl} alt="" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.jobTitle && (
              <p className="text-sm text-gray-500">{user.jobTitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap gap-2">
        {user.isOwner && (
          <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
            Organization Owner
          </span>
        )}
        {user.isActive && (
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Active
          </span>
        )}
        {!user.isActive && (
          <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Inactive
          </span>
        )}
        {isSuspended && (
          <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Suspended until {new Date(user.lockedUntil!).toLocaleDateString()}
          </span>
        )}
        {user.emailVerified && (
          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Email Verified
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-6 py-4 space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Roles</dt>
          <dd className="mt-1">
            {user.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {user.roles.map((ur) => (
                  <span
                    key={ur.roleId}
                    className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded"
                  >
                    {ur.role.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">No roles assigned</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Team</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.team?.name || "Unassigned"}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.phone || "Not provided"}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Department</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.department || "Not assigned"}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Last Login</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString()
              : "Never logged in"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase">Created</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {new Date(user.createdAt).toLocaleDateString()}
          </dd>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Edit User
        </button>
        <button
          onClick={onResetPassword}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset Password
        </button>
        {!user.isOwner && (
          <>
            <button
              onClick={onSuspend}
              className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100"
            >
              {isSuspended ? "Unsuspend" : "Suspend"}
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
