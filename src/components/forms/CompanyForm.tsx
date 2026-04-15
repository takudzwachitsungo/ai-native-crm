import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { companiesApi } from "../../lib/api";

interface CompanyFormData {
  id?: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  employeeCount: string;
  revenue: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  territory: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE" | "PROSPECT";
  parentCompanyId: string;
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
    employeeCount: "",
    revenue: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    territory: "",
    notes: "",
    status: "ACTIVE",
    parentCompanyId: "",
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies", "form-options"],
    queryFn: () => companiesApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
    enabled: isOpen,
  });

  const availableParentCompanies = (companiesData?.content || []).filter(
    (company) => company.id && company.id !== initialData?.id
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || "",
        industry: initialData.industry || "",
        website: initialData.website || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        employeeCount: initialData.employeeCount ? String(initialData.employeeCount) : "",
        revenue: initialData.revenue ? String(initialData.revenue) : "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        zip: (initialData as { postalCode?: string }).postalCode || initialData.zip || "",
        country: initialData.country || "United States",
        territory: initialData.territory || "",
        notes: initialData.notes || "",
        status: initialData.status || "ACTIVE",
        parentCompanyId: initialData.parentCompanyId || "",
      });
    } else {
      setFormData({
        name: "",
        industry: "",
        website: "",
        phone: "",
        email: "",
        employeeCount: "",
        revenue: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
        territory: "",
        notes: "",
        status: "ACTIVE",
        parentCompanyId: "",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const [activeTab, setActiveTab] = useState<'details' | 'address' | 'notes'>('details');

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = `${inputClass} bg-white dark:bg-gray-800/50`;
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const tabHeaders: Record<string, string> = {
    details: initialData ? 'Update company details below.' : 'Add a new company — start with the basics.',
    address: 'Where is the company located? Add territory info too.',
    notes: 'Anything else worth remembering? Jot it down here.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Company" : "Create Company"}
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
          {(['details', 'address', 'notes'] as const).map((tab) => (
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
                  <label className={labelClass}>Company Name <span className="text-red-400">*</span></label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Parent Account</label>
                  <select value={formData.parentCompanyId} onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value })} className={selectClass}>
                    <option value="">No parent company</option>
                    {availableParentCompanies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Industry</label>
                  <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className={selectClass}>
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
                  <label className={labelClass}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as CompanyFormData["status"] })} className={selectClass}>
                    <option value="ACTIVE">Active</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Website</label>
                  <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className={inputClass} placeholder="https://" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employee Count</label>
                  <input type="number" min="0" value={formData.employeeCount} onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Annual Revenue</label>
                  <input type="number" min="0" step="0.01" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Street Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State / Province</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>ZIP / Postal Code</label>
                  <input type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Territory</label>
                <input type="text" value={formData.territory} onChange={(e) => setFormData({ ...formData, territory: e.target.value })} className={inputClass} placeholder="e.g. Zimbabwe, North America, Harare" />
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <label className={labelClass}>Account Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                placeholder="Key relationship, ownership, or hierarchy notes..."
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
