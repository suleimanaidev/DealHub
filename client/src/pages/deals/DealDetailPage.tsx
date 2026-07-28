import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { dealApi } from "../../api/deal.api";
import type { Deal, DealTimelineEntry } from "../../types/deal";

export function DealDetailPage() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [timeline, setTimeline] = useState<DealTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [moving, setMoving] = useState(false);

  const loadDeal = useCallback(async () => {
    if (!dealId) return;
    try {
      const [dealRes, timelineRes, pipelinesRes] = await Promise.all([
        dealApi.getById(dealId),
        dealApi.timeline(dealId).catch(() => ({ data: { timeline: [] as DealTimelineEntry[] } })),
        dealApi.listPipelines(),
      ]);
      const d = dealRes.data.deal;
      setDeal(d);
      setTimeline(timelineRes.data.timeline);
      setPipelines(pipelinesRes.data.pipelines);
      setSelectedStageId(d.stageId);
      setSelectedPipelineId(d.pipelineId);
    } catch {
      navigate("/pipeline");
    } finally {
      setLoading(false);
    }
  }, [dealId, navigate]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  async function handleMoveStage() {
    if (!dealId || !selectedStageId || selectedStageId === deal?.stageId) return;
    setMoving(true);
    try {
      await dealApi.moveStage(dealId, selectedStageId);
      await loadDeal();
    } catch (err) {
      console.error("Failed to move deal:", err);
    } finally {
      setMoving(false);
    }
  }

  async function handleAddNote() {
    if (!dealId || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await dealApi.addNote(dealId, newNote.trim());
      setNewNote("");
      const timelineRes = await dealApi.timeline(dealId);
      setTimeline(timelineRes.data.timeline);
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSubmittingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Deal not found.</p>
        <Link to="/pipeline" className="text-blue-600 hover:underline mt-2 inline-block">Back to Pipeline</Link>
      </div>
    );
  }

  const customerName = deal.customer
    ? deal.customer.companyName || deal.customer.name || `${deal.customer.firstName || ""} ${deal.customer.lastName || ""}`.trim() || "No name"
    : "No customer";

  const currentPipeline = pipelines.find((p) => p.id === deal.pipelineId);
  const currentStage = currentPipeline?.stages.find((s) => s.id === deal.stageId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/pipeline")} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
          <p className="text-sm text-gray-500">{customerName}</p>
        </div>
        <Link
          to={`/deals/${dealId}/edit`}
          className="ml-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Value</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: deal.currency || "USD", minimumFractionDigits: 0 }).format(deal.value)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Probability</dt>
                <dd className="text-lg font-semibold text-gray-900">{deal.probability}%</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expected Close</dt>
                <dd className="text-sm text-gray-900">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "Not set"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Stage</dt>
                <dd className="text-sm text-gray-900">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {(currentStage as any)?.name || deal.stage?.name || "Unknown"}
                  </span>
                </dd>
              </div>
              {deal.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500 mb-1">Tags</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {deal.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">{tag}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {deal.description && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes & Timeline</h2>
            <div className="flex gap-2 mb-6">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={2}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submittingNote}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 self-end"
              >
                {submittingNote ? "..." : "Add"}
              </button>
            </div>
            <div className="space-y-3">
              {timeline.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
              )}
              {timeline.map((entry) => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">{entry.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "System"} · {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Move Stage</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pipeline</label>
                <select
                  value={selectedPipelineId}
                  onChange={(e) => {
                    setSelectedPipelineId(e.target.value);
                    const p = pipelines.find((p) => p.id === e.target.value);
                    const firstStage = p?.stages?.[0];
                    if (firstStage) setSelectedStageId(firstStage.id);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {pipelines.find((p) => p.id === selectedPipelineId)?.stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleMoveStage}
                disabled={!selectedStageId || selectedStageId === deal.stageId || moving}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {moving ? "Moving..." : "Move Deal"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignee</h2>
            {deal.assignedUser ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {deal.assignedUser.firstName[0]}{deal.assignedUser.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{deal.assignedUser.firstName} {deal.assignedUser.lastName}</p>
                  <p className="text-xs text-gray-500">Assigned</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Unassigned</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{new Date(deal.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated</dt>
                <dd className="text-sm text-gray-900">{new Date(deal.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
