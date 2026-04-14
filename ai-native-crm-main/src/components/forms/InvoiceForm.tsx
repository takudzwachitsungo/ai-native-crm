import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { Icons } from "../icons";
import { companiesApi, contactsApi, productsApi } from "../../lib/api";

interface InvoiceLineItem {
  id: string;
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

interface InvoiceFormData {
  invoiceNumber: string;
  company: string;
  contact: string;
  issueDate: string;
  dueDate: string;
  status: string;
  paymentTerms: string;
  notes: string;
  lineItems: InvoiceLineItem[];
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function InvoiceForm({ isOpen, onClose, onSubmit, initialData }: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    company: "",
    contact: "",
    issueDate: "",
    dueDate: "",
    status: "DRAFT",
    paymentTerms: "Net 30",
    notes: "",
    lineItems: [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
  });

  // Fetch companies, contacts, and products
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  const companies = companiesData?.content || [];
  const contacts = contactsData?.content || [];
  const products = productsData?.content || [];

  // Generate unique invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${year}-${random}`;
  };

  useEffect(() => {
    if (initialData) {
      // Normalize line items from backend format
      // Backend uses: productId, discountPercent/taxRate, lineTotal
      // Frontend uses: product, tax, total
      const normalizedLineItems = (initialData.lineItems || []).map((item: any, index: number) => ({
        id: item.id || String(index + 1),
        product: item.product || item.productId || "",
        description: item.description || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        tax: item.tax ?? item.taxRate ?? item.discountPercent ?? 0,
        total: item.total ?? item.lineTotal ?? ((item.quantity || 1) * (item.unitPrice || 0) * (1 + (item.tax ?? item.taxRate ?? 0) / 100))
      }));
      
      setFormData((prev) => ({ 
        ...prev, 
        invoiceNumber: initialData.invoiceNumber || "",
        // Handle both naming conventions
        company: initialData.company || initialData.companyId || "",
        contact: initialData.contact || initialData.contactId || "",
        issueDate: initialData.issueDate || new Date().toISOString().split('T')[0],
        dueDate: initialData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: initialData.status || "DRAFT",
        paymentTerms: initialData.paymentTerms || initialData.terms || "Net 30",
        notes: initialData.notes || "",
        lineItems: normalizedLineItems.length > 0 ? normalizedLineItems : [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, tax: 0, total: 0 }]
      }));
    } else {
      setFormData({
        invoiceNumber: generateInvoiceNumber(),
        company: "",
        contact: "",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "DRAFT",
        paymentTerms: "Net 30",
        notes: "",
        lineItems: [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.company || formData.company.trim() === '') {
      alert('Please select a company');
      return;
    }
    
    // Transform line items to backend format - productId is required
    const lineItems = formData.lineItems
      .filter(item => item.product && item.product.trim() !== '') // Only include items with products selected
      .map(item => ({
        productId: item.product, // UUID from product selection (required field)
        description: item.description || '', // Non-null
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.tax || 0,
      }));
    
    // Validate at least one line item
    if (lineItems.length === 0) {
      alert('Please add at least one line item with a product selected');
      return;
    }
    
    // Transform data to match backend InvoiceRequestDTO
    const invoiceData = {
      invoiceNumber: formData.invoiceNumber || generateInvoiceNumber(),
      companyId: formData.company, // Required field
      contactId: formData.contact && formData.contact.trim() !== '' ? formData.contact : null,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      status: formData.status.toUpperCase(),
      terms: formData.paymentTerms || "Net 30",
      notes: formData.notes || '',
      lineItems: lineItems,
    };
    
    onSubmit(invoiceData);
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      product: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      total: 0,
    };
    setFormData({ ...formData, lineItems: [...formData.lineItems, newItem] });
  };

  const removeLineItem = (id: string) => {
    setFormData({ ...formData, lineItems: formData.lineItems.filter(item => item.id !== id) });
  };

  const updateLineItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    const updatedItems = formData.lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        const subtotal = updated.quantity * updated.unitPrice;
        const taxAmount = subtotal * (updated.tax / 100);
        updated.total = subtotal + taxAmount;
        return updated;
      }
      return item;
    });
    setFormData({ ...formData, lineItems: updatedItems });
  };

  const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalTax = formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.tax / 100), 0);
  const total = subtotal + totalTax;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Invoice" : "Create Invoice"}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            {initialData ? "Update" : "Create"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="INV-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a company</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contact</label>
              <select
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a contact (optional)</option>
                {contacts.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Icons.Plus size={14} />
              Add Item
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {formData.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-secondary/30 rounded border border-border">
                <div className="col-span-3">
                  <select
                    value={item.product}
                    onChange={(e) => {
                      const selectedProduct = products.find((p: any) => p.id === e.target.value);
                      updateLineItem(item.id, { 
                        product: e.target.value,
                        unitPrice: selectedProduct?.unitPrice || item.unitPrice,
                        description: selectedProduct?.description || item.description
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="">Select product</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Price"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="Tax%"
                    min="0"
                    max="100"
                    value={item.tax}
                    onChange={(e) => updateLineItem(item.id, { tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-xs font-medium">${(item.total ?? 0).toFixed(2)}</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  {formData.lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600"
                    >
                      <Icons.Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tax:</span>
              <span className="font-medium">${totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
              <span>Amount Due:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Payment instructions, additional terms..."
          />
        </div>
      </form>
    </Modal>
  );
}
