import { useState, useEffect } from "react";
import { Modal } from "../Modal";

interface CompanyFormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  employees: string;
  revenue: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  description: string;
}

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyFormData) => void;
  initialData?: Partial<CompanyFormData>;
}

export function CompanyForm({ isOpen, onClose, onSubmit, initialData }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    employees: "",
    revenue: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    } else {
      setFormData({
        name: "",
        industry: "",
        website: "",
        phone: "",
        email: "",
        employees: "",
        revenue: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
        description: "",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform form data to match backend DTO
    const companyData: any = {
      name: formData.name,
      email: formData.email,
      industry: formData.industry || null,
      website: formData.website || null,
      phone: formData.phone || null,
      revenue: null,
      employeeCount: formData.employees ? parseInt(formData.employees) : null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      postalCode: formData.zip || null,
      country: formData.country || null,
      notes: formData.description || null,
      status: 'ACTIVE',
    };
    
    onSubmit(companyData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Company" : "Create Company"}
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
          <h3 className="text-sm font-medium text-foreground mb-3">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company Name <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-foreground mb-1">Industry</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Industry</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="HEALTHCARE">Healthcare</option>
                <option value="FINANCE">Finance</option>
                <option value="MANUFACTURING">Manufacturing</option>
                <option value="RETAIL">Retail</option>
                <option value="REAL_ESTATE">Real Estate</option>
                <option value="EDUCATION">Education</option>
                <option value="CONSULTING">Consulting</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Employees</label>
              <select
                value={formData.employees}
                onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Range</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="501-1000">501-1000</option>
                <option value="1000+">1000+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
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
            placeholder="Brief description of the company..."
          />
        </div>
      </form>
    </Modal>
  );
}
