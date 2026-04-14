import { Modal } from "./Modal";
import { Icons } from "./icons";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { tenantTierLabels } from "../lib/authz";

interface InvoiceLineItem {
  id: string;
  product: string;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  taxRate?: number;
  discountPercent?: number;
  total: number;
  lineTotal?: number;
}

interface InvoiceData {
  invoiceNumber?: string;
  company?: string;
  companyName?: string;
  contact?: string;
  contactName?: string;
  issueDate?: string;
  dueDate?: string;
  status?: string;
  paymentTerms?: string;
  terms?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface InvoiceViewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function InvoiceView({ isOpen, onClose, invoice }: InvoiceViewProps) {
  const { user } = useAuth();
  if (!invoice) return null;

  const lineItems = invoice.lineItems || [];
  const subtotal = lineItems.reduce((sum, item) => sum + (item.lineTotal ?? item.total ?? 0), 0);
  const totalTax = lineItems.reduce((sum, item) => {
    const itemSubtotal = (item.unitPrice || 0) * (item.quantity || 0);
    const taxRate = item.taxRate ?? item.tax ?? 0;
    return sum + (itemSubtotal * taxRate / 100);
  }, 0);
  const total = invoice.total || subtotal + totalTax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return statusMap[status?.toUpperCase() || 'DRAFT'] || statusMap.DRAFT;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Document"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-muted"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2"
          >
            <Icons.Download className="w-4 h-4" />
            Print / Download PDF
          </button>
        </div>
      }
    >
      <div className="bg-white print:shadow-none">
        {/* Header */}
        <div className="border-b border-border pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">INVOICE</h1>
              <p className="text-sm text-muted-foreground">
                Invoice Number: <span className="font-semibold text-foreground">{invoice.invoiceNumber || 'N/A'}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Issued by <span className="font-semibold text-foreground">{user?.tenantName || 'Workspace'}</span>
                {user?.tenantTier ? ` · ${tenantTierLabels[user.tenantTier]} plan` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase",
                getStatusColor(invoice.status)
              )}>
                {invoice.status || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>

        {/* Date and Customer Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Invoice Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="text-sm font-medium text-foreground">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="text-sm font-medium text-foreground">{formatDate(invoice.dueDate)}</span>
              </div>
              {(invoice.paymentTerms || invoice.terms) && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Terms:</span>
                  <span className="text-sm font-medium text-foreground">{invoice.paymentTerms || invoice.terms}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bill To</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{invoice.companyName || invoice.company || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{invoice.contactName || invoice.contact || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Items</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.length > 0 ? (
                  lineItems.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{item.productName || item.product || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{formatCurrency(item.unitPrice || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{item.taxRate ?? item.tax ?? 0}%</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{formatCurrency(item.lineTotal ?? item.total ?? 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Subtotal:</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            {totalTax > 0 && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Tax:</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(totalTax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-border">
              <span className="text-lg font-bold text-foreground">Amount Due:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
