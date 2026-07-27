import React, { useState } from "react";
import { KanbanCard } from "./KanbanCard";
import type { KanbanStage } from "../../types/deal";

// ─── Props ─────────────────────────────────────────────

interface KanbanColumnProps {
  stage: KanbanStage;
  onCardClick: (dealId: string) => void;
  onDrop: (dealId: string, stageId: string) => void;
}

// ─── Kanban Column Component ───────────────────────────
// Renders a single stage column in the Kanban board.
// Supports HTML5 drag-and-drop for moving deals between stages.

export function KanbanColumn({ stage, onCardClick, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(stage.totalValue);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) {
      onDrop(dealId, stage.id);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-shrink-0 w-72 flex flex-col rounded-lg transition-colors ${
        isDragOver ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-50"
      }`}
    >
      {/* Stage Header */}
      <div className="px-3 py-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-gray-700 truncate">{stage.name}</h3>
        <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
          {stage.deals.length}
        </span>
      </div>

      {/* Stage Value */}
      <div className="px-3 pb-2">
        <span className="text-xs text-gray-500 font-medium">{formattedValue}</span>
      </div>

      {/* Drop Zone / Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[80px]">
        {stage.deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Drop deal here
          </div>
        )}
        {stage.deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
