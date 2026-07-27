import React from "react";
import type { DealStats } from "../../types/deal";

// ─── Props ─────────────────────────────────────────────

interface DealStatsBarProps {
  stats: DealStats;
}

// ─── Deal Stats Bar Component ──────────────────────────
// Displays key pipeline metrics in a horizontal stat bar.
// Shows total value, open deals, win rate, won value, avg deal size.

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealStatsBar({ stats }: DealStatsBarProps) {
  const avgDealSize = stats.totalDeals > 0 ? stats.wonValue / (stats.wonDeals || 1) : 0;

  const items = [
    {
      label: "Pipeline Value",
      value: formatCurrency(stats.pipelineValue),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Open Deals",
      value: stats.openDeals.toString(),
      color: "text-gray-900",
      bgColor: "bg-gray-50",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      color: stats.winRate >= 50 ? "text-green-600" : "text-yellow-600",
      bgColor: stats.winRate >= 50 ? "bg-green-50" : "bg-yellow-50",
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
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`${item.bgColor} rounded-lg px-4 py-3 flex items-center justify-between`}
        >
          <span className="text-xs font-medium text-gray-500">{item.label}</span>
          <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
