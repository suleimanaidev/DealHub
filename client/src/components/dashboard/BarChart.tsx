import React from "react";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title: string;
  maxValue?: number;
}

export function BarChart({ data, title, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const defaultColors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end gap-3 h-48">
        {data.map((item, index) => {
          const heightPercent = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-600">
                {item.value.toLocaleString()}
              </span>
              <div className="w-full flex justify-center">
                <div
                  className={`w-full max-w-[40px] rounded-t-md ${item.color || defaultColors[index % defaultColors.length]} transition-all duration-500`}
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 text-center leading-tight">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
