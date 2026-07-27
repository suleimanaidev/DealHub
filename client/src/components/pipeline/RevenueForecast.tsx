import React from "react";
import type { RevenueForecast as RevenueForecastType } from "../../types/deal";

// ─── Props ─────────────────────────────────────────────

interface RevenueForecastProps {
  forecast: RevenueForecastType;
}

// ─── Revenue Forecast Component ────────────────────────
// Displays revenue forecast with current/next month values,
// weighted pipeline value, and CSS-only bar chart visualization.

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueForecast({ forecast }: RevenueForecastProps) {
  const maxValue = Math.max(forecast.currentMonth.totalValue, forecast.nextMonth.totalValue, forecast.weightedPipeline, 1);
  const currentMonthPct = (forecast.currentMonth.totalValue / maxValue) * 100;
  const nextMonthPct = (forecast.nextMonth.totalValue / maxValue) * 100;
  const weightedPct = (forecast.weightedPipeline / maxValue) * 100;

  const bars = [
    {
      label: "This Month",
      value: forecast.currentMonth.totalValue,
      dealCount: forecast.currentMonth.deals.length,
      pct: currentMonthPct,
      color: "bg-blue-500",
    },
    {
      label: "Next Month",
      value: forecast.nextMonth.totalValue,
      dealCount: forecast.nextMonth.deals.length,
      pct: nextMonthPct,
      color: "bg-indigo-500",
    },
    {
      label: "Weighted Pipeline",
      value: forecast.weightedPipeline,
      dealCount: null,
      pct: weightedPct,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Forecast</h3>

      <div className="space-y-5">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">{bar.label}</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(bar.value)}</span>
                {bar.dealCount !== null && (
                  <span className="text-xs text-gray-400 ml-2">({bar.dealCount} deals)</span>
                )}
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${bar.color}`}
                style={{ width: `${Math.max(bar.pct, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500">Avg deal close</div>
          <div className="text-sm font-medium text-gray-900">
            {forecast.currentMonth.deals.length + forecast.nextMonth.deals.length > 0
              ? formatCurrency(
                  (forecast.currentMonth.totalValue + forecast.nextMonth.totalValue) /
                    (forecast.currentMonth.deals.length + forecast.nextMonth.deals.length)
                )
              : "$0"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Forecast confidence</div>
          <div className="text-sm font-medium text-gray-900">
            {forecast.weightedPipeline > 0 && forecast.currentMonth.totalValue + forecast.nextMonth.totalValue > 0
              ? `${((forecast.weightedPipeline / (forecast.currentMonth.totalValue + forecast.nextMonth.totalValue)) * 100).toFixed(0)}%`
              : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
