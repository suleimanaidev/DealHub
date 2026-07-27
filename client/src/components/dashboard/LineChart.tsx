import React from "react";

interface LineChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
  height?: number;
}

export function LineChart({ data, title, color = "#3B82F6", height = 200 }: LineChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = 100;
  const chartHeight = 100;
  const innerWidth = chartWidth - padding.left / 2 - padding.right / 2;
  const innerHeight = chartHeight - padding.top / 2 - padding.bottom / 2;

  const points = data.map((d, i) => ({
    x: padding.left / 2 + (i / Math.max(data.length - 1, 1)) * innerWidth,
    y: padding.top / 2 + innerHeight - (d.value / max) * innerHeight,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top / 2 + innerHeight} L ${points[0].x} ${padding.top / 2 + innerHeight} Z`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((max / yTicks) * i)
  );

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {yTickValues.map((tick) => {
            const y = padding.top / 2 + innerHeight - (tick / max) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left / 2}
                  y1={y}
                  x2={chartWidth - padding.right / 2}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="0.3"
                  strokeDasharray="1,1"
                />
                <text
                  x={padding.left / 2 - 2}
                  y={y + 1}
                  textAnchor="end"
                  className="fill-gray-400"
                  fontSize="3"
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill={color} opacity="0.1" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="1.5" fill="white" stroke={color} strokeWidth="0.8" />
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x = padding.left / 2 + (i / Math.max(data.length - 1, 1)) * innerWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - 2}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize="3"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
