import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { dealApi } from "../../api/deal.api";
import { RevenueForecast } from "../../components/pipeline/RevenueForecast";
import type { DealStats, RevenueForecast as RevenueForecastType } from "../../types/deal";

// ─── Pipeline Analytics Page ───────────────────────────
// Displays analytics for the sales pipeline including stats cards,
// revenue forecast, deals by stage chart, and win rate.

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PipelineAnalyticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DealStats | null>(null);
  const [forecast, setForecast] = useState<RevenueForecastType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResult, forecastResult] = await Promise.all([
        dealApi.stats(),
        dealApi.forecast(),
      ]);
      setStats(statsResult.data.stats);
      setForecast(forecastResult.data.forecast);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  const maxStageValue = Math.max(...stats.byStage.map((s) => s.value), 1);
  const avgDealSize = stats.totalDeals > 0 ? stats.wonValue / (stats.wonDeals || 1) : 0;

  const statCards = [
    {
      label: "Total Deals",
      value: stats.totalDeals.toString(),
      color: "text-gray-900",
      bgColor: "bg-white",
    },
    {
      label: "Open Deals",
      value: stats.openDeals.toString(),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Won Deals",
      value: stats.wonDeals.toString(),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Lost Deals",
      value: stats.lostDeals.toString(),
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(stats.pipelineValue),
      color: "text-blue-600",
      bgColor: "bg-white",
    },
    {
      label: "Won Value",
      value: formatCurrency(stats.wonValue),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Avg Deal Size",
      value: formatCurrency(avgDealSize),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      color: stats.winRate >= 50 ? "text-green-600" : "text-yellow-600",
      bgColor: stats.winRate >= 50 ? "bg-green-50" : "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Insights and metrics across your sales pipeline.
          </p>
        </div>
        <button
          onClick={() => navigate("/pipeline")}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Board
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bgColor} shadow rounded-lg p-4`}>
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast */}
        {forecast && <RevenueForecast forecast={forecast} />}

        {/* Deals by Stage */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Deals by Stage</h3>
          <div className="space-y-3">
            {stats.byStage.map((item) => {
              const pct = (item.value / maxStageValue) * 100;
              return (
                <div key={item.stageId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 truncate">{item.stageId}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-400">{item.count}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.byStage.length === 0 && (
              <p className="text-sm text-gray-400 italic">No stage data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Deals by Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Deals by Status</h3>
        {stats.byStatus.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.byStatus.map((item) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                open: { bg: "bg-blue-50", text: "text-blue-700" },
                won: { bg: "bg-green-50", text: "text-green-700" },
                lost: { bg: "bg-red-50", text: "text-red-700" },
              };
              const colors = statusColors[item.status.toLowerCase()] || { bg: "bg-gray-50", text: "text-gray-700" };
              return (
                <div key={item.status} className={`${colors.bg} rounded-lg p-4`}>
                  <div className={`text-sm font-medium ${colors.text} capitalize`}>{item.status}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{item.count}</div>
                  <div className="text-sm text-gray-500 mt-1">{formatCurrency(item.value)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No status data available</p>
        )}

        {/* Win Rate Display */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700">Win Rate</div>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden max-w-xs">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(stats.winRate, 100)}%` }}
              />
            </div>
            <span className="text-lg font-bold text-green-600">{stats.winRate.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.wonDeals} won out of {stats.wonDeals + stats.lostDeals} closed deals
          </p>
        </div>
      </div>
    </div>
  );
}
