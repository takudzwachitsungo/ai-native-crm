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

  const margin = formData.price && formData.cost 
    ? ((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)
    : "0";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Product" : "Create Product"}
      size="lg"
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
          <h3 className="text-sm font-medium text-foreground mb-3">Product Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., PRD-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Pricing & Inventory</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Unit Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cost Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Stock Quantity</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <div className="p-3 bg-secondary/50 rounded border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profit Margin:</span>
                    <span className="font-medium text-foreground">{margin}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Product description, features, specifications..."
          />
        </div>
      </form>
    </Modal>
  );
}
