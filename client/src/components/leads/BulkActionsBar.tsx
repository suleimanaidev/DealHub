import React, { useState } from "react";
import { leadApi } from "../../api/lead.api";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onComplete,
}: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);

  async function handleBulkAction(action: string, params?: Record<string, unknown>) {
    if (!confirm(`Are you sure you want to ${action} ${selectedCount} leads?`)) return;
    setLoading(true);
    try {
      switch (action) {
        case "assign": {
          const toId = prompt("Enter the user ID to assign these leads to:");
          if (!toId) { setLoading(false); return; }
          await leadApi.bulkAssign(selectedIds, toId);
          break;
        }
        case "status": {
          const status = prompt("Enter new status (new, contacted, qualified, unqualified, converted, lost):");
          if (!status) { setLoading(false); return; }
          await leadApi.bulkUpdateStatus(selectedIds, status);
          break;
        }
        case "delete":
          await leadApi.bulkDelete(selectedIds);
          break;
      }
      onClearSelection();
      onComplete();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    } finally {
      setLoading(false);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-800">
          {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <button onClick={onClearSelection} className="text-sm text-blue-600 hover:text-blue-800">
          Clear selection
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleBulkAction("assign")}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100 disabled:opacity-50"
        >
          Assign
        </button>
        <button
          onClick={() => handleBulkAction("status")}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50"
        >
          Change Status
        </button>
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
