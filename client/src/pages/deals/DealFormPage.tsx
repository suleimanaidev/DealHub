import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dealApi } from "../../api/deal.api";
import { customerApi } from "../../api/customer.api";

export function DealFormPage() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!dealId;

  const [form, setForm] = useState({
    title: "",
    customerId: "",
    amount: "",
    currency: "USD",
    pipelineId: "",
    stageId: "",
    assignedToId: "",
    probability: "0",
    expectedCloseDate: "",
    description: "",
    tags: "",
  });
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name?: string; firstName?: string; lastName?: string; companyName?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [pipelinesRes, customersRes] = await Promise.all([
        dealApi.listPipelines(),
        customerApi.list({ limit: 100 }).catch(() => ({ data: { customers: [] as any[] } }) as any),
      ]);
      setPipelines(pipelinesRes.data.pipelines);
      const customerList = customersRes.data?.customers || (customersRes as any).customers || [];
      setCustomers(customerList);

      const firstPipe = pipelinesRes.data.pipelines[0];
      if (firstPipe) {
        setForm((prev) => ({
          ...prev,
          pipelineId: firstPipe.id,
          stageId: firstPipe.stages[0]?.id || "",
        }));
      }

      if (isEditing && dealId) {
        const dealRes = await dealApi.getById(dealId);
        const d = dealRes.data.deal;
        setForm({
          title: d.title,
          customerId: d.customerId || "",
          amount: String(d.value || ""),
          currency: d.currency || "USD",
          pipelineId: d.pipelineId,
          stageId: d.stageId,
          assignedToId: d.assignedTo || "",
          probability: String(d.probability || 0),
          expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : "",
          description: d.description || "",
          tags: d.tags.join(", "),
        });
      }
    } catch (err) {
      console.error("Failed to load form data:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePipelineChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pipelineId = e.target.value;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    setForm((prev) => ({
      ...prev,
      pipelineId,
      stageId: pipeline?.stages[0]?.id || "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        customerId: form.customerId || undefined,
        amount: Number(form.amount) || 0,
        currency: form.currency,
        pipelineId: form.pipelineId,
        stageId: form.stageId,
        assignedToId: form.assignedToId || undefined,
        probability: Number(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        description: form.description.trim() || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      if (isEditing && dealId) {
        await dealApi.update(dealId, payload as any);
      } else {
        await dealApi.create(payload as any);
      }
      navigate("/pipeline");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save deal");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-96 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/pipeline")} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? "Edit Deal" : "New Deal"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Enterprise Software Deal"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 50000"
              />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select name="currency" value={form.currency} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline</label>
            <select value={form.pipelineId} onChange={handlePipelineChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select name="stageId" value={form.stageId} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {selectedPipeline?.stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select name="customerId" value={form.customerId} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName || c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
            <input name="probability" type="number" value={form.probability} onChange={handleChange} min="0" max="100" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <input name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input name="tags" value={form.tags} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. enterprise, hot, Q1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Description..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate("/pipeline")} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : isEditing ? "Update Deal" : "Create Deal"}
          </button>
        </div>
      </form>
    </div>
  );
}
