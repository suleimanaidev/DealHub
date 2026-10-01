import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { leadApi } from "../../api/lead.api";
import { LeadStatusBadge } from "../../components/leads/LeadStatusBadge";
import type { LeadWithDetails, Note, LeadTimelineEntry } from "../../types/lead";

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "notes">("timeline");
  const [notes, setNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<LeadTimelineEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    if (leadId) loadLead();
  }, [leadId]);

  async function loadLead() {
    try {
      const result = await leadApi.getById(leadId!);
      setLead(result.data.lead);
      setNotes(result.data.lead.notes || []);
    } catch (error) {
      console.error("Failed to load lead:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline() {
    try {
      const result = await leadApi.timeline(leadId!);
      setTimeline(result.data.timeline);
    } catch (error) {
      console.error("Failed to load timeline:", error);
    }
  }

  useEffect(() => {
    if (activeTab === "timeline") loadTimeline();
  }, [activeTab]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      const result = await leadApi.addNote(leadId!, newNote);
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
      await leadApi.deleteNote(leadId!, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  }

  async function handleConvert() {
    const firstName = prompt("Customer first name:", lead?.firstName || "");
    if (!firstName) return;
    const companyName = prompt("Company name:", lead?.companyName || "");
    const createDeal = confirm("Create a deal for this customer?");
    try {
      await leadApi.convert(leadId!, { firstName, companyName: companyName || undefined, createDeal });
      loadLead();
    } catch (error) {
      console.error("Failed to convert lead:", error);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await leadApi.remove(leadId!);
      navigate("/leads");
    } catch (error) {
      console.error("Failed to delete lead:", error);
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

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Lead not found</h2>
        <button onClick={() => navigate("/leads")} className="mt-4 text-blue-600 hover:text-blue-800">
          Back to leads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/leads")} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-sm text-gray-500">{lead.email || "No email"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleConvert} className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
            Convert
          </button>
          <button onClick={() => navigate(`/leads/${leadId}/edit`)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Lead Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <LeadStatusBadge status={lead.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Score</span>
                <span className="font-medium">{lead.score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{lead.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Company</span>
                <span className="font-medium">{lead.companyName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Job Title</span>
                <span className="font-medium">{lead.jobTitle || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Source</span>
                <span className="font-medium">{typeof lead.source === "string" ? lead.source : lead.source?.name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium">
                  {typeof lead.assignedTo === "string"
                    ? lead.assignedTo
                    : lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(["timeline", "notes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "timeline" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {entry.user ? entry.user.firstName[0] : "?"}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm">
                          <span className="font-medium">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "System"}</span>
                          {" "}
                          <span className="text-gray-600">{entry.action}</span>
                        </div>
                        {entry.content && <p className="text-sm text-gray-500 mt-1">{entry.content}</p>}
                        <div className="text-xs text-gray-400 mt-1">{new Date(entry.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddNote}
                  disabled={noteLoading || !newNote.trim()}
                  className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
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
                    {note.isPinned && <span className="text-xs text-yellow-600 mt-1 inline-block">Pinned</span>}
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
