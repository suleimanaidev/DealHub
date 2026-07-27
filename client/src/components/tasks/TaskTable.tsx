import React from "react";
import type { Task } from "../../types/task";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

interface TaskTableProps {
  tasks: Task[];
  loading?: boolean;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSort: (field: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onView: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskTable({
  tasks,
  loading,
  selectedIds,
  onSelect,
  onSort,
  sortBy,
  sortOrder,
  onView,
  onComplete,
  onDelete,
}: TaskTableProps) {
  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.includes(t.id));

  function handleSelectAll() {
    if (allSelected) { onSelect([]); } else { onSelect(tasks.map((t) => t.id)); }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) { onSelect(selectedIds.filter((i) => i !== id)); } else { onSelect([...selectedIds, id]); }
  }

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    const isActive = sortBy === field;
    const arrow = isActive ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none" onClick={() => onSort(field)}>
        {children}{arrow}
      </th>
    );
  }

  function formatDueDate(dateStr?: string) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const isOverdue = date < now;
    return (
      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
        {date.toLocaleDateString()}
        {isOverdue && " (Overdue)"}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 px-4 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
              </th>
              <SortHeader field="subject">Task</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <SortHeader field="priority">Priority</SortHeader>
              <SortHeader field="dueDate">Due Date</SortHeader>
              <SortHeader field="createdAt">Status</SortHeader>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(task.id) ? "bg-blue-50" : ""} ${task.activity.status === "completed" ? "opacity-60" : ""}`}
                onClick={() => onView(task.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => handleSelectOne(task.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{task.activity.subject}</div>
                  {task.activity.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">{task.activity.description}</div>
                  )}
                  {task.activity.lead && (
                    <div className="text-xs text-blue-500 mt-0.5">Lead: {task.activity.lead.firstName} {task.activity.lead.lastName}</div>
                  )}
                  {task.activity.customer && (
                    <div className="text-xs text-green-500 mt-0.5">Customer: {task.activity.customer.name || `${task.activity.customer.firstName} ${task.activity.customer.lastName}`}</div>
                  )}
                  {task.activity.deal && (
                    <div className="text-xs text-purple-500 mt-0.5">Deal: {task.activity.deal.title}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {task.activity.assignee ? `${task.activity.assignee.firstName} ${task.activity.assignee.lastName}` : "Unassigned"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <TaskPriorityBadge priority={task.activity.priority} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDueDate(task.activity.dueDate)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <TaskStatusBadge status={task.activity.status} />
                </td>
                <td className="px-4 py-3 text-right text-sm space-x-2" onClick={(e) => e.stopPropagation()}>
                  {task.activity.status !== "completed" && (
                    <button onClick={() => onComplete(task.id)} className="text-green-600 hover:text-green-800">Complete</button>
                  )}
                  <button onClick={() => onDelete(task.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
