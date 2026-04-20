import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { ContactForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { AdvancedFilters, type FilterValues } from "../components/AdvancedFilters";
import { contactsApi } from "../lib/api";
import type { Contact } from "../lib/types";
import { useInsights } from "../hooks/useInsights";
import { InsightBadge } from "../components/InsightBadge";
import { exportToCSV } from "../lib/helpers";

function stakeholderLabel(contact: Contact) {
  return contact.stakeholderRole ? contact.stakeholderRole.replaceAll("_", " ") : "No stakeholder role";
}

export default function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterValues | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedContact(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useInsights("contacts");

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", searchQuery, currentPage, pageSize],
    queryFn: () => contactsApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
    refetchInterval: 300000,
  });

  const contacts = contactsData?.content || [];
  const totalElements = contactsData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  const createMutation = useMutation({
    mutationFn: (data: any) => contactsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      showToast(`Contact "${variables.firstName} ${variables.lastName}" created successfully`, "success");
      setIsFormOpen(false);
      setSelectedContact(null);
    },
    onError: () => {
      showToast("Failed to create contact", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contactsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      showToast(`Contact "${variables.data.firstName} ${variables.data.lastName}" updated successfully`, "success");
      setIsFormOpen(false);
      setSelectedContact(null);
    },
    onError: () => {
      showToast("Failed to update contact", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      showToast("Contact deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setSelectedContact(null);
    },
    onError: () => {
      showToast("Failed to delete contact", "error");
    },
  });

  const filteredContacts = contacts.filter((contact) => {
    const matchesStatus = statusFilter === "all" || contact.status?.toLowerCase() === statusFilter;
    let matchesAdvancedFilters = true;
    if (activeFilters?.status && activeFilters.status.length > 0) {
      matchesAdvancedFilters = activeFilters.status.includes((contact.status || "").toLowerCase());
    }
    return matchesStatus && matchesAdvancedFilters;
  });

  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, activeFilters]);

  const statusCounts = {
    all: totalElements,
    active: contacts.filter((contact) => contact.status === "ACTIVE").length,
    inactive: contacts.filter((contact) => contact.status === "INACTIVE").length,
  };

  const getContactBadges = (contact: Contact): Array<{ type: "inactive"; label?: string }> => {
    const badges: Array<{ type: "inactive"; label?: string }> = [];
    if (contact.status === "INACTIVE") {
      badges.push({ type: "inactive" });
    }
    return badges;
  };

  return (
    <PageLayout>
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  exportToCSV(
                    filteredContacts,
                    [
                      { header: "First Name", accessor: "firstName" },
                      { header: "Last Name", accessor: "lastName" },
                      { header: "Email", accessor: "email" },
                      { header: "Phone", accessor: "phone" },
                      { header: "Title", accessor: "title" },
                      { header: "Department", accessor: "department" },
                      { header: "Stakeholder Role", accessor: (contact: Contact) => stakeholderLabel(contact) },
                      { header: "Influence", accessor: "influenceLevel" },
                      { header: "Company", accessor: (contact: Contact) => contact.companyName || contact.company?.name || "" },
                      { header: "Reports To", accessor: "reportsToName" },
                      { header: "Created At", accessor: (contact: Contact) => contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "" },
                    ],
                    "contacts"
                  );
                  showToast(`Exported ${filteredContacts.length} contacts to CSV`, "success");
                }}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedContact(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Create Contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total Contacts</p>
              <p className="text-xl font-semibold text-foreground">{totalElements}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Primary Stakeholders</p>
              <p className="text-xl font-semibold text-foreground">{contacts.filter((contact) => contact.isPrimary).length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Decision Makers</p>
              <p className="text-xl font-semibold text-foreground">{contacts.filter((contact) => contact.stakeholderRole === "DECISION_MAKER").length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">High Influence</p>
              <p className="text-xl font-semibold text-foreground">{contacts.filter((contact) => contact.influenceLevel === "HIGH").length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFiltersOpen(true)}
                className={cn(
                  "px-3 py-2 rounded border text-sm flex items-center gap-2",
                  activeFilters ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
              >
                <Icons.Filter size={16} />
                Filters
                {activeFilters && <span className="w-2 h-2 bg-primary-foreground rounded-full" />}
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 rounded border",
                  viewMode === "table" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Table view"
              >
                <Icons.List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded border",
                  viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Grid view"
              >
                <Icons.LayoutDashboard size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border -mb-px">
            {[
              { value: "all", label: "All Contacts" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative",
                  statusFilter === tab.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-secondary">
                  {statusCounts[tab.value as keyof typeof statusCounts]}
                </span>
                {statusFilter === tab.value && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl bg-card">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contact Name</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {(contact.firstName?.charAt(0) || contact.email?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{contact.firstName} {contact.lastName}</span>
                          {contact.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Primary
                            </span>
                          )}
                          {getContactBadges(contact).map((badge, idx) => (
                            <InsightBadge key={idx} type={badge.type} label={badge.label} />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.reportsToName ? `Reports to ${contact.reportsToName}` : stakeholderLabel(contact)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{contact.companyName || "N/A"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    <div>{contact.title || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">{contact.department || stakeholderLabel(contact)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{contact.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{contact.phone || contact.mobile || "N/A"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full",
                        contact.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      {contact.status ? `${contact.status.charAt(0)}${contact.status.slice(1).toLowerCase()}` : "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit contact"
                      >
                        <Icons.Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors"
                        aria-label="Delete contact"
                      >
                        <Icons.Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                  {(contact.firstName?.charAt(0) || contact.email?.charAt(0) || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground truncate">{contact.firstName} {contact.lastName}</h3>
                    {contact.isPrimary && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Primary
                      </span>
                    )}
                    {getContactBadges(contact).map((badge, idx) => (
                      <InsightBadge key={idx} type={badge.type} label={badge.label} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{contact.title || "N/A"}</p>
                  <p className="text-xs text-muted-foreground truncate">{contact.companyName || "N/A"}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icons.Mail size={14} />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icons.Phone size={14} />
                  <span>{contact.phone || contact.mobile || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icons.Users size={14} />
                  <span>{stakeholderLabel(contact)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      contact.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {contact.status ? `${contact.status.charAt(0)}${contact.status.slice(1).toLowerCase()}` : "N/A"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {contact.reportsToName ? `Reports to ${contact.reportsToName}` : (contact.lastContactDate || "No recent contact")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      )}

      {!isLoading && contacts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No contacts found</p>
        </div>
      )}

      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} contacts
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
              currentPage === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i;
            else if (currentPage < 3) pageNum = i;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 5 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded transition-colors",
                  currentPage === pageNum ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
                )}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={cn(
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
      </div>

      <ContactForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedContact(null);
        }}
        onSubmit={(data) => {
          if (selectedContact?.id) {
            updateMutation.mutate({ id: selectedContact.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={selectedContact || undefined}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedContact(null);
        }}
        onConfirm={() => {
          if (selectedContact?.id) {
            deleteMutation.mutate(selectedContact.id);
          }
        }}
        title="Delete Contact"
        message={`Are you sure you want to delete "${selectedContact?.firstName} ${selectedContact?.lastName}"? This action cannot be undone.`}
        variant="danger"
      />

      <AdvancedFilters
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onApply={(filters) => {
          setActiveFilters(filters);
          showToast("Filters applied successfully", "success");
        }}
        statusOptions={["active", "inactive"]}
      />
    </PageLayout>
  );
}
