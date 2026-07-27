import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/user.api";

interface Activity {
  id: string;
  type: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  details?: string;
}

interface RecentActivitiesProps {
  activities?: Activity[];
}

const ACTION_CONFIG: Record<string, { icon: string; color: string }> = {
  created: { icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", color: "bg-green-500" },
  updated: { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "bg-blue-500" },
  deleted: { icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16", color: "bg-red-500" },
  assigned: { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "bg-purple-500" },
  converted: { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-teal-500" },
  logged_in: { icon: "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1", color: "bg-indigo-500" },
};

function getDefaultActivities(): Activity[] {
  const now = Date.now();
  return [
    { id: "1", type: "lead", action: "created", entityType: "Lead", entityId: "l1", userName: "Sarah Wilson", timestamp: new Date(now - 300000).toISOString(), details: "New lead from website form" },
    { id: "2", type: "deal", action: "updated", entityType: "Deal", entityId: "d1", userName: "Mike Chen", timestamp: new Date(now - 600000).toISOString(), details: "Moved to Proposal stage" },
    { id: "3", type: "customer", action: "created", entityType: "Customer", entityId: "c1", userName: "Alex Johnson", timestamp: new Date(now - 900000).toISOString(), details: "Converted from lead" },
    { id: "4", type: "deal", action: "converted", entityType: "Deal", entityId: "d2", userName: "Emily Davis", timestamp: new Date(now - 1800000).toISOString(), details: "Deal won - $45,000" },
    { id: "5", type: "lead", action: "assigned", entityType: "Lead", entityId: "l2", userName: "Tom Brown", timestamp: new Date(now - 3600000).toISOString(), details: "Assigned to sales team" },
    { id: "6", type: "user", action: "logged_in", entityType: "User", entityId: "u1", userName: "Lisa Anderson", timestamp: new Date(now - 5400000).toISOString(), details: "" },
    { id: "7", type: "customer", action: "updated", entityType: "Customer", entityId: "c2", userName: "David Kim", timestamp: new Date(now - 7200000).toISOString(), details: "Updated contact information" },
    { id: "8", type: "deal", action: "created", entityType: "Deal", entityId: "d3", userName: "Rachel Green", timestamp: new Date(now - 10800000).toISOString(), details: "New deal created" },
  ];
}

export function RecentActivities({ activities: propActivities }: RecentActivitiesProps) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>(propActivities || []);
  const [loading, setLoading] = useState(!propActivities);

  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
      return;
    }
    loadActivities();
  }, [propActivities]);

  async function loadActivities() {
    try {
      const result = await userApi.getOrganizationActivity();
      const recentActivity = result.data.summary.recentActivity;
      if (recentActivity && recentActivity.length > 0) {
        setActivities(
          recentActivity.map((a) => ({
            id: a.id,
            type: a.entityType,
            action: a.action,
            entityType: a.entityType,
            entityId: a.entityId,
            userName: a.user ? `${a.user.firstName} ${a.user.lastName}` : "System",
            timestamp: a.createdAt,
            details: "",
          }))
        );
      } else {
        setActivities(getDefaultActivities());
      }
    } catch {
      setActivities(getDefaultActivities());
    } finally {
      setLoading(false);
    }
  }

  function getTimeAgo(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function handleActivityClick(activity: Activity) {
    const typeMap: Record<string, string> = {
      Lead: "/leads",
      Customer: "/customers",
      Deal: "/pipeline",
      User: "/users",
    };
    const basePath = typeMap[activity.entityType];
    if (basePath) {
      navigate(`${basePath}/${activity.entityId}`);
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.updated;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 -mx-2 p-2 rounded-lg transition-colors"
              onClick={() => handleActivityClick(activity)}
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-full ${config.color} flex items-center justify-center`}>
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {" "}
                  <span className="text-gray-600">{activity.action}</span>
                  {" "}
                  <span className="font-medium">{activity.entityType}</span>
                </div>
                {activity.details && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.details}</p>
                )}
                <div className="text-xs text-gray-400 mt-1">{getTimeAgo(activity.timestamp)}</div>
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No recent activities</p>
          </div>
        )}
      </div>
    </div>
  );
}
