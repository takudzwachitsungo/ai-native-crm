import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { QuoteForm } from "../components/forms";
import { QuoteView } from "../components/QuoteView";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { quotesApi } from "../lib/api";
import type { Quote } from "../lib/types";
import { exportToCSV } from "../lib/helpers";

const statusColors = {
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Quote | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch quotes from backend (paginated for display)
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotes', searchQuery, currentPage, pageSize],
    queryFn: () => quotesApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
  });

  // Fetch all quotes for summary stats (without pagination)
  const { data: allQuotesData } = useQuery({
    queryKey: ['quotes', 'all-for-stats'],
    queryFn: () => quotesApi.getAll({ page: 0, size: 10000 }),
  });

  const quotes = quotesData?.content || [];
  const allQuotes = allQuotesData?.content || [];
  const totalElements = quotesData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Quote>) => quotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setIsFormOpen(false);
      showToast('Quote created successfully', 'success');
    },
    onError: (error: any) => {
      console.error('Quote creation error:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create quote';
      showToast(errorMessage, 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) => 
      quotesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setIsFormOpen(false);
      showToast('Quote updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update quote', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setIsDeleteModalOpen(false);
      showToast('Quote deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete quote', 'error');
    },
  });

  const filteredQuotes = quotes.filter((quote: any) => {
    const matchesFilter = filter === "all" || quote.status === filter;
    return matchesFilter;
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filter]);

  const statusCounts = {
    all: allQuotesData?.totalElements || totalElements,
    draft: allQuotes.filter((q: any) => q.status === "DRAFT").length,
    sent: allQuotes.filter((q: any) => q.status === "SENT").length,
    accepted: allQuotes.filter((q: any) => q.status === "ACCEPTED").length,
    declined: allQuotes.filter((q: any) => q.status === "REJECTED").length,
    expired: allQuotes.filter((q: any) => q.status === "EXPIRED").length,
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Quotes</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  exportToCSV(filteredQuotes, [
                    { header: 'Quote #', accessor: 'quoteNumber' },
                    { header: 'Company', accessor: (q: any) => q.company?.name || '' },
                    { header: 'Contact', accessor: (q: any) => q.contact ? `${q.contact.firstName} ${q.contact.lastName}` : '' },
                    { header: 'Amount', accessor: (q: any) => q.total || 0 },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Valid Until', accessor: (q: any) => q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '' },
                    { header: 'Created At', accessor: (q: any) => q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '' },
                  ], 'quotes');
                  showToast(`Exported ${filteredQuotes.length} quotes to CSV`, 'success');
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
                Create Quote
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 border-b border-border -mb-px overflow-x-auto">
            {(["all", "draft", "sent", "accepted", "declined", "expired"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap",
                  filter === status
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {status === "all" ? "All Quotes" : status}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quote #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Valid Until</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuotes.map((quote: any) => (
                <tr key={quote.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-primary">{quote.quoteNumber || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Created {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{quote.contactName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{quote.companyName || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-foreground">{formatCurrency(quote.total || 0)}</p>
                      <p className="text-xs text-muted-foreground">{quote.lineItems?.length || 0} items</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                      statusColors[(quote.status?.toLowerCase()) as keyof typeof statusColors] || statusColors.draft
                    )}>
                      {quote.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setSelectedItem(quote);
                          setViewMode(true);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-muted rounded transition-colors" 
                        title="View"
                      >
                        <Icons.FileText size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(quote);
                          setViewMode(false);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Edit"
                      >
                        <Icons.Edit size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded transition-colors" title="Download PDF">
                        <Icons.Download size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(quote);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Delete"
                      >
                        <Icons.Trash size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(allQuotes.reduce((sum: number, q: any) => sum + (q.total || 0), 0))}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Accepted</p>
            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(allQuotes.filter((q: any) => q.status === "ACCEPTED").reduce((sum: number, q: any) => sum + (q.total || 0), 0))}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-semibold text-blue-600">
              {formatCurrency(allQuotes.filter((q: any) => q.status === "SENT").reduce((sum: number, q: any) => sum + (q.total || 0), 0))}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
            <p className="text-2xl font-semibold text-primary">
              {allQuotes.filter((q: any) => q.status !== "DRAFT").length > 0 
                ? ((allQuotes.filter((q: any) => q.status === "ACCEPTED").length / allQuotes.filter((q: any) => q.status !== "DRAFT").length) * 100).toFixed(1)
                : '0.0'}%
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8 mt-6">
            <p className="text-muted-foreground">Loading quotes...</p>
          </div>
        )}

        {!isLoading && quotes.length === 0 && (
          <div className="text-center py-8 mt-6">
            <p className="text-muted-foreground">No quotes found</p>
          </div>
        )}
      </div>

      {/* Footer Pagination */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} quotes
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

      {/* View Modal */}
      {viewMode && (
        <QuoteView
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedItem(null);
            setViewMode(false);
          }}
          quote={selectedItem as any}
        />
      )}

      {/* Edit/Create Form Modal */}
      {!viewMode && (
        <QuoteForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedItem(null);
            setViewMode(false);
          }}
          onSubmit={(data) => {
            if (selectedItem?.id) {
              updateMutation.mutate({ id: selectedItem.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          initialData={selectedItem as any || undefined}
        />
      )}

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
                showToast(`Quote deleted successfully`, "success");
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
              },
              onError: () => {
                showToast("Failed to delete quote", "error");
              }
            });
          }
        }}
        title="Delete Quote"
        message={`Are you sure you want to delete quote "${selectedItem?.quoteNumber}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
