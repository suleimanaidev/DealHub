import React from "react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contacted", className: "bg-yellow-100 text-yellow-800" },
  qualified: { label: "Qualified", className: "bg-green-100 text-green-800" },
  unqualified: { label: "Unqualified", className: "bg-gray-100 text-gray-800" },
  converted: { label: "Converted", className: "bg-purple-100 text-purple-800" },
  lost: { label: "Lost", className: "bg-red-100 text-red-800" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
