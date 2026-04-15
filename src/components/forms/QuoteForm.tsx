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

  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'notes'>('details');

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = `${inputClass} bg-white dark:bg-gray-800/50`;
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const tabHeaders: Record<string, string> = {
    details: initialData ? 'Update quote details below.' : 'Create a new quote — set the company, dates, and terms.',
    items: 'Add products, quantities, and pricing to the quote.',
    notes: 'Add any extra terms, conditions, or context.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Quote" : "Create Quote"}
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[0.8125rem] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-5 py-1.5 rounded-lg bg-teal-600 text-white text-[0.8125rem] font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 transition-all duration-150 shadow-sm"
          >
            {initialData ? "Update" : "Create"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Conversational header per tab */}
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">{tabHeaders[activeTab]}</p>
        </div>

        {/* Segment Control */}
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
          {(['details', 'items', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-[0.75rem] font-medium rounded-md transition-all duration-150 capitalize
                ${activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content — fixed height so modal doesn't resize */}
        <div className="min-h-[20rem]">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Quote Number <span className="text-red-400">*</span></label>
                  <input type="text" required value={formData.quoteNumber} onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })} className={inputClass} placeholder="Q-2024-001" />
                </div>
                <div>
                  <label className={labelClass}>Company <span className="text-red-400">*</span></label>
                  <select required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className={selectClass}>
                    <option value="">Select a company</option>
                    {companies.map((company: any) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Contact</label>
                  <select value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className={selectClass}>
                    <option value="">Select a contact (optional)</option>
                    {contacts.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Stage</label>
                  <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className={selectClass}>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="DECLINED">Declined</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Issue Date <span className="text-red-400">*</span></label>
                  <input type="date" required value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valid Until <span className="text-red-400">*</span></label>
                  <input type="date" required value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <select value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} className={selectClass}>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.75rem] font-medium text-gray-500 dark:text-gray-400">Product / Description / Qty / Price / Discount</p>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-[0.75rem] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1"
                >
                  <Icons.Plus size={14} />
                  Add Item
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {formData.lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-2.5 rounded-md bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50">
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
                        className="w-full h-8 px-2 text-[0.75rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      >
                        <option value="">Product</option>
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
                        className="w-full h-8 px-2 text-[0.75rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, { quantity: isNaN(parseInt(e.target.value)) ? 1 : parseInt(e.target.value) })}
                        className="w-full h-8 px-2 text-[0.75rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Price"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, { unitPrice: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) })}
                        className="w-full h-8 px-2 text-[0.75rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        placeholder="%"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateLineItem(item.id, { discount: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) })}
                        className="w-full h-8 px-2 text-[0.75rem] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <span className="text-[0.75rem] font-medium text-gray-900 dark:text-gray-100">${(item.total ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      {formData.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                <div className="flex justify-between text-[0.8125rem]">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[0.8125rem]">
                  <span className="text-gray-500 dark:text-gray-400">Total Discount:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-${totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[0.875rem] font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">Total:</span>
                  <span className="text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                placeholder="Additional terms, conditions, or notes..."
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
