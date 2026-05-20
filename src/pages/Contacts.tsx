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
import { getInsightBadgesForEntity, useInsights, type InsightBadgeView } from "../hooks/useInsights";
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

  const { insights } = useInsights("contacts");

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

  const getContactBadges = (contact: Contact): InsightBadgeView[] => {
    const badges: InsightBadgeView[] = [];
    if (contact.status === "INACTIVE") {
      badges.push({ type: "inactive" });
    }
    return badges;
  };

  const getCanonicalContactBadges = (contact: Contact) => {
    const aiBadges = getInsightBadgesForEntity(insights, "contact", contact.id);
    return aiBadges.length > 0 ? aiBadges : getContactBadges(contact);
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[26px] leading-none font-semibold text-foreground">Contacts</h1>
          </div>

          <div className="mt-4 mb-3 w-full overflow-hidden rounded-[1.05rem] border border-border/60 bg-background/55 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icons.Users size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Total Contacts</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{totalElements}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Live contact records</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.Star size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Primary Stakeholders</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{contacts.filter((contact) => contact.isPrimary).length}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Key relationship owners</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/60">
                    <Icons.CheckCircle size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Decision Makers</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{contacts.filter((contact) => contact.stakeholderRole === "DECISION_MAKER").length}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">High-priority buying contacts</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.TrendingUp size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">High Influence</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{contacts.filter((contact) => contact.influenceLevel === "HIGH").length}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Strong internal champions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-2.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div className="relative min-w-0 flex-1 lg:max-w-[720px]">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8.5 pr-3.5 text-[13px] border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              <button
                onClick={() => setIsFiltersOpen(true)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 px-3 text-[11px] font-medium transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)]",
                  activeFilters ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-secondary"
                )}
              >
                <Icons.Filter size={14} />
                Filters
                {activeFilters && <span className="w-2 h-2 bg-primary-foreground rounded-full" />}
              </button>
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
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)] hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={13} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedContact(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors shadow-[0_3px_12px_rgba(37,99,235,0.18)] hover:bg-primary/90"
              >
                <Icons.Plus size={13} />
                Create Contact
              </button>
              <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-background p-0.5 shadow-[0_3px_12px_rgba(15,23,42,0.035)]">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-colors",
                  viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
                aria-label="Table view"
              >
                <Icons.List size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-colors",
                  viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
                aria-label="Grid view"
              >
                <Icons.LayoutDashboard size={15} />
              </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-2.5 mt-1 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: "all", label: "All Contacts" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                  statusFilter === tab.value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/70"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums",
                  statusFilter === tab.value ? "bg-primary-foreground/16 text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {statusCounts[tab.value as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Name</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {(contact.firstName?.charAt(0) || contact.email?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{contact.firstName} {contact.lastName}</span>
                          {contact.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Primary
                            </span>
                          )}
                          {getCanonicalContactBadges(contact).map((badge, idx) => (
                            <InsightBadge key={idx} type={badge.type} label={badge.label} title={badge.title} />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.reportsToName ? `Reports to ${contact.reportsToName}` : stakeholderLabel(contact)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-foreground">{contact.companyName || "N/A"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                    <div>{contact.title || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">{contact.department || stakeholderLabel(contact)}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">{contact.email}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">{contact.phone || contact.mobile || "N/A"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full",
                        contact.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      {contact.status ? `${contact.status.charAt(0)}${contact.status.slice(1).toLowerCase()}` : "N/A"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm">
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
        <div className="grid grid-cols-1 gap-2.5 rounded-[1.2rem] border border-border/70 bg-card/70 p-2.5 md:grid-cols-2 xl:grid-cols-4">
          {filteredContacts.map((contact) => {
            const initials = `${contact.firstName?.charAt(0) || ""}${contact.lastName?.charAt(0) || contact.email?.charAt(0) || "?"}`.toUpperCase();
            const companyLabel = contact.companyName || contact.company?.name || "No company yet";
            const statusTone = cn(
              "border",
              contact.status === "ACTIVE" ? "border-sky-200/80 bg-sky-50 text-sky-700" : "border-slate-200/80 bg-slate-100 text-slate-700"
            );
            const influenceTone = cn(
              contact.influenceLevel === "HIGH" && "border-sky-200/80 bg-sky-50 text-sky-700",
              contact.influenceLevel === "MEDIUM" && "border-amber-200/80 bg-amber-50 text-amber-700",
              (!contact.influenceLevel || contact.influenceLevel === "LOW") && "border-slate-200/80 bg-slate-100 text-slate-700"
            );

            return (
              <div
                key={contact.id}
                className="group relative overflow-hidden rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] shadow-[0_18px_40px_-36px_rgba(15,23,42,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_50px_-36px_rgba(37,99,235,0.35)]"
              >
                <div className="absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_60%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_52%)]" />
                <div className="absolute right-3 top-3 h-10 w-10 rounded-full bg-primary/6 blur-2xl transition-transform duration-300 group-hover:scale-125" />

                <div className="relative flex h-full flex-col p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/70 bg-white/80 text-[11px] font-semibold text-primary shadow-[0_10px_24px_-20px_rgba(37,99,235,0.55)] backdrop-blur">
                        {initials}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">{contact.firstName} {contact.lastName}</h3>
                          <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]", statusTone)}>
                            {contact.status || "Unknown"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{contact.title || stakeholderLabel(contact)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[8px] font-medium text-foreground/75">
                            {companyLabel}
                          </span>
                          {contact.isPrimary && (
                            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">
                              Primary
                            </span>
                          )}
                          {getCanonicalContactBadges(contact).map((badge, idx) => (
                            <span key={idx} className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-700">
                              {badge.label || badge.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={cn("inline-flex min-w-[2.45rem] flex-col items-center rounded-[0.85rem] border px-1.5 py-1 text-center shadow-sm", influenceTone)}>
                      <span className="text-[8px] font-semibold uppercase tracking-[0.16em] opacity-80">Influence</span>
                      <span className="mt-0.5 text-[10px] font-semibold leading-none">{contact.influenceLevel || "Low"}</span>
                    </div>
                  </div>

                  <div className="relative mt-2.5 overflow-hidden rounded-[0.9rem] border border-border/60 bg-white/75 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/45">Stakeholder</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/80">{stakeholderLabel(contact)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/45">Reports To</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/80">{contact.reportsToName || "Direct contact"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 rounded-[0.8rem] border border-border/60 bg-background/70 px-2 py-1.5">
                      <Icons.Mail size={13} className="shrink-0 text-primary/80" />
                      <span className="truncate text-[10px]">{contact.email || "No email provided"}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-[0.8rem] border border-border/60 bg-background/70 px-2 py-1.5">
                      <Icons.Phone size={13} className="shrink-0 text-primary/80" />
                      <span className="truncate text-[10px]">{contact.phone || contact.mobile || "No phone provided"}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/80 px-2 py-1 text-[9px] font-medium text-foreground">
                      <Icons.Users size={12} />
                      {contact.department || "No department"}
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground truncate text-right">
                      {contact.reportsToName ? `Reports to ${contact.reportsToName}` : (contact.lastContactDate || "No recent contact")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} contacts
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
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
                  "h-8 min-w-8 px-3 text-xs font-medium rounded-full transition-colors",
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
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
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
