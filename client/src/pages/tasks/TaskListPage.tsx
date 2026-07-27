import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { taskApi } from "../../api/task.api";
import { TaskTable } from "../../components/tasks/TaskTable";
import { TaskFilterBar } from "../../components/tasks/TaskFilterBar";
import { TaskStatsCards } from "../../components/tasks/TaskStatsCards";
import type { Task, TaskListParams } from "../../types/task";

export function TaskListPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<TaskListParams>({
    page: 1,
    limit: 25,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await taskApi.list({ ...filters, page });
      setTasks(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function handleFilterChange(newFilters: TaskListParams) {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  }

  function handleSort(field: string) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  }

  async function handleComplete(taskId: string) {
    try {
      await taskApi.complete(taskId);
      loadTasks();
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    try {
      await taskApi.remove(taskId);
      loadTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track all your tasks.</p>
        </div>
        <button onClick={() => navigate("/tasks/new")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Create Task
        </button>
      </div>

      <TaskStatsCards />

      <TaskFilterBar filters={filters} onChange={handleFilterChange} />

      <TaskTable
        tasks={tasks}
        loading={loading}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onSort={handleSort}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onView={(id) => navigate(`/tasks/${id}`)}
        onComplete={handleComplete}
        onDelete={handleDelete}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} tasks
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <span className="px-3 py-2 text-sm text-gray-700">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
