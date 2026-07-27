import React from "react";
import type { Customer } from "../../types/customer";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

interface CustomerTableProps {
  customers: Customer[];
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

export function CustomerTable({
  customers,
  loading,
  selectedIds,
  onSelect,
  onSort,
  sortBy,
  sortOrder,
  onView,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));

  function handleSelectAll() {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(customers.map((c) => c.id));
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

  if (customers.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new customer.</p>
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
              <SortHeader field="name">Customer</SortHeader>
              <SortHeader field="industry">Industry</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacts</th>
              <SortHeader field="status">Status</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(customer.id) ? "bg-blue-50" : ""}`}
                onClick={() => onView(customer.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(customer.id)}
                    onChange={() => handleSelectOne(customer.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {customer.name[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.email || "No email"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{customer.industry || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{customer._count?.contacts || 0}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <CustomerStatusBadge status={customer.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {customer.annualRevenue ? `$${customer.annualRevenue.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {customer.assignedToUser
                    ? `${customer.assignedToUser.firstName} ${customer.assignedToUser.lastName}`
                    : "Unassigned"}
                </td>
                <td className="px-4 py-3 text-right text-sm space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onEdit(customer.id)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => onDelete(customer.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
