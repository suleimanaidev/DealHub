import React, { useState } from "react";
import type { TaskListParams } from "../../types/task";

interface TaskFilterBarProps {
  filters: TaskListParams;
  onChange: (filters: TaskListParams) => void;
}

export function TaskFilterBar({ filters, onChange }: TaskFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function updateFilter(key: string, value: unknown) {
    onChange({ ...filters, [key]: value || undefined });
  }

  function clearFilters() {
    onChange({ page: 1, limit: 25, sortBy: "createdAt", sortOrder: "desc" });
    setSearchInput("");
  }

  const hasActiveFilters = filters.search || filters.status || filters.priority || filters.assignedToId || filters.overdueOnly === "true";

  return (
    <div className="bg-white shadow rounded-lg p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tasks by subject or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <select
          value={`${filters.sortBy || "createdAt"}-${filters.sortOrder || "desc"}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split("-");
            onChange({ ...filters, sortBy, sortOrder: sortOrder as "asc" | "desc" });
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="dueDate-asc">Due Date (Earliest)</option>
          <option value="dueDate-desc">Due Date (Latest)</option>
          <option value="priority-desc">Priority (High-Low)</option>
          <option value="subject-asc">Subject (A-Z)</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status || ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.priority || ""}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={() => updateFilter("overdueOnly", filters.overdueOnly === "true" ? undefined : "true")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
            filters.overdueOnly === "true"
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Overdue Only
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
