import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { taskApi } from "../../api/task.api";
import type { Task } from "../../types/task";

interface TaskFormData {
  subject: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedToId: string;
  taskType: string;
  reminderAt: string;
  leadId: string;
  customerId: string;
  dealId: string;
}

export function TaskFormPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(taskId);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TaskFormData>({
    subject: "",
    description: "",
    status: "pending",
    priority: "medium",
    dueDate: "",
    assignedToId: "",
    taskType: "general",
    reminderAt: "",
    leadId: "",
    customerId: "",
    dealId: "",
  });

  useEffect(() => { if (taskId) loadTask(); }, [taskId]);

  async function loadTask() {
    try {
      const result = await taskApi.getById(taskId!);
      const t = result.data.task;
      setForm({
        subject: t.activity.subject || "",
        description: t.activity.description || "",
        status: t.activity.status || "pending",
        priority: t.activity.priority || "medium",
        dueDate: t.activity.dueDate ? new Date(t.activity.dueDate).toISOString().slice(0, 16) : "",
        assignedToId: t.activity.assignedTo || "",
        taskType: t.taskType || "general",
        reminderAt: t.reminderAt ? new Date(t.reminderAt).toISOString().slice(0, 16) : "",
        leadId: t.activity.leadId || "",
        customerId: t.activity.customerId || "",
        dealId: t.activity.dealId || "",
      });
    } catch (err) {
      console.error("Failed to load task:", err);
      setError("Failed to load task data");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: keyof TaskFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        subject: form.subject,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assignedToId: form.assignedToId || undefined,
        taskType: form.taskType,
        reminderAt: form.reminderAt || undefined,
        leadId: form.leadId || undefined,
        customerId: form.customerId || undefined,
        dealId: form.dealId || undefined,
      };

      if (isEditMode && taskId) {
        await taskApi.update(taskId, payload as any);
        navigate(`/tasks/${taskId}`);
      } else {
        const result = await taskApi.create(payload as any);
        navigate(`/tasks/${result.data.task.id}`);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to save task";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          {[...Array(6)].map((_, i) => (<div key={i} className="h-10 bg-gray-200 rounded" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? "Edit Task" : "Create New Task"}</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
          <input type="text" required value={form.subject} onChange={(e) => updateField("subject", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Task subject" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Task description..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={form.priority} onChange={(e) => updateField("priority", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.taskType} onChange={(e) => updateField("taskType", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="general">General</option>
              <option value="follow_up">Follow Up</option>
              <option value="meeting">Meeting</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="datetime-local" value={form.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
            <input type="datetime-local" value={form.reminderAt} onChange={(e) => updateField("reminderAt", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To (User ID)</label>
          <input type="text" value={form.assignedToId} onChange={(e) => updateField("assignedToId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="User UUID" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Lead ID</label>
            <input type="text" value={form.leadId} onChange={(e) => updateField("leadId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Customer ID</label>
            <input type="text" value={form.customerId} onChange={(e) => updateField("customerId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Deal ID</label>
            <input type="text" value={form.dealId} onChange={(e) => updateField("dealId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
