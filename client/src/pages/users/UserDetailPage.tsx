import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userApi } from "../../api/user.api";
import { UserCard } from "../../components/users/UserCard";
import { ActivityLog } from "../../components/users/ActivityLog";
import { RoleSelector } from "../../components/users/RoleSelector";
import type { UserWithRoles } from "../../types/user";

// ─── User Detail Page ──────────────────────────────────
// Full view of a single user with profile card, roles, and activity.

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activity" | "roles" | "settings">("activity");
  const [editingRoles, setEditingRoles] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (userId) loadUser();
  }, [userId]);

  async function loadUser() {
    try {
      const result = await userApi.getById(userId!);
      setUser(result.data.user);
      setSelectedRoleIds(result.data.user.roles.map((r) => r.roleId));
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRoles() {
    if (!userId) return;
    try {
      await userApi.assignRoles(userId, selectedRoleIds);
      setEditingRoles(false);
      loadUser();
    } catch (error) {
      console.error("Failed to save roles:", error);
    }
  }

  async function handleSuspend() {
    if (!userId || !user) return;
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    try {
      await userApi.suspend(userId, { reason });
      loadUser();
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  }

  async function handleUnsuspend() {
    if (!userId) return;
    try {
      await userApi.unsuspend(userId);
      loadUser();
    } catch (error) {
      console.error("Failed to unsuspend user:", error);
    }
  }

  async function handleResetPassword() {
    if (!userId) return;
    const sendEmail = confirm("Send the new password to the user via email?");
    try {
      const result = await userApi.resetPassword(userId, { sendEmail });
      if (result.data.tempPassword) {
        alert(`Temporary password: ${result.data.tempPassword}`);
      } else {
        alert("Password reset email sent.");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
    }
  }

  async function handleDelete() {
    if (!userId) return;
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await userApi.remove(userId);
      navigate("/users");
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg" />
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">User not found</h2>
        <button
          onClick={() => navigate("/users")}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to users
        </button>
      </div>
    );
  }

  const isSuspended = user.lockedUntil && new Date(user.lockedUntil) > new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/users")}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - User Card */}
        <div className="lg:col-span-1">
          <UserCard
            user={user}
            onEdit={() => navigate(`/users/${userId}/edit`)}
            onSuspend={isSuspended ? handleUnsuspend : handleSuspend}
            onResetPassword={handleResetPassword}
            onDelete={handleDelete}
          />
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-2">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(["activity", "roles", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab: Activity */}
          {activeTab === "activity" && <ActivityLog userId={user.id} />}

          {/* Tab: Roles */}
          {activeTab === "roles" && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assigned Roles</h3>
                {!editingRoles ? (
                  <button
                    onClick={() => setEditingRoles(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit Roles
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingRoles(false);
                        setSelectedRoleIds(user.roles.map((r) => r.roleId));
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRoles}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {editingRoles ? (
                <RoleSelector
                  selectedRoleIds={selectedRoleIds}
                  onChange={setSelectedRoleIds}
                />
              ) : (
                <div className="space-y-3">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((ur) => (
                      <div
                        key={ur.roleId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{ur.role.name}</div>
                          {ur.role.description && (
                            <div className="text-sm text-gray-500">{ur.role.description}</div>
                          )}
                        </div>
                        {ur.role.isSystem && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            System
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No roles assigned.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Settings */}
          {activeTab === "settings" && (
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Email Verification</div>
                    <div className="text-sm text-gray-500">
                      {user.emailVerified ? "Email is verified" : "Email is not verified"}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.emailVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Account Status</div>
                    <div className="text-sm text-gray-500">
                      {isSuspended
                        ? `Suspended until ${new Date(user.lockedUntil!).toLocaleDateString()}`
                        : user.isActive
                        ? "Account is active"
                        : "Account is inactive"}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      isSuspended
                        ? "bg-yellow-100 text-yellow-800"
                        : user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {isSuspended ? "Suspended" : user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Reset Password</div>
                    <div className="text-sm text-gray-500">
                      Generate a new password for this user
                    </div>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-red-900">Danger Zone</div>
                    <div className="text-sm text-gray-500">
                      Permanently delete this user account
                    </div>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
