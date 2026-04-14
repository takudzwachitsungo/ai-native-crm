import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { Icons } from "../icons";
import { companiesApi, contactsApi, productsApi } from "../../lib/api";
import type { Quote } from "../../lib/types";

interface QuoteLineItem {
  id: string;
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface QuoteFormData {
  quoteNumber: string;
  company: string;
  contact: string;
  issueDate: string;
  validUntil: string;
  stage: string;
  terms: string;
  notes: string;
  lineItems: QuoteLineItem[];
}

interface QuoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<QuoteFormData & Quote>;
}

export function QuoteForm({ isOpen, onClose, onSubmit, initialData }: QuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: "",
    company: "",
    contact: "",
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    stage: "DRAFT",
    terms: "Net 30",
    notes: "",
    lineItems: [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
  });

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  // Fetch products for line items dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen,
  });

  const companies = companiesData?.content || [];
  const contacts = contactsData?.content || [];
  const products = productsData?.content || [];

  // Generate unique quote number
  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `Q-${year}-${random}`;
  };

  useEffect(() => {
    if (initialData) {
      // Normalize line items to ensure all have required fields including total
      // Backend uses: productId, discountPercent, lineTotal
      // Frontend uses: product, discount, total
      const normalizedLineItems = (initialData.lineItems || []).map((item: any, index: number) => ({
        id: item.id || String(index + 1),
        product: item.product || item.productId || "",
        description: item.description || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount ?? item.discountPercent ?? 0,
        total: item.total ?? item.lineTotal ?? ((item.quantity || 1) * (item.unitPrice || 0) * (1 - (item.discount ?? item.discountPercent ?? 0) / 100))
      }));
      
      setFormData((prev) => ({ 
        ...prev, 
        quoteNumber: initialData.quoteNumber || "",
        // Handle both naming conventions: company/contact (frontend) and companyId/contactId (backend)
        company: initialData.company || initialData.companyId || "",
        contact: initialData.contact || initialData.contactId || "",
        issueDate: initialData.issueDate || new Date().toISOString().split('T')[0],
        validUntil: initialData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stage: initialData.stage || initialData.status || "DRAFT",
        terms: initialData.terms || "Net 30",
        notes: initialData.notes || "",
        lineItems: normalizedLineItems.length > 0 ? normalizedLineItems : [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }]
      }));
    } else {
      setFormData({
        quoteNumber: generateQuoteNumber(), // Auto-generate unique quote number
        company: "",
        contact: "",
        issueDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        stage: "DRAFT",
        terms: "Net 30",
        notes: "",
        lineItems: [{ id: "1", product: "", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
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
        description: item.description || '', // Backend requires non-null description
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discount || 0,
      }));
    
    // Validate at least one line item
    if (lineItems.length === 0) {
      alert('Please add at least one line item with a product selected');
      return;
    }
    
    // Transform data to match backend QuoteRequestDTO
    const quoteData = {
      quoteNumber: formData.quoteNumber || `Q-${Date.now()}`, // Generate if not provided
      companyId: formData.company, // Required field
      contactId: formData.contact && formData.contact.trim() !== '' ? formData.contact : null,
      issueDate: formData.issueDate,
      validUntil: formData.validUntil || null,
      status: formData.stage.toUpperCase(),
      paymentTerms: formData.terms || null,
      notes: formData.notes || null,
      lineItems: lineItems, // Backend will calculate totals from line items
    };
    
    console.log('Submitting quote data:', JSON.stringify(quoteData, null, 2));
    onSubmit(quoteData);
  };

  const addLineItem = () => {
    const newItem: QuoteLineItem = {
      id: Date.now().toString(),
      product: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    };
    setFormData({ ...formData, lineItems: [...formData.lineItems, newItem] });
  };

  const removeLineItem = (id: string) => {
    setFormData({ ...formData, lineItems: formData.lineItems.filter(item => item.id !== id) });
  };

  const updateLineItem = (id: string, updates: Partial<QuoteLineItem>) => {
    const updatedItems = formData.lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        const subtotal = updated.quantity * updated.unitPrice;
        const discountAmount = subtotal * (updated.discount / 100);
        updated.total = subtotal - discountAmount;
        return updated;
      }
      return item;
    });
    setFormData({ ...formData, lineItems: updatedItems });
  };

  const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discount / 100), 0);
  const total = subtotal - totalDiscount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Quote" : "Create Quote"}
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
          <h3 className="text-sm font-medium text-foreground mb-3">Quote Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Quote Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.quoteNumber}
                onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Q-2024-001"
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
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
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
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
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
                Valid Until <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
              <select
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
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
                    required
                    value={item.product}
                    onChange={(e) => {
                      const selectedProduct = products.find((p: any) => p.id === e.target.value);
                      updateLineItem(item.id, { 
                        product: e.target.value,
                        description: selectedProduct?.description || '',
                        unitPrice: selectedProduct?.unitPrice || 0
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="">Select a product</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
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
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateLineItem(item.id, { quantity: isNaN(value) ? 1 : value });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Price"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      updateLineItem(item.id, { unitPrice: isNaN(value) ? 0 : value });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="%"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      updateLineItem(item.id, { discount: isNaN(value) ? 0 : value });
                    }}
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
              <span className="text-muted-foreground">Total Discount:</span>
              <span className="font-medium text-red-600">-${totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
              <span>Total:</span>
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
            placeholder="Additional terms, conditions, or notes..."
          />
        </div>
      </form>
    </Modal>
  );
}
