import React from "react";
import type { Lead } from "../../types/lead";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadRatingBadge } from "./LeadRatingBadge";

interface LeadTableProps {
  leads: Lead[];
  loading?: boolean;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onSort: (field: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LeadTable({
  leads,
  loading,
  selectedIds,
  onSelect,
  onSort,
  sortBy,
  sortOrder,
  onView,
  onEdit,
  onDelete,
}: LeadTableProps) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.includes(l.id));

  function handleSelectAll() {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(leads.map((l) => l.id));
    }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  }

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    const isActive = sortBy === field;
    const arrow = isActive ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => onSort(field)}
      >
        {children}
        {arrow}
      </th>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 px-4 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new lead.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </th>
              <SortHeader field="firstName">Lead</SortHeader>
              <SortHeader field="companyName">Company</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="score">Score</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(lead.id) ? "bg-blue-50" : ""}`}
                onClick={() => onView(lead.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => handleSelectOne(lead.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {lead.firstName[0]}{lead.lastName ? lead.lastName[0] : ""}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{lead.email || "No email"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {lead.companyName || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {lead.source?.name || lead.source || "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {lead.score}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <LeadRatingBadge rating={lead.tags?.[0]} />
                </td>
                <td className="px-4 py-3 text-right text-sm space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onEdit(lead.id)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => onDelete(lead.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
