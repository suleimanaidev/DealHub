import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { leadApi } from "../../api/lead.api";
import { LeadTable } from "../../components/leads/LeadTable";
import { LeadFilterBar } from "../../components/leads/LeadFilterBar";
import { LeadStatsCards } from "../../components/leads/LeadStatsCards";
import { BulkActionsBar } from "../../components/leads/BulkActionsBar";
import type { Lead, LeadListParams } from "../../types/lead";

export function LeadListPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<LeadListParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await leadApi.list({ ...filters, page });
      setLeads(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function handleFilterChange(newFilters: LeadListParams) {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  }

  function handleSort(field: string) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage your sales leads.</p>
        </div>
        <button
          onClick={() => navigate("/leads/new")}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create Lead
        </button>
      </div>

      <LeadStatsCards />

      <BulkActionsBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onComplete={loadLeads}
      />

      <LeadFilterBar filters={filters} onChange={handleFilterChange} />

      <LeadTable
        leads={leads}
        loading={loading}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onSort={handleSort}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onView={(id) => navigate(`/leads/${id}`)}
        onEdit={(id) => navigate(`/leads/${id}/edit`)}
        onDelete={async (id) => {
          if (!confirm("Delete this lead?")) return;
          await leadApi.remove(id);
          loadLeads();
        }}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} leads
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
