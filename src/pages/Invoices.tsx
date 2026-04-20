import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { InvoiceForm } from '../components/forms';
import { InvoiceView } from '../components/InvoiceView';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/Modal';
import { invoicesApi } from '../lib/api';
import type { Invoice } from '../lib/types';
import { exportToCSV } from '../lib/helpers';

export default function Invoices() {
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices from backend
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', currentPage, pageSize],
    queryFn: () => invoicesApi.getAll({ page: currentPage, size: pageSize }),
  });

  const invoices = invoicesData?.content || [];
  const totalElements = invoicesData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Invoice>) => invoicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsFormOpen(false);
      showToast('Invoice created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create invoice', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) => 
      invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsFormOpen(false);
      showToast('Invoice updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update invoice', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsDeleteModalOpen(false);
      showToast('Invoice deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete invoice', 'error');
    },
  });

  const erpSyncMutation = useMutation({
    mutationFn: ({ id, providerKey }: { id: string; providerKey: 'quickbooks' | 'xero' }) =>
      invoicesApi.syncToErp(id, providerKey),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast(result.summary || `Synced invoice to ${variables.providerKey}`, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to sync invoice to ERP', 'error');
    },
  });

  const filteredInvoices = activeTab === 'all' 
    ? invoices 
    : invoices.filter((inv: any) => inv.status?.toLowerCase() === activeTab);

  // Reset page when tab changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const totalRevenue = invoices.filter((inv: any) => inv.status?.toLowerCase() === 'paid').reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  const pendingRevenue = invoices.filter((inv: any) => inv.status?.toLowerCase() === 'pending').reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  const overdueRevenue = invoices.filter((inv: any) => inv.status?.toLowerCase() === 'overdue').reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

  return (
    <PageLayout
      title="Invoices"
      subtitle="Billing and invoice management"
      icon={<Icons.FileText size={20} />}
      actions={
        <button
          onClick={() => {
            setSelectedItem(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Icons.Plus size={16} />
          Create Invoice
        </button>
      }
    >
      {/* Stats */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">${pendingRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">${overdueRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border bg-background">
        <div className="flex px-6">
          {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 border-b-2 transition-colors text-sm font-medium capitalize",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab} {tab !== 'all' && `(${invoices.filter((inv: any) => inv.status === tab).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm">
            <Icons.Filter size={16} />
            Filter
          </button>
        </div>
        <button 
          onClick={() => {
            exportToCSV(filteredInvoices, [
              { header: 'Invoice #', accessor: 'invoiceNumber' },
              { header: 'Customer', accessor: (i: any) => i.contact?.firstName + ' ' + i.contact?.lastName || '' },
              { header: 'Company', accessor: (i: any) => i.company?.name || '' },
              { header: 'Amount', accessor: (i: any) => i.total || i.totalAmount || 0 },
              { header: 'Status', accessor: 'status' },
              { header: 'Issue Date', accessor: (i: any) => i.issueDate ? new Date(i.issueDate).toLocaleDateString() : '' },
              { header: 'Due Date', accessor: (i: any) => i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '' },
              { header: 'Paid Date', accessor: (i: any) => i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '' },
            ], 'invoices');
            showToast(`Exported ${filteredInvoices.length} invoices to CSV`, 'success');
          }}
          className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
        >
          <Icons.Download size={16} />
          Export
        </button>
      </div>

      {/* Invoice List */}
      <div className="p-6">
        <div className="overflow-hidden rounded-2xl bg-card">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Invoice #</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Issued</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Due Date</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="border-b border-border/60 bg-secondary/50 text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Items</th>
                <th className="border-b border-border/60 bg-secondary/50 text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredInvoices.map((invoice: any) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-primary">{invoice.invoiceNumber || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{invoice.contactName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{invoice.companyName || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">${(invoice.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-1 border rounded-full capitalize",
                      getStatusColor(invoice.status?.toLowerCase())
                    )}>
                      {invoice.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{invoice.lineItems?.length || 0} items</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelectedItem(invoice);
                          setIsViewOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="View Invoice"
                      >
                        <Icons.Eye size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                        <Icons.Download size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                        <Icons.Send size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(invoice);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                      >
                        <Icons.Edit size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(invoice);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                      >
                        <Icons.Trash size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => erpSyncMutation.mutate({ id: invoice.id, providerKey: 'quickbooks' })}
                        disabled={!invoice.id || erpSyncMutation.isPending}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        title="Sync to QuickBooks"
                      >
                        QB
                      </button>
                      <button
                        onClick={() => erpSyncMutation.mutate({ id: invoice.id, providerKey: 'xero' })}
                        disabled={!invoice.id || erpSyncMutation.isPending}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        title="Sync to Xero"
                      >
                        Xero
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {!isLoading && invoices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Pagination */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} invoices
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
      <InvoiceView
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedItem(null);
        }}
        invoice={selectedItem as any}
      />

      {/* Form Modal */}
      <InvoiceForm
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
        initialData={selectedItem as any || undefined}
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
                showToast(`Invoice deleted successfully`, "success");
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
              },
              onError: () => {
                showToast("Failed to delete invoice", "error");
              }
            });
          }
        }}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${selectedItem?.invoiceNumber}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
