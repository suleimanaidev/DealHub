import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { customerApi } from "../../api/customer.api";
import { CustomerStatusBadge } from "../../components/customers/CustomerStatusBadge";
import type { Customer, CustomerContact } from "../../types/customer";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"contacts" | "deals" | "notes">("contacts");
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false });

  useEffect(() => {
    if (customerId) loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
    try {
      const [custRes, contactsRes, dealsRes, notesRes] = await Promise.all([
        customerApi.getById(customerId!),
        customerApi.getContacts(customerId!),
        customerApi.getDeals(customerId!),
        customerApi.getNotes(customerId!),
      ]);
      setCustomer(custRes.data.customer);
      setContacts(contactsRes.data.contacts);
      setDeals(dealsRes.data.deals);
      setNotes(notesRes.data.notes);
    } catch (error) {
      console.error("Failed to load customer:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this customer?")) return;
    try {
      await customerApi.remove(customerId!);
      navigate("/customers");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  }

  async function handleSaveContact() {
    try {
      if (editingContact) {
        const result = await customerApi.updateContact(customerId!, editingContact.id, contactForm);
        setContacts(contacts.map((c) => c.id === editingContact.id ? result.data.contact : c));
      } else {
        const result = await customerApi.addContact(customerId!, contactForm);
        setContacts([...contacts, result.data.contact]);
      }
      setShowContactForm(false);
      setEditingContact(null);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false });
    } catch (error) {
      console.error("Failed to save contact:", error);
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Delete this contact?")) return;
    try {
      await customerApi.deleteContact(customerId!, contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
    } catch (error) {
      console.error("Failed to delete contact:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg" />
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Customer not found</h2>
        <button onClick={() => navigate("/customers")} className="mt-4 text-blue-600 hover:text-blue-800">Back to customers</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/customers")} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">{customer.email || "No email"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/customers/${customerId}/edit`)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Customer Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <CustomerStatusBadge status={customer.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{customer.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Industry</span>
                <span className="font-medium">{customer.industry || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Revenue</span>
                <span className="font-medium">{customer.annualRevenue ? `$${customer.annualRevenue.toLocaleString()}` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">City</span>
                <span className="font-medium">{customer.city || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Country</span>
                <span className="font-medium">{customer.country || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium">
                  {customer.assignedToUser ? `${customer.assignedToUser.firstName} ${customer.assignedToUser.lastName}` : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(["contacts", "deals", "notes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab} ({tab === "contacts" ? contacts.length : tab === "deals" ? deals.length : notes.length})
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "contacts" && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                <button
                  onClick={() => { setShowContactForm(true); setEditingContact(null); setContactForm({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false }); }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Add Contact
                </button>
              </div>

              {showContactForm && (
                <div className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="First Name *" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    <input placeholder="Last Name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                    <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <input placeholder="Job Title" value={contactForm.jobTitle} onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full" />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })} className="h-4 w-4 text-blue-600" />
                    <label className="text-sm text-gray-700">Primary contact</label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveContact} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
                    <button onClick={() => { setShowContactForm(false); setEditingContact(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                        {contact.isPrimary && <span className="ml-2 text-xs text-blue-600">(Primary)</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contact.email} {contact.phone ? `• ${contact.phone}` : ""}
                      </div>
                      {contact.jobTitle && <div className="text-xs text-gray-400">{contact.jobTitle}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingContact(contact); setShowContactForm(true); setContactForm({ firstName: contact.firstName, lastName: contact.lastName || "", email: contact.email || "", phone: contact.phone || "", jobTitle: contact.jobTitle || "", isPrimary: contact.isPrimary }); }} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDeleteContact(contact.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && <p className="text-sm text-gray-500">No contacts yet.</p>}
              </div>
            </div>
          )}

          {activeTab === "deals" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deals</h3>
              {deals.length === 0 ? (
                <p className="text-sm text-gray-500">No deals for this customer.</p>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal: any) => (
                    <div key={deal.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{deal.title}</div>
                      <div className="text-sm text-gray-500">
                        ${deal.value?.toLocaleString() || "0"} • {deal.stage?.name || "Unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{note.content}</p>
                      <div className="text-xs text-gray-400 mt-1">{new Date(note.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
