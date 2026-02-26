import { Modal } from "./Modal";
import { Icons } from "./icons";
import { cn } from "../lib/utils";

interface QuoteLineItem {
  id: string;
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface QuoteData {
  quoteNumber?: string;
  company?: string;
  companyName?: string;
  contact?: string;
  contactName?: string;
  issueDate?: string;
  validUntil?: string;
  stage?: string;
  terms?: string;
  notes?: string;
  lineItems?: QuoteLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface QuoteViewProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData | null;
}

export function QuoteView({ isOpen, onClose, quote }: QuoteViewProps) {
  if (!quote) return null;

  const lineItems = quote.lineItems || [];
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = quote.tax || 0;
  const total = quote.total || subtotal + tax;

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

  const getStatusColor = (stage?: string) => {
    const stageMap: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-orange-100 text-orange-800',
    };
    return stageMap[stage?.toUpperCase() || 'DRAFT'] || stageMap.DRAFT;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quote Document"
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
              <h1 className="text-3xl font-bold text-foreground mb-2">QUOTATION</h1>
              <p className="text-sm text-muted-foreground">
                Quote Number: <span className="font-semibold text-foreground">{quote.quoteNumber || 'N/A'}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                getStatusColor(quote.stage)
              )}>
                {quote.stage || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>

        {/* Date and Customer Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quote Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="text-sm font-medium text-foreground">{formatDate(quote.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valid Until:</span>
                <span className="text-sm font-medium text-foreground">{formatDate(quote.validUntil)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Customer Details</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{quote.companyName || quote.company || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{quote.contactName || quote.contact || 'N/A'}</p>
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.length > 0 ? (
                  lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{item.product || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">{item.discount}%</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
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
            {tax > 0 && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Tax:</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-border">
              <span className="text-lg font-bold text-foreground">Total:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Terms and Notes */}
        {(quote.terms || quote.notes) && (
          <div className="grid grid-cols-1 gap-6 pt-6 border-t border-border">
            {quote.terms && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Terms</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
            {quote.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
