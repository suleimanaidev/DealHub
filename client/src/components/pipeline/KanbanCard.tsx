import React from "react";
import type { Deal } from "../../types/deal";

// ─── Props ─────────────────────────────────────────────

interface KanbanCardProps {
  deal: Deal;
  onClick: (dealId: string) => void;
}

// ─── Kanban Card Component ─────────────────────────────
// Displays a single deal card within a Kanban column.
// Shows title, customer, value, assignee, due date, and tags.

export function KanbanCard({ deal, onClick }: KanbanCardProps) {
  const customerName = deal.customer
    ? deal.customer.companyName || deal.customer.name || `${deal.customer.firstName || ""} ${deal.customer.lastName || ""}`.trim()
    : "No customer";

  const assigneeInitials = deal.assignedUser
    ? `${deal.assignedUser.firstName[0]}${deal.assignedUser.lastName[0]}`
    : null;

  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: deal.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(deal.value);

  const formattedDate = deal.expectedCloseDate
    ? new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/plain", deal.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onClick(deal.id)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <h4 className="text-sm font-medium text-gray-900 truncate">{deal.title}</h4>
      <p className="text-xs text-gray-500 mt-1 truncate">{customerName}</p>

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-semibold text-gray-900">{formattedValue}</span>
        {formattedDate && (
          <span className="text-xs text-gray-400">{formattedDate}</span>
        )}
      </div>

      {(deal.tags.length > 0 || assigneeInitials) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          {deal.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 min-w-0">
              {deal.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded truncate max-w-[80px]"
                >
                  {tag}
                </span>
              ))}
              {deal.tags.length > 2 && (
                <span className="text-[10px] text-gray-400">+{deal.tags.length - 2}</span>
              )}
            </div>
          ) : (
            <div />
          )}
          {assigneeInitials && (
            <div className="flex-shrink-0 ml-2">
              {deal.assignedUser?.avatarUrl ? (
                <img
                  className="h-6 w-6 rounded-full"
                  src={deal.assignedUser.avatarUrl}
                  alt={`${deal.assignedUser.firstName} ${deal.assignedUser.lastName}`}
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-600">{assigneeInitials}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
