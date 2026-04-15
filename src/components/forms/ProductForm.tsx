import { useState, useEffect } from "react";
import { Modal } from "../Modal";

// Generate a unique SKU
const generateSKU = () => {
  const prefix = 'PRD';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  price: string;
  cost: string;
  stock: string;
  unit: string;
  description: string;
  status: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  initialData?: Partial<ProductFormData>;
}

export function ProductForm({ isOpen, onClose, onSubmit, initialData }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    category: "",
    price: "",
    cost: "",
    stock: "",
    unit: "pcs",
    description: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        sku: initialData.sku || "",
        category: initialData.category || "",
        price: initialData.price || "",
        cost: initialData.cost || "",
        stock: initialData.stock || "",
        unit: initialData.unit || "pcs",
        description: initialData.description || "",
        status: initialData.status || "ACTIVE",
      });
    } else {
      // New product - auto-generate SKU
      setFormData({
        name: "",
        sku: generateSKU(),
        category: "",
        price: "",
        cost: "",
        stock: "",
        unit: "pcs",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.category || formData.category.trim() === '') {
      alert('Please select a category');
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Please enter a valid unit price');
      return;
    }
    
    // Transform to backend DTO - match ProductRequestDTO field names
    const productData: any = {
      name: formData.name,
      sku: formData.sku || null,
      category: formData.category, // ProductCategory enum - validated above
      unitPrice: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : null,
      stockQuantity: formData.stock ? parseInt(formData.stock) : 0,
      description: formData.description || null,
      status: formData.status || 'ACTIVE', // ProductStatus enum (ACTIVE, INACTIVE, DISCONTINUED)
      unit: formData.unit || 'pcs',
      trackInventory: true,
    };
    
    onSubmit(productData);
  };

  const isEdit = !!initialData;
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'description'>('details');

  const tabs: ('details' | 'pricing' | 'description')[] = ['details', 'pricing', 'description'];
  const tabHeaders: Record<string, string> = {
    details: isEdit ? 'Update product name, category, and status.' : 'Name your product and assign a category.',
    pricing: isEdit ? 'Adjust pricing, cost, and stock levels.' : 'Set pricing, cost, and inventory details.',
    description: 'Add a description, features, or specifications.',
  };

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const margin = formData.price && formData.cost 
    ? ((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)
    : "0";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "Create Product"}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
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
            {isEdit ? "Update" : "Create"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Segment Control */}
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-[0.75rem] font-medium rounded-md transition-all duration-150 capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Header */}
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">{tabHeaders[activeTab]}</p>
        </div>

        {/* Tab Content */}
        <div className="min-h-[20rem]">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., PRD-001"
                  />
                </div>
                <div>
                  <label className={labelClass}>Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Select Category</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICES">Services</option>
                    <option value="SUBSCRIPTIONS">Subscriptions</option>
                    <option value="TRAINING">Training</option>
                    <option value="SUPPORT">Support</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={selectClass}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DRAFT">Draft</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Unit Price *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.8125rem] text-gray-400">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full h-9 pl-7 pr-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.8125rem] text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full h-9 pl-7 pr-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={selectClass}
                  >
                    <option value="pcs">Pieces</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilogram</option>
                    <option value="lb">Pound</option>
                    <option value="license">License</option>
                    <option value="user">User</option>
                    <option value="hour">Hour</option>
                    <option value="month">Month</option>
                  </select>
                </div>
                {formData.price && formData.cost && (
                  <div className="col-span-2">
                    <div className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex items-center justify-between text-[0.8125rem]">
                        <span className="text-gray-500 dark:text-gray-400">Profit Margin:</span>
                        <span className="font-medium text-teal-600">{margin}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'description' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                  placeholder="Product description, features, specifications..."
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
