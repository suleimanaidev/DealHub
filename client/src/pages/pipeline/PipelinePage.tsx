import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dealApi } from "../../api/deal.api";
import { KanbanBoard } from "../../components/pipeline/KanbanBoard";
import type { Pipeline } from "../../types/deal";

// ─── Pipeline Page ─────────────────────────────────────
// Main pipeline page containing the Kanban board.
// Provides pipeline management controls and navigation.

export function PipelinePage() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineDesc, setNewPipelineDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPipelines();
  }, []);

  async function loadPipelines() {
    try {
      const result = await dealApi.listPipelines();
      setPipelines(result.data.pipelines);
      if (result.data.pipelines.length > 0 && !selectedPipelineId) {
        const defaultPipeline = result.data.pipelines.find((p) => p.isDefault) || result.data.pipelines[0];
        if (defaultPipeline?.id) {
          setSelectedPipelineId(defaultPipeline.id);
        }
      }
    } catch (error) {
      console.error("Failed to load pipelines:", error);
    }
  }

  async function handleCreatePipeline() {
    if (!newPipelineName.trim()) return;
    setCreating(true);
    try {
      const result = await dealApi.createPipeline({
        name: newPipelineName.trim(),
        description: newPipelineDesc.trim() || undefined,
      });
      setPipelines((prev) => [...prev, result.data.pipeline]);
      setSelectedPipelineId(result.data.pipeline.id);
      setShowCreateModal(false);
      setNewPipelineName("");
      setNewPipelineDesc("");
    } catch (error) {
      console.error("Failed to create pipeline:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your deals through each stage of the sales process.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/pipeline/analytics")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Analytics
          </button>
          <button
            onClick={() => navigate("/deals/new")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Add Deal
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Pipeline
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard pipelineId={selectedPipelineId} />

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Pipeline</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Enterprise Sales"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newPipelineDesc}
                  onChange={(e) => setNewPipelineDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe this pipeline..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPipelineName("");
                  setNewPipelineDesc("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePipeline}
                disabled={!newPipelineName.trim() || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
