import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "../../api/customer.api";
import { CustomerTable } from "../../components/customers/CustomerTable";
import { CustomerFilterBar } from "../../components/customers/CustomerFilterBar";
import { CustomerStatsCards } from "../../components/customers/CustomerStatsCards";
import type { Customer, CustomerListParams } from "../../types/customer";

export function CustomerListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<CustomerListParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerApi.list({ ...filters, page });
      setCustomers(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function handleFilterChange(newFilters: CustomerListParams) {
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
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your customers and their accounts.</p>
        </div>
        <button
          onClick={() => navigate("/customers/new")}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create Customer
        </button>
      </div>

      <CustomerStatsCards />

      <CustomerFilterBar filters={filters} onChange={handleFilterChange} />

      <CustomerTable
        customers={customers}
        loading={loading}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onSort={handleSort}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onView={(id) => navigate(`/customers/${id}`)}
        onEdit={(id) => navigate(`/customers/${id}/edit`)}
        onDelete={async (id) => {
          if (!confirm("Delete this customer?")) return;
          await customerApi.remove(id);
          loadCustomers();
        }}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} customers
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
