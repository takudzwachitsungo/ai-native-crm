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
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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
    return matchesFilter && matchesSearch;
  });

  // Reset page to 0 when filter or search changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [filter, searchQuery]);

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
            <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <p className="text-xl font-semibold text-foreground">{leadStats?.totalLeads ?? totalElements}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-xl font-semibold text-foreground">{Math.round(leadStats?.averageScore ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className="text-xl font-semibold text-foreground">{Math.round(leadStats?.conversionRate ?? 0)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Lead Value</p>
              <p className="text-xl font-semibold text-foreground">
                ${(Number(leadStats?.totalEstimatedValue ?? 0)).toLocaleString()}
              </p>
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
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
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

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-border -mb-px">
            {[
              { value: "all", label: "All Leads" },
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "unqualified", label: "Unqualified" },
              { value: "lost", label: "Lost" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative",
                  filter === tab.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-secondary">
                  {statusCounts[tab.value as keyof typeof statusCounts]}
                </span>
                {filter === tab.value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    aria-label="Select all"
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Score</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    // Don't open sidebar if clicking checkbox or action buttons
                    if ((e.target as HTMLElement).closest('input, button')) return;
                    setViewingLead(lead);
                    setDetailSidebarOpen(true);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      aria-label="Select lead"
                      checked={lead.id ? selectedIds.has(lead.id) : false}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                    {lead.firstName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{lead.firstName} {lead.lastName}</div>
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
              </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{lead.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden w-16">
                        <div
                          className={cn(
                            "h-full transition-all",
                            (lead.score ?? 0) >= 80 ? "bg-green-500" : (lead.score ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${lead.score ?? 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-8">{lead.score ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      lead.status === "QUALIFIED" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      lead.status === "UNQUALIFIED" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                      lead.status === "CONTACTED" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      lead.status === "NEW" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                      lead.status === "LOST" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors" 
                        aria-label="Edit lead"
                      >
                        <Icons.Edit size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors" 
                        aria-label="Delete lead"
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
          <DetailSection title="Contact Information">
            <DetailField label="Email" value={viewingLead.email} icon={<Icons.Mail size={16} />} />
            <DetailField label="Phone" value={viewingLead.phone} icon={<Icons.Phone size={16} />} />
            <DetailField label="Company" value={viewingLead.company} icon={<Icons.Building2 size={16} />} />
            <DetailField label="Territory" value={viewingLead.territory || "Unassigned"} icon={<Icons.Target size={16} />} />
            <DetailField label="Owner Territory" value={viewingLead.ownerTerritory || "Unassigned"} icon={<Icons.Target size={16} />} />
          </DetailSection>

          <DetailSection title="Lead Details">
            <DetailField label="Status" value={viewingLead.status} />
            <DetailField label="Lead Score" value={`${viewingLead.score ?? 0}/100`} />
            <DetailField label="Owner" value={viewingLead.ownerName || (viewingLead.territory ? "Auto-routed by territory and workload" : "Auto-routed by workload")} />
            <DetailField label="Territory Coverage" value={viewingLead.territoryMismatch ? "Needs reassignment review" : "Aligned"} />
            <DetailField label="Source" value={viewingLead.source} />
            <DetailField label="Potential Value" value={viewingLead.estimatedValue ? `$${viewingLead.estimatedValue.toLocaleString()}` : "Not set"} />
            <DetailField label="Last Contact" value={viewingLead.lastContactDate || viewingLead.lastContact} />
          </DetailSection>

          {viewingLead.tags && viewingLead.tags.length > 0 && (
            <DetailSection title="Tags">
              <div className="flex flex-wrap gap-2">
                {viewingLead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}
        </DetailSidebar>
      )}
    </PageLayout>
  );
}

