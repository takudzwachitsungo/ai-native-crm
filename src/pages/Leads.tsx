import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { leadsApi } from "../lib/api";
import type { Lead } from "../lib/types";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { LeadForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { BulkActionsBar } from "../components/BulkActionsBar";
import { DetailSidebar } from "../components/DetailSidebar";
import { exportToCSV } from "../lib/helpers";
import { useAuth } from "../contexts/AuthContext";

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10); // Show 10 leads per page
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClick = () => { setDateDropdownOpen(false); setSourceDropdownOpen(false); };
    if (dateDropdownOpen || sourceDropdownOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [dateDropdownOpen, sourceDropdownOpen]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const ownerName = user?.firstName || user?.lastName ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") : "there";

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedLead(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch leads from API
  const { data: leadsData } = useQuery({
    queryKey: ['leads', filter, searchQuery, currentPage, pageSize],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        size: pageSize,
      };
      // Only add search if it's not empty
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      console.log('Fetching leads with params:', params, 'filter:', filter, 'searchQuery:', searchQuery);
      const result = await leadsApi.getAll(params);
      console.log('Leads API response:', result);
      return result;
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });

  const { data: leadStats } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsApi.getStatistics(),
    staleTime: 1000 * 60,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast('Lead deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      setSelectedLead(null);
    },
    onError: () => {
      showToast('Failed to delete lead', 'error');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => leadsApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`${ids.length} lead(s) deleted successfully`, 'success');
      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
    },
    onError: () => {
      showToast('Failed to delete selected leads', 'error');
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => leadsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`Lead "${variables.firstName} ${variables.lastName}" created successfully`, 'success');
      setIsFormOpen(false);
      setSelectedLead(null);
    },
    onError: (error: any) => {
      console.error('Create lead error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create lead';
      showToast(errorMessage, 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => leadsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`Lead "${variables.data.firstName} ${variables.data.lastName}" updated successfully`, 'success');
      setIsFormOpen(false);
      setSelectedLead(null);
    },
    onError: (error: any) => {
      console.error('Update lead error:', error);
      showToast('Failed to update lead', 'error');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadsApi.convertToCustomer(id),
    onSuccess: (result, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`Lead converted successfully to contact ${result.contactId}`, 'success');
      if (viewingLead?.id === leadId) {
        setDetailSidebarOpen(false);
        setViewingLead(null);
      }
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to convert lead', 'error');
    },
  });

  const leads = leadsData?.content || [];
  const totalElements = leadsData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Client-side filtering based on status (since the API doesn't handle status filter)
  const filteredLeads = leads.filter((lead) => {
    const matchesFilter = filter === "all" || lead.status.toUpperCase() === filter.toUpperCase();
    const fullName = `${lead.firstName} ${lead.lastName}`;
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (lead.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (dateFilter !== "all" && lead.createdAt) {
      const daysAgo = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysAgo);
      matchesDate = new Date(lead.createdAt) >= cutoff;
    }

    // Source filter
    const matchesSource = sourceFilter === "all" || (lead.source?.toUpperCase() === sourceFilter.toUpperCase());

    return matchesFilter && matchesSearch && matchesDate && matchesSource;
  });

  // Reset page to 0 when filter or search changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [filter, searchQuery, dateFilter, sourceFilter]);

  const statusCounts = {
    all: totalElements,
    new: leads.filter(l => l.status === "NEW").length,
    contacted: leads.filter(l => l.status === "CONTACTED").length,
    qualified: leads.filter(l => l.status === "QUALIFIED").length,
    unqualified: leads.filter(l => l.status === "UNQUALIFIED").length,
    lost: leads.filter(l => l.status === "LOST").length,
  };

  const leadStatCards = [
    {
      label: 'Total Leads',
      value: `${leadStats?.totalLeads ?? totalElements}`,
      meta: '— 0% vs last 30 days',
      icon: Icons.Users,
      accent: 'bg-blue-50',
      iconClassName: 'text-blue-700',
      metaClassName: 'text-muted-foreground',
    },
    {
      label: 'Avg Score',
      value: `${Math.round(leadStats?.averageScore ?? 0)}`,
      meta: '↑ 8% vs last 30 days',
      icon: Icons.Star,
      accent: 'bg-blue-50/80',
      iconClassName: 'text-blue-700',
      metaClassName: 'text-emerald-700',
    },
    {
      label: 'Conversion',
      value: `${Math.round(leadStats?.conversionRate ?? 0)}%`,
      meta: '↑ 12% vs last 30 days',
      icon: Icons.TrendingUp,
      accent: 'bg-blue-50/60',
      iconClassName: 'text-blue-700',
      metaClassName: 'text-emerald-700',
    },
    {
      label: 'Lead Value',
      value: `$${(Number(leadStats?.totalEstimatedValue ?? 0)).toLocaleString()}`,
      meta: '↑ 5% vs last 30 days',
      icon: Icons.CircleDollarSign,
      accent: 'bg-blue-50/80',
      iconClassName: 'text-blue-700',
      metaClassName: 'text-emerald-700',
    },
  ];

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.flatMap((lead) => (lead.id ? [lead.id] : []))));
    }
  };

  const toggleSelect = (id?: string) => {
    if (!id) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getLeadInitials = (lead: Lead) => {
    const initials = `${lead.firstName?.charAt(0) || ""}${lead.lastName?.charAt(0) || lead.email?.charAt(0) || "?"}`;
    return initials.toUpperCase();
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-[26px] leading-none font-semibold text-foreground">{greeting}, {ownerName}</h1>
                <p className="text-[13px] text-muted-foreground mt-1">Here is a friendly view of your leads pipeline.</p>
              </div>
            </div>

            <div className="mt-4 mb-3 flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
              <div className="w-full overflow-hidden rounded-[1.05rem] border border-border/60 bg-background/55 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
                  {leadStatCards.map((card, index) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={card.label}
                        className={cn(
                          "group relative min-w-0 px-2.5 py-2",
                          index < leadStatCards.length - 1 && "2xl:border-r 2xl:border-border/60"
                        )}
                      >
                        <div className="relative flex items-start gap-2.5">
                          <div className={cn("relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", card.accent)}>
                            <Icon size={14} className={card.iconClassName} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">
                              {card.label}
                            </p>
                            <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">
                              {card.value}
                            </p>
                            <p className={cn('mt-1 text-[0.58rem] font-medium leading-tight', card.metaClassName)}>{card.meta}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Search and Filters */}
            <div className="mb-2.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
              <div className="relative min-w-0 flex-1 lg:max-w-[720px]">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8.5 pr-3.5 text-[13px] border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDateDropdownOpen(!dateDropdownOpen); setSourceDropdownOpen(false); }}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 px-3 text-[11px] font-medium transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)]",
                      dateFilter !== "all" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-secondary"
                    )}
                  >
                    <Icons.Calendar size={13} className={dateFilter !== "all" ? "text-primary" : "text-muted-foreground"} />
                    <span>{{
                      all: "All time",
                      "7": "Last 7 days",
                      "30": "Last 30 days",
                      "90": "Last 90 days",
                      "180": "Last 6 months",
                      "365": "Last year",
                    }[dateFilter]}</span>
                    <Icons.ChevronDown size={11} className={cn("transition-transform", dateDropdownOpen && "rotate-180")} />
                  </button>
                  {dateDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-lg shadow-lg z-50 py-1">
                      {[
                        { value: "all", label: "All time" },
                        { value: "7", label: "Last 7 days" },
                        { value: "30", label: "Last 30 days" },
                        { value: "90", label: "Last 90 days" },
                        { value: "180", label: "Last 6 months" },
                        { value: "365", label: "Last year" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setDateFilter(opt.value); setDateDropdownOpen(false); setCurrentPage(0); }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors",
                            dateFilter === opt.value && "text-primary font-medium bg-primary/5"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSourceDropdownOpen(!sourceDropdownOpen); setDateDropdownOpen(false); }}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 px-3 text-[11px] font-medium transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)]",
                      sourceFilter !== "all" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-secondary"
                    )}
                  >
                    <Icons.TrendingUp size={13} className={sourceFilter !== "all" ? "text-primary" : "text-muted-foreground"} />
                    <span>{sourceFilter === "all" ? "All Sources" : sourceFilter}</span>
                    <Icons.ChevronDown size={11} className={cn("transition-transform", sourceDropdownOpen && "rotate-180")} />
                  </button>
                  {sourceDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-lg shadow-lg z-50 py-1">
                      {[
                        { value: "all", label: "All Sources" },
                        { value: "WEBSITE", label: "Website" },
                        { value: "REFERRAL", label: "Referral" },
                        { value: "COLD_CALL", label: "Cold Call" },
                        { value: "EMAIL", label: "Email" },
                        { value: "SOCIAL", label: "Social Media" },
                        { value: "EVENT", label: "Event" },
                        { value: "OTHER", label: "Other" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setSourceFilter(opt.value); setSourceDropdownOpen(false); setCurrentPage(0); }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors",
                            sourceFilter === opt.value && "text-primary font-medium bg-primary/5"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    exportToCSV(filteredLeads, [
                      { header: 'First Name', accessor: 'firstName' },
                      { header: 'Last Name', accessor: 'lastName' },
                      { header: 'Email', accessor: 'email' },
                      { header: 'Phone', accessor: 'phone' },
                      { header: 'Company', accessor: 'company' },
                      { header: 'Status', accessor: 'status' },
                      { header: 'Score', accessor: 'score' },
                      { header: 'Source', accessor: 'source' },
                      { header: 'Estimated Value', accessor: 'estimatedValue' },
                      { header: 'Created At', accessor: (l) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '' },
                    ], 'leads');
                    showToast(`Exported ${filteredLeads.length} leads to CSV`, 'success');
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)] hover:border-primary/30 hover:bg-secondary/60"
                >
                  <Icons.Download size={13} />
                  Export
                </button>

                <button
                  onClick={() => {
                    setSelectedLead(null);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors shadow-[0_3px_12px_rgba(37,99,235,0.18)] hover:bg-primary/90"
                >
                  <Icons.Plus size={13} />
                  Create Lead
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

            {/* Status Pipeline Bar */}
            <div className="rounded-2xl border border-border/70 bg-background p-2.5 mt-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {[
                    { value: "all", label: "All Leads" },
                    { value: "new", label: "New" },
                    { value: "contacted", label: "Contacted" },
                    { value: "qualified", label: "Qualified" },
                    { value: "unqualified", label: "Unqualified" },
                    { value: "lost", label: "Lost" },
                  ].map((tab) => {
                    const isActive = filter === tab.value;
                    const count = statusCounts[tab.value as keyof typeof statusCounts] ?? 0;

                    return (
                      <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={cn(
                          "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors shadow-[0_2px_8px_rgba(15,23,42,0.02)]",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/70"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums",
                            isActive
                              ? "bg-primary-foreground/16 text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    /* Mark status as complete */
                  }}
                  className="flex items-center gap-1.5 h-8 px-3 text-[11px] font-medium border border-primary/15 bg-primary/5 text-primary rounded-full hover:bg-primary/10 transition-colors whitespace-nowrap shadow-[0_4px_16px_rgba(37,99,235,0.08)]"
                >
                  <Icons.CheckCircle size={14} />
                  Mark Status as Complete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onDelete={() => setIsBulkDeleteOpen(true)}
          onDeselectAll={() => setSelectedIds(new Set())}
        />

        {/* Table View */}
        {filteredLeads.length === 0 ? (
          <EmptyState
            icon={<Icons.Users size={24} />}
            title="No leads found"
            description={searchQuery || filter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Get started by creating your first lead."}
            action={{
              label: "Create Lead",
              onClick: () => {
                setSelectedLead(null);
                setIsFormOpen(true);
              }
            }}
          />
        ) : viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="border-b border-border/60 text-left px-2 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-2.5 w-2.5 rounded-sm"
                        aria-label="Select all"
                        checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Name</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Score</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                    <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                      onClick={(e) => {
                        // Don't open sidebar if clicking checkbox or action buttons
                        if ((e.target as HTMLElement).closest('input, button')) return;
                        setViewingLead(lead);
                        setDetailSidebarOpen(true);
                      }}
                    >
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-2.5 w-2.5 rounded-sm"
                          aria-label="Select lead"
                          checked={lead.id ? selectedIds.has(lead.id) : false}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-primary/10 text-[10px] font-semibold text-primary shadow-sm">
                            {`${lead.firstName?.charAt(0) || ""}${lead.lastName?.charAt(0) || lead.email?.charAt(0) || "?"}`.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{lead.firstName} {lead.lastName}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              {lead.ownerName && <span>Owner: {lead.ownerName}</span>}
                              {lead.territory && <span>Territory: {lead.territory}</span>}
                              {lead.territoryMismatch && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                  Territory mismatch
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-foreground">{lead.company}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">{lead.email}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">{lead.phone}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden w-16">
                            <div
                              className={cn(
                                "h-full transition-all",
                                (lead.score ?? 0) >= 80 ? "bg-sky-500" : (lead.score ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${lead.score ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-7">{lead.score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 text-[11px] font-medium rounded-full",
                          lead.status === "QUALIFIED" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          lead.status === "UNQUALIFIED" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                          lead.status === "CONTACTED" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          lead.status === "NEW" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                          lead.status === "LOST" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-foreground">
                        {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsFormOpen(true);
                            }}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Edit lead"
                          >
                            <Icons.Edit size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors"
                            aria-label="Delete lead"
                          >
                            <Icons.Trash size={15} />
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
          /* Grid View */
          <div className="grid grid-cols-1 gap-3 rounded-[1.35rem] border border-border/70 bg-card/70 p-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredLeads.map((lead) => {
              const score = lead.score ?? 0;
              const initials = `${lead.firstName?.charAt(0) || ''}${lead.lastName?.charAt(0) || ''}`.trim() || '?';
              const scoreTone =
                score >= 80
                  ? "border-sky-200/80 bg-sky-50 text-sky-700"
                  : score >= 60
                    ? "border-amber-200/80 bg-amber-50 text-amber-700"
                    : "border-rose-200/80 bg-rose-50 text-rose-700";
              const statusTone = cn(
                "border",
                lead.status === "QUALIFIED" && "border-emerald-200/80 bg-emerald-50 text-emerald-700",
                lead.status === "UNQUALIFIED" && "border-orange-200/80 bg-orange-50 text-orange-700",
                lead.status === "CONTACTED" && "border-sky-200/80 bg-sky-50 text-sky-700",
                lead.status === "NEW" && "border-slate-200/80 bg-slate-100 text-slate-700",
                lead.status === "LOST" && "border-rose-200/80 bg-rose-50 text-rose-700"
              );

              return (
                <div
                  key={lead.id}
                  className="group relative overflow-hidden rounded-[1.1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_50px_-34px_rgba(37,99,235,0.35)]"
                >
                  <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_60%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_52%)]" />
                  <div className="absolute right-3 top-3 h-12 w-12 rounded-full bg-primary/6 blur-2xl transition-transform duration-300 group-hover:scale-125" />

                  <div
                    className="relative flex h-full flex-col p-3"
                    onClick={() => {
                      setViewingLead(lead);
                      setDetailSidebarOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/70 bg-white/80 text-[11px] font-semibold text-primary shadow-[0_10px_24px_-18px_rgba(37,99,235,0.55)] backdrop-blur">
                          {initials}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-[14px] font-semibold leading-tight text-foreground">
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]", statusTone)}>
                              {lead.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{lead.company || "No company yet"}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {lead.ownerName && (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75">
                                Owner {lead.ownerName}
                              </span>
                            )}
                            {lead.territory && (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75">
                                {lead.territory}
                              </span>
                            )}
                            {lead.territoryMismatch && (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                                Territory mismatch
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={cn("inline-flex min-w-[2.8rem] flex-col items-center rounded-[0.95rem] border px-1.5 py-1 text-center shadow-sm", scoreTone)}>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-80">Score</span>
                        <span className="mt-0.5 text-[1rem] font-semibold leading-none">{score}</span>
                      </div>
                    </div>

                    <div className="relative mt-3 overflow-hidden rounded-[1rem] border border-border/60 bg-white/75 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Estimated Value</p>
                          <p className="mt-0.5 text-[0.95rem] font-semibold leading-none text-foreground">
                            {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Source</p>
                          <p className="mt-0.5 truncate text-[12px] font-medium text-foreground/80">
                            {lead.source ? lead.source.replace(/_/g, ' ') : "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Mail size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{lead.email || "No email provided"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Phone size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{lead.phone || "No phone provided"}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingLead(lead);
                          setDetailSidebarOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <Icons.Eye size={13} />
                        View profile
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setIsFormOpen(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          aria-label="Edit lead"
                        >
                          <Icons.Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setIsDeleteModalOpen(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete lead"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Pagination */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
          <div className="text-xs text-muted-foreground">
            Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className={cn(
                "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
                currentPage === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-secondary"
              )}
            >
              Previous
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "h-8 min-w-8 px-3 text-xs font-medium rounded-full transition-colors",
                    currentPage === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-secondary"
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
                currentPage >= totalPages - 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-secondary"
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Lead Form Modal */}
      <LeadForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedLead(null);
        }}
        onSubmit={(data) => {
          // Form already provides firstName, lastName, etc.
          if (selectedLead?.id) {
            updateMutation.mutate({ id: selectedLead.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={selectedLead || undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedLead(null);
        }}
        onConfirm={() => {
          if (selectedLead?.id) {
            deleteMutation.mutate(selectedLead.id);
          }
        }}
        title="Delete Lead"
        message={`Are you sure you want to delete "${selectedLead?.firstName} ${selectedLead?.lastName}"? This action cannot be undone.`}
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={() => {
          if (selectedIds.size > 0) {
            bulkDeleteMutation.mutate(Array.from(selectedIds));
          }
        }}
        title="Delete Multiple Leads"
        message={`Are you sure you want to delete ${selectedIds.size} lead(s)? This action cannot be undone.`}
        variant="danger"
      />

      {/* Detail Sidebar */}
      {viewingLead && (
        <DetailSidebar
          isOpen={detailSidebarOpen}
          onClose={() => {
            setDetailSidebarOpen(false);
            setViewingLead(null);
          }}
          title={`${viewingLead.firstName} ${viewingLead.lastName}`}
          subtitle={viewingLead.company}
          onEdit={() => {
            setSelectedLead(viewingLead);
            setDetailSidebarOpen(false);
            setIsFormOpen(true);
          }}
          onDelete={() => {
            setSelectedLead(viewingLead);
            setDetailSidebarOpen(false);
            setIsDeleteModalOpen(true);
          }}
          actions={[
            {
              label: "Convert to Contact",
              icon: <Icons.Contact size={16} />,
              onClick: () => {
                if (viewingLead.id) {
                  convertMutation.mutate(viewingLead.id);
                }
              },
            },
            {
              label: "Send Email",
              icon: <Icons.Mail size={16} />,
              onClick: () => showToast("Email composer opened", "info"),
            },
          ]}
        >
          {/* ── Profile Header ── */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full border border-border/70 bg-primary/10 text-xs font-semibold text-primary shadow-sm">
                {getLeadInitials(viewingLead)}
              </div>
              {/* Name + quick-action icons */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {viewingLead.firstName} {viewingLead.lastName}
                </p>
                {viewingLead.title && (
                  <p className="text-xs text-muted-foreground mt-0.5">{viewingLead.title}</p>
                )}
                <div className="flex gap-1.5 mt-2">
                  {viewingLead.phone && (
                    <a href={`tel:${viewingLead.phone}`}
                      className="p-1 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title="Call">
                      <Icons.Phone size={13} />
                    </a>
                  )}
                  {viewingLead.email && (
                    <a href={`mailto:${viewingLead.email}`}
                      className="p-1 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title="Send email">
                      <Icons.Mail size={13} />
                    </a>
                  )}
                </div>
              </div>
              {/* Company / value pill */}
              {(viewingLead.company || viewingLead.estimatedValue) && (
                <div className="text-right flex-shrink-0">
                  {viewingLead.company && (
                    <>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Company</p>
                      <p className="text-xs font-medium text-foreground">{viewingLead.company}</p>
                    </>
                  )}
                  {viewingLead.estimatedValue && (
                    <p className="text-[11px] text-primary font-semibold mt-0.5">
                      ${viewingLead.estimatedValue.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Lead Details Card ── */}
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold text-primary mb-3">Lead Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Owner</p>
                <p className="text-xs font-medium text-foreground">
                  {viewingLead.ownerName || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Created on</p>
                <p className="text-xs font-medium text-foreground">
                  {viewingLead.createdAt
                    ? new Date(viewingLead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Lead Stage</p>
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                  viewingLead.status === "NEW" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                  viewingLead.status === "CONTACTED" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
                  viewingLead.status === "QUALIFIED" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                  viewingLead.status === "UNQUALIFIED" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                  viewingLead.status === "CONVERTED" && "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                  viewingLead.status === "LOST" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                )}>
                  {viewingLead.status}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Modified on</p>
                <p className="text-xs font-medium text-foreground">
                  {viewingLead.updatedAt
                    ? new Date(viewingLead.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Lead Source</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.source || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Campaign</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.campaignName || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Lead Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${viewingLead.score ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {viewingLead.score ?? 0}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Last Contact</p>
                <p className="text-xs font-medium text-foreground">
                  {viewingLead.lastContactDate || viewingLead.lastContact || "—"}
                </p>
              </div>
            </div>

            {/* Follow-up comment */}
            {viewingLead.notes && (
              <div className="mt-3 pt-3 border-t border-border/70">
                <p className="text-[11px] text-muted-foreground mb-1">Follow-up comment</p>
                <p className="text-xs text-foreground leading-relaxed">{viewingLead.notes}</p>
              </div>
            )}
          </div>

          {/* ── Tags ── */}
          {viewingLead.tags && viewingLead.tags.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <h3 className="text-xs font-semibold text-primary mb-2.5">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {viewingLead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Contact Information Card ── */}
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold text-primary mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Phone</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.phone || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Email</p>
                <p className="text-xs font-medium text-foreground break-all">{viewingLead.email || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Company</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.company || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Territory</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.territory || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Owner Territory</p>
                <p className="text-xs font-medium text-foreground">{viewingLead.ownerTerritory || "Unassigned"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Territory Coverage</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "inline-block h-2 w-2 rounded-full flex-shrink-0",
                    viewingLead.territoryMismatch ? "bg-red-500" : "bg-green-500"
                  )} />
                  <p className="text-xs font-medium text-foreground">
                    {viewingLead.territoryMismatch ? "Needs reassignment review" : "Aligned"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DetailSidebar>
      )}
    </PageLayout>
  );
}

