import React from "react";

const RATING_CONFIG: Record<string, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-orange-100 text-orange-800" },
  warm: { label: "Warm", className: "bg-yellow-100 text-yellow-800" },
  cold: { label: "Cold", className: "bg-blue-100 text-blue-800" },
};

export function LeadRatingBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-sm text-gray-400 italic">None</span>;
  const config = RATING_CONFIG[rating] || { label: rating, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
