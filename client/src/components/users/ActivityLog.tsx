import React, { useState, useEffect } from "react";
import { userApi } from "../../api/user.api";
import type { AuditLog, ActivitySummary } from "../../types/user";

// ─── Props ─────────────────────────────────────────────

interface ActivityLogProps {
  userId: string;
}

// ─── Activity Log Component ────────────────────────────
// Shows a user's activity history and summary.
// Used in the UserDetailPage.

export function ActivityLog({ userId }: ActivityLogProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    loadData();
  }, [userId, page, actionFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryResult, logsResult] = await Promise.all([
        userApi.getActivitySummary(userId),
        userApi.getActivityLogs(userId, {
          page,
          limit: 15,
          action: actionFilter || undefined,
        }),
      ]);

      setSummary(summaryResult.data.summary);
      setLogs(logsResult.data);
      setTotalPages(logsResult.meta.totalPages);
    } catch (error) {
      console.error("Failed to load activity:", error);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action: string) {
    const colors: Record<string, string> = {
      login: "bg-green-100 text-green-800",
      logout: "bg-gray-100 text-gray-800",
      password_change: "bg-yellow-100 text-yellow-800",
      admin_password_reset: "bg-red-100 text-red-800",
      user_create: "bg-blue-100 text-blue-800",
      user_update: "bg-blue-50 text-blue-700",
      user_delete: "bg-red-50 text-red-700",
      user_suspend: "bg-orange-100 text-orange-800",
      user_unsuspend: "bg-green-50 text-green-700",
      user_role_change: "bg-purple-100 text-purple-800",
      user_invite: "bg-indigo-100 text-indigo-800",
      user_bulk_activate: "bg-blue-100 text-blue-800",
      user_bulk_deactivate: "bg-yellow-100 text-yellow-800",
      user_bulk_delete: "bg-red-100 text-red-800",
      user_bulk_role_assign: "bg-purple-100 text-purple-800",
      user_bulk_team_change: "bg-teal-100 text-teal-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  }

  function formatAction(action: string) {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getEntityName(log: AuditLog) {
    if (log.metadata?.deletedUserEmail) return log.metadata.deletedUserEmail as string;
    if (log.metadata?.invitedEmail) return log.metadata.invitedEmail as string;
    if (log.metadata?.deletedUserName) return log.metadata.deletedUserName as string;
    if (log.entityId) return log.entityId.slice(0, 8) + "...";
    return "";
  }

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  if (loading && !summary) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-20 bg-gray-200 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Summary */}
      {summary && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Summary (Last 30 Days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalActions}</div>
              <div className="text-xs text-gray-500">Total Actions</div>
            </div>
            {summary.byAction.slice(0, 3).map((item) => (
              <div key={item.action} className="text-center">
                <div className="text-2xl font-bold text-gray-700">{item.count}</div>
                <div className="text-xs text-gray-500">{formatAction(item.action)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {formatAction(action)}
            </option>
          ))}
        </select>
      </div>

      {/* Activity Timeline */}
      <div className="px-6 py-4">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No activity logs found</div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {logs.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== logs.length - 1 && (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getActionColor(
                            log.action
                          )}`}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {log.user
                                ? `${log.user.firstName} ${log.user.lastName}`
                                : "System"}
                            </span>{" "}
                            performed{" "}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(
                                log.action
                              )}`}
                            >
                              {formatAction(log.action)}
                            </span>
                            {log.entityType && (
                              <span className="text-gray-500">
                                {" "}
                                on {log.entityType}
                                {getEntityName(log) && ` (${getEntityName(log)})`}
                              </span>
                            )}
                          </p>
                          {log.newValues && (
                            <div className="mt-1 text-xs text-gray-500">
                              {Object.entries(log.newValues as Record<string, unknown>)
                                .filter(([key]) => !key.includes("hash") && !key.includes("password"))
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key}: {String(value).slice(0, 50)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
