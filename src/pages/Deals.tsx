import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { DealForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { dealsApi } from "../lib/api";
import type { Deal } from "../lib/types";
import { useInsights } from "../hooks/useInsights";
import { InsightBadge } from "../components/InsightBadge";
import { exportToCSV } from "../lib/helpers";

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Deal | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch live insights for deals
  useInsights('deals');

  // Fetch deals from backend with auto-refresh every minute
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals', searchQuery, currentPage, pageSize],
    queryFn: () => dealsApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
    refetchInterval: 60000, // Auto-refresh every minute for deal badge updates
  });

  const deals = dealsData?.content || [];
  const totalElements = dealsData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Deal>) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsFormOpen(false);
      showToast('Deal created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create deal', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deal> }) => 
      dealsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsFormOpen(false);
      showToast('Deal updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update deal', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsDeleteModalOpen(false);
      showToast('Deal deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete deal', 'error');
    },
  });

  const filteredDeals = deals.filter((deal) => {
    const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
    return matchesStage;
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, stageFilter]);

  const stageCounts = {
    all: totalElements,
    prospecting: deals.filter(d => d.stage === "PROSPECTING").length,
    qualification: deals.filter(d => d.stage === "QUALIFICATION").length,
    proposal: deals.filter(d => d.stage === "PROPOSAL").length,
    negotiation: deals.filter(d => d.stage === "NEGOTIATION").length,
    "closed-won": deals.filter(d => d.stage === "CLOSED_WON").length,
    "closed-lost": deals.filter(d => d.stage === "CLOSED_LOST").length,
  };

  const getStageColor = (stage: Deal["stage"]) => {
    switch (stage) {
      case "PROSPECTING": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      case "QUALIFICATION": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "PROPOSAL": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "NEGOTIATION": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "CLOSED_WON": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "CLOSED_LOST": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  // Get insight badges for a deal based on its data
  const getDealBadges = (deal: Deal): Array<{ type: 'overdue' | 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> => {
    const badges: Array<{ type: 'overdue' | 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> = [];
    
    // Check if deal is closing soon (within 7 days)
    if (deal.expectedCloseDate) {
      const closeDate = new Date(deal.expectedCloseDate);
      const today = new Date();
      const daysUntilClose = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilClose >= 0 && daysUntilClose <= 7) {
        badges.push({ type: 'closing_soon', label: `${daysUntilClose}d` });
      }
    }
    
    // Check if deal is hot (high value and high probability)
    const value = deal.value || 0;
    const probability = (deal as any).probability || 0;
    if (value > 50000 && probability > 70) {
      badges.push({ type: 'hot' });
    }
    
    // Check if deal is stuck (been in same stage for too long)
    // Note: This would need updatedAt field to be accurate
    if (deal.stage === 'NEGOTIATION' && probability < 30) {
      badges.push({ type: 'stuck' });
    }
    
    // Check if deal is at risk (low probability in late stage)
    if (['PROPOSAL', 'NEGOTIATION'].includes(deal.stage) && probability < 40) {
      badges.push({ type: 'at_risk' });
    }
    
    return badges;
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Deals</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  exportToCSV(filteredDeals, [
                    { header: 'Name', accessor: 'name' },
                    { header: 'Company', accessor: (d: any) => d.company?.name || '' },
                    { header: 'Contact', accessor: (d: any) => d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '' },
                    { header: 'Amount', accessor: (d: any) => d.amount || d.value || '' },
                    { header: 'Stage', accessor: 'stage' },
                    { header: 'Probability', accessor: 'probability' },
                    { header: 'Expected Close', accessor: (d: any) => d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : '' },
                    { header: 'Created At', accessor: (d: any) => d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '' },
                  ], 'deals');
                  showToast(`Exported ${filteredDeals.length} deals to CSV`, 'success');
                }}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Create Deal
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search deals..."
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
          <div className="flex items-center gap-1 border-b border-border -mb-px overflow-x-auto">
            {[
              { value: "all", label: "All Deals" },
              { value: "prospecting", label: "Prospecting" },
              { value: "qualification", label: "Qualification" },
              { value: "proposal", label: "Proposal" },
              { value: "negotiation", label: "Negotiation" },
              { value: "closed-won", label: "Closed Won" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStageFilter(tab.value)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap",
                  stageFilter === tab.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-secondary">
                  {stageCounts[tab.value as keyof typeof stageCounts]}
                </span>
                {stageFilter === tab.value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <input type="checkbox" className="rounded" aria-label="Select all" />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deal Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Probability</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Close Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" className="rounded" aria-label="Select deal" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{deal.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {getDealBadges(deal).map((badge, idx) => (
                        <InsightBadge 
                          key={idx}
                          type={badge.type}
                          label={badge.label}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{(deal as any).companyName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">${(deal.value || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", getStageColor(deal.stage))}>
                      {deal.stage.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{(deal as any).probability || 0}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{deal.expectedCloseDate || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{(deal as any).contactName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedItem(deal);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors" 
                        aria-label="Edit deal"
                      >
                        <Icons.Edit size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedItem(deal);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors" 
                        aria-label="Delete deal"
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
          {filteredDeals.map((deal) => (
            <div key={deal.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{deal.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{(deal as any).companyName || 'N/A'}</p>
                </div>
                <span className={cn("px-2 py-1 text-xs font-medium rounded", getStageColor(deal.stage))}>
                  {deal.stage.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium text-foreground">${(deal.value || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Probability:</span>
                  <span className="font-medium text-foreground">{(deal as any).probability || 0}%</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Close Date:</span>
                  <span className="text-muted-foreground">{deal.expectedCloseDate || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      )}

      {!isLoading && deals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No deals found</p>
        </div>
      )}

      {/* Footer Pagination */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} deals
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
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
      </div>

      {/* Form Modal */}
      <DealForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          if (selectedItem?.id) {
            updateMutation.mutate({ id: selectedItem.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={selectedItem || undefined}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={() => {
          if (selectedItem?.id) {
            deleteMutation.mutate(selectedItem.id, {
              onSuccess: () => {
                showToast(`Deal deleted successfully`, "success");
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
              },
              onError: () => {
                showToast("Failed to delete deal", "error");
              }
            });
          }
        }}
        title="Delete Deal"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
