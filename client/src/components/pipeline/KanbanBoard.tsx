import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { dealApi } from "../../api/deal.api";
import { KanbanColumn } from "./KanbanColumn";
import { DealStatsBar } from "./DealStatsBar";
import type { KanbanStage, Pipeline, DealStats } from "../../types/deal";

// ─── Props ─────────────────────────────────────────────

interface KanbanBoardProps {
  pipelineId?: string;
}

// ─── Kanban Board Component ────────────────────────────
// Main board that renders all stage columns horizontally.
// Fetches kanban data, handles drag-and-drop stage transitions,
// and provides pipeline selection.

export function KanbanBoard({ pipelineId: initialPipelineId }: KanbanBoardProps) {
  const navigate = useNavigate();
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(initialPipelineId);

  const loadKanban = useCallback(async () => {
    setLoading(true);
    try {
      const [kanbanResult, pipelinesResult] = await Promise.all([
        dealApi.kanban(selectedPipelineId),
        dealApi.listPipelines(),
      ]);
      setStages(kanbanResult.data.stages);
      setPipeline(kanbanResult.data.pipeline);
      setTotalValue(kanbanResult.data.totalValue);
      setPipelines(pipelinesResult.data.pipelines);
    } catch (error) {
      console.error("Failed to load kanban:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId]);

  const loadStats = useCallback(async () => {
    try {
      const result = await dealApi.stats(selectedPipelineId);
      setStats(result.data.stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    loadKanban();
    loadStats();
  }, [loadKanban, loadStats]);

  function handlePipelineChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value || undefined;
    setSelectedPipelineId(id);
  }

  function handleCardClick(dealId: string) {
    navigate(`/deals/${dealId}`);
  }

  async function handleDrop(dealId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (stage && stage.deals.some((d) => d.id === dealId)) return;

    setStages((prev) => {
      let movedDeal = null;
      const updated = prev.map((s) => {
        const deal = s.deals.find((d) => d.id === dealId);
        if (deal) {
          movedDeal = { ...deal, stageId };
          return { ...s, deals: s.deals.filter((d) => d.id !== dealId), totalValue: s.totalValue - deal.value };
        }
        return s;
      });
      if (!movedDeal) return prev;
      return updated.map((s) => {
        if (s.id === stageId) {
          return { ...s, deals: [...s.deals, movedDeal!], totalValue: s.totalValue + movedDeal!.value };
        }
        return s;
      });
    });

    try {
      await dealApi.moveStage(dealId, stageId);
      loadStats();
    } catch (error) {
      console.error("Failed to move deal:", error);
      loadKanban();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-96 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Selector + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {pipelines.length > 1 && (
            <select
              value={selectedPipelineId || ""}
              onChange={handlePipelineChange}
              className="text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {pipeline && (
            <h2 className="text-lg font-semibold text-gray-900">{pipeline.name}</h2>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Total pipeline:{" "}
          <span className="font-semibold text-gray-900">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }).format(totalValue)}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && <DealStatsBar stats={stats} />}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            onCardClick={handleCardClick}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
