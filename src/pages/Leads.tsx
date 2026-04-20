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
import { DetailSidebar, DetailSection, DetailField } from "../components/DetailSidebar";
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

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{greeting}, {ownerName}</h1>
              <p className="text-sm text-muted-foreground">Here is a friendly view of your leads pipeline.</p>
            </div>
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button 
                onClick={() => {
                  setSelectedLead(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Create Lead
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {/* Stats Cards - Left */}
            <div className="flex items-center gap-3 flex-1">
              <div className="rounded-lg border border-border bg-background px-4 py-2 flex-1">
                <p className="text-[10px] text-muted-foreground">Total Leads</p>
                <p className="text-lg font-semibold text-foreground">{leadStats?.totalLeads ?? totalElements}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-2 flex-1">
                <p className="text-[10px] text-muted-foreground">Avg Score</p>
                <p className="text-lg font-semibold text-foreground">{Math.round(leadStats?.averageScore ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-2 flex-1">
                <p className="text-[10px] text-muted-foreground">Conversion</p>
                <p className="text-lg font-semibold text-foreground">{Math.round(leadStats?.conversionRate ?? 0)}%</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-2 flex-1">
                <p className="text-[10px] text-muted-foreground">Lead Value</p>
                <p className="text-lg font-semibold text-foreground">
                  ${(Number(leadStats?.totalEstimatedValue ?? 0)).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Filter Dropdowns - Right */}
            <div className="flex items-center gap-2">
              {/* Date Range Filter */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDateDropdownOpen(!dateDropdownOpen); setSourceDropdownOpen(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors",
                    dateFilter !== "all" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-secondary"
                  )}
                >
                  <Icons.Calendar size={14} className={dateFilter !== "all" ? "text-primary" : "text-muted-foreground"} />
                  <span>{{
                    all: "All time",
                    "7": "Last 7 days",
                    "30": "Last 30 days",
                    "90": "Last 90 days",
                    "180": "Last 6 months",
                    "365": "Last year",
                  }[dateFilter]}</span>
                  <Icons.ChevronDown size={14} className={cn("transition-transform", dateDropdownOpen && "rotate-180")} />
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

              {/* Source Filter */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setSourceDropdownOpen(!sourceDropdownOpen); setDateDropdownOpen(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors",
                    sourceFilter !== "all" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-secondary"
                  )}
                >
                  <Icons.TrendingUp size={14} className={sourceFilter !== "all" ? "text-primary" : "text-muted-foreground"} />
                  <span>{sourceFilter === "all" ? "All Sources" : sourceFilter}</span>
                  <Icons.ChevronDown size={14} className={cn("transition-transform", sourceDropdownOpen && "rotate-180")} />
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
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
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

          {/* Status Pipeline Bar */}
          <div className="rounded-2xl border border-border bg-background p-3 mt-2 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center flex-1" style={{ gap: '2px' }}>
                {[
                  { value: "all", label: "All Leads" },
                  { value: "new", label: "New" },
                  { value: "contacted", label: "Contacted" },
                  { value: "qualified", label: "Qualified" },
                  { value: "unqualified", label: "Unqualified" },
                  { value: "lost", label: "Lost" },
                ].map((tab, index, arr) => {
                  const isActive = filter === tab.value;
                  const activeIndex = arr.findIndex(t => t.value === filter);
                  const isPast = activeIndex > -1 && index < activeIndex;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setFilter(tab.value)}
                      className="relative flex-1 focus:outline-none"
                      style={{ zIndex: arr.length - index }}
                    >
                      <svg
                        viewBox="0 0 200 32"
                        preserveAspectRatio="none"
                        className="w-full"
                        style={{ height: '30px', marginLeft: index > 0 ? '-4px' : '0' }}
                      >
                        <path
                          d={
                            index === 0
                              ? 'M6,1 L184,1 L199,16 L184,31 L6,31 Q1,31 1,26 L1,6 Q1,1 6,1 Z'
                              : index === arr.length - 1
                              ? 'M1,1 L15,16 L1,31 L194,31 Q199,31 199,26 L199,6 Q199,1 194,1 Z'
                              : 'M1,1 L15,16 L1,31 L184,31 L199,16 L184,1 Z'
                          }
                          className={cn(
                            "transition-all duration-200",
                            isActive
                              ? "fill-primary stroke-primary"
                              : isPast
                              ? "fill-primary/10 stroke-primary/25"
                              : "fill-[#f3f4f6] dark:fill-[#1f2937] stroke-[#cbd5e1] dark:stroke-[#4b5563]"
                          )}
                          strokeWidth="0.75"
                        />
                        <text
                          x="100"
                          y="17"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className={cn(
                            "select-none pointer-events-none",
                            isActive
                              ? "fill-primary-foreground"
                              : isPast
                              ? "fill-primary"
                              : "fill-muted-foreground"
                          )}
                          style={{ fontSize: '11px', fontWeight: 500 }}
                        >
                          {tab.label}
                        </text>
                      </svg>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  /* Mark status as complete */
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors whitespace-nowrap shadow-sm"
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
        <div className="overflow-hidden rounded-2xl bg-card">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    aria-label="Select all"
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Lead Name</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Lead Score</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="border-b border-border/60 text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      aria-label="Select lead"
                      checked={lead.id ? selectedIds.has(lead.id) : false}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                    {lead.firstName?.charAt(0) || '?'}
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
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{lead.company}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{lead.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden w-16">
                        <div
                          className={cn(
                            "h-full transition-all",
                            (lead.score ?? 0) >= 80 ? "bg-green-500" : (lead.score ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${lead.score ?? 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-7">{lead.score ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                    {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {lead.firstName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{lead.firstName} {lead.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{lead.company}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
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
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded",
                  (lead.score ?? 0) >= 80 ? "bg-green-100 text-green-700" : (lead.score ?? 0) >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                )}>
                  {lead.score ?? 0}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icons.Mail size={14} />
                  <span className="truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icons.Phone size={14} />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    lead.status === "QUALIFIED" && "bg-green-100 text-green-700",
                    lead.status === "UNQUALIFIED" && "bg-orange-100 text-orange-700",
                    lead.status === "CONTACTED" && "bg-blue-100 text-blue-700",
                    lead.status === "NEW" && "bg-gray-100 text-gray-700",
                    lead.status === "LOST" && "bg-red-100 text-red-700"
                  )}>
                    {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                  </span>
                  {lead.estimatedValue && (
                    <span className="font-medium text-foreground">${lead.estimatedValue.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Pagination */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} leads
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
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
                  "px-3 py-1.5 text-sm rounded transition-colors",
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
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
              currentPage >= totalPages - 1 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-secondary"
            )}
          >
            Next
          </button>
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
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0 select-none">
                {viewingLead.firstName?.[0]?.toUpperCase()}{viewingLead.lastName?.[0]?.toUpperCase()}
              </div>
              {/* Name + quick-action icons */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground leading-tight">
                  {viewingLead.firstName} {viewingLead.lastName}
                </p>
                {viewingLead.title && (
                  <p className="text-xs text-muted-foreground mt-0.5">{viewingLead.title}</p>
                )}
                <div className="flex gap-2 mt-2.5">
                  {viewingLead.phone && (
                    <a href={`tel:${viewingLead.phone}`}
                      className="p-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title="Call">
                      <Icons.Phone size={14} />
                    </a>
                  )}
                  {viewingLead.email && (
                    <a href={`mailto:${viewingLead.email}`}
                      className="p-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title="Send email">
                      <Icons.Mail size={14} />
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
                      <p className="text-sm font-medium text-foreground">{viewingLead.company}</p>
                    </>
                  )}
                  {viewingLead.estimatedValue && (
                    <p className="text-xs text-primary font-semibold mt-1">
                      ${viewingLead.estimatedValue.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Lead Details Card ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">Lead Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Owner</p>
                <p className="text-sm font-medium text-foreground">
                  {viewingLead.ownerName || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Created on</p>
                <p className="text-sm font-medium text-foreground">
                  {viewingLead.createdAt
                    ? new Date(viewingLead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Lead Stage</p>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
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
                <p className="text-sm font-medium text-foreground">
                  {viewingLead.updatedAt
                    ? new Date(viewingLead.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Lead Source</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.source || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Campaign</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.campaignName || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Lead Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${viewingLead.score ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {viewingLead.score ?? 0}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Last Contact</p>
                <p className="text-sm font-medium text-foreground">
                  {viewingLead.lastContactDate || viewingLead.lastContact || "—"}
                </p>
              </div>
            </div>

            {/* Follow-up comment */}
            {viewingLead.notes && (
              <div className="mt-4 pt-4 border-t border-border/70">
                <p className="text-[11px] text-muted-foreground mb-1">Follow-up comment</p>
                <p className="text-sm text-foreground leading-relaxed">{viewingLead.notes}</p>
              </div>
            )}
          </div>

          {/* ── Tags ── */}
          {viewingLead.tags && viewingLead.tags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {viewingLead.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Contact Information Card ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-primary mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Phone</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.phone || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm font-medium text-foreground break-all">{viewingLead.email || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Company</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.company || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Territory</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.territory || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Owner Territory</p>
                <p className="text-sm font-medium text-foreground">{viewingLead.ownerTerritory || "Unassigned"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Territory Coverage</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "inline-block h-2 w-2 rounded-full flex-shrink-0",
                    viewingLead.territoryMismatch ? "bg-red-500" : "bg-green-500"
                  )} />
                  <p className="text-sm font-medium text-foreground">
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

