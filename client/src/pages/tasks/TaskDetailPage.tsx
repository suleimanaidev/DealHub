import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { taskApi } from "../../api/task.api";
import { TaskStatusBadge } from "../../components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "../../components/tasks/TaskPriorityBadge";
import type { Task, TaskNote } from "../../types/task";

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "notes">("details");
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => { if (taskId) loadTask(); }, [taskId]);

  async function loadTask() {
    try {
      const result = await taskApi.getById(taskId!);
      setTask(result.data.task);
      setNotes(result.data.task.activity.notes || []);
    } catch (error) {
      console.error("Failed to load task:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    try {
      await taskApi.complete(taskId!);
      loadTask();
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    try {
      await taskApi.remove(taskId!);
      navigate("/tasks");
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      const result = await taskApi.addNote(taskId!, newNote);
      setNotes([result.data.note, ...notes]);
      setNewNote("");
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setNoteLoading(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    try {
      await taskApi.deleteNote(taskId!, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg" />
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Task not found</h2>
        <button onClick={() => navigate("/tasks")} className="mt-4 text-blue-600 hover:text-blue-800">Back to tasks</button>
      </div>
    );
  }

  const a = task.activity;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/tasks")} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{a.subject}</h1>
            <p className="text-sm text-gray-500">Created by {a.creator.firstName} {a.creator.lastName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {a.status !== "completed" && (
            <button onClick={handleComplete} className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Complete</button>
          )}
          <button onClick={() => navigate(`/tasks/${taskId}/edit`)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Edit</button>
          <button onClick={handleDelete} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Task Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <TaskStatusBadge status={a.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Priority</span>
                <TaskPriorityBadge priority={a.priority} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due Date</span>
                <span className={`font-medium ${a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "completed" ? "text-red-600" : ""}`}>
                  {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium">
                  {a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{task.taskType}</span>
              </div>
              {task.reminderAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reminder</span>
                  <span className="font-medium">{new Date(task.reminderAt).toLocaleString()}</span>
                </div>
              )}
              {a.completedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-medium">{new Date(a.completedAt).toLocaleString()}</span>
                </div>
              )}
              {task.completer && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Completed By</span>
                  <span className="font-medium">{task.completer.firstName} {task.completer.lastName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {(a.lead || a.customer || a.deal) && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Linked Records</h4>
                <div className="space-y-2">
                  {a.lead && (
                    <button onClick={() => navigate(`/leads/${a.lead!.id}`)} className="text-sm text-blue-600 hover:text-blue-800 block">
                      Lead: {a.lead.firstName} {a.lead.lastName}
                    </button>
                  )}
                  {a.customer && (
                    <button onClick={() => navigate(`/customers/${a.customer!.id}`)} className="text-sm text-green-600 hover:text-green-800 block">
                      Customer: {a.customer.name || `${a.customer.firstName} ${a.customer.lastName}`}
                    </button>
                  )}
                  {a.deal && (
                    <button onClick={() => navigate(`/pipeline`)} className="text-sm text-purple-600 hover:text-purple-800 block">
                      Deal: {a.deal.title}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(["details", "notes"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                  {tab} {tab === "notes" && `(${notes.length})`}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "details" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              {a.description ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No description provided.</p>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <div className="mb-4">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={handleAddNote} disabled={noteLoading || !newNote.trim()} className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {noteLoading ? "Adding..." : "Add Note"}
                </button>
              </div>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {note.createdByUser ? `${note.createdByUser.firstName} ${note.createdByUser.lastName}` : "Unknown"}
                      </span>
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-gray-500">No notes yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
