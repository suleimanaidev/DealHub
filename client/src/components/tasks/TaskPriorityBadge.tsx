import React from "react";

const PRIORITY_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  low: { label: "Low", className: "bg-gray-100 text-gray-800", dot: "bg-gray-400" },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-800", dot: "bg-blue-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-800", dot: "bg-orange-400" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-800", dot: "bg-red-400" },
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || { label: priority, className: "bg-gray-100 text-gray-800", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
