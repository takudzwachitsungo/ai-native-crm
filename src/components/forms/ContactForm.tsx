import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { companiesApi, contactsApi } from "../../lib/api";

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function ContactForm({ isOpen, onClose, onSubmit, initialData }: ContactFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    mobile: initialData?.mobile || "",
    companyId: initialData?.companyId || "",
    title: initialData?.title || "",
    department: initialData?.department || "",
    stakeholderRole: initialData?.stakeholderRole || "",
    influenceLevel: initialData?.influenceLevel || "",
    preferredContactMethod: initialData?.preferredContactMethod || "EMAIL",
    reportsToId: initialData?.reportsToId || "",
    isPrimary: Boolean(initialData?.isPrimary),
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.postalCode || "",
    country: initialData?.country || "United States",
    linkedin: initialData?.linkedinUrl || "",
    twitter: initialData?.twitterUrl || "",
    notes: initialData?.notes || "",
    status: initialData?.status || "ACTIVE",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        mobile: initialData.mobile || "",
        companyId: initialData.companyId || "",
        title: initialData.title || "",
        department: initialData.department || "",
        stakeholderRole: initialData.stakeholderRole || "",
        influenceLevel: initialData.influenceLevel || "",
        preferredContactMethod: initialData.preferredContactMethod || "EMAIL",
        reportsToId: initialData.reportsToId || "",
        isPrimary: Boolean(initialData.isPrimary),
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        zipCode: initialData.postalCode || "",
        country: initialData.country || "United States",
        linkedin: initialData.linkedinUrl || "",
        twitter: initialData.twitterUrl || "",
        notes: initialData.notes || "",
        status: initialData.status || "ACTIVE",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: "",
        companyId: "",
        title: "",
        department: "",
        stakeholderRole: "",
        influenceLevel: "",
        preferredContactMethod: "EMAIL",
        reportsToId: "",
        isPrimary: false,
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States",
        linkedin: "",
        twitter: "",
        notes: "",
        status: "ACTIVE",
      });
    }
  }, [initialData, isOpen]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies", "contact-form-options"],
    queryFn: () => companiesApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
    enabled: isOpen,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", "contact-form-options"],
    queryFn: () => contactsApi.getAll({ page: 0, size: 1000, sort: "lastName,asc" }),
    enabled: isOpen,
  });

  const companies = companiesData?.content || [];
  const reportingOptions = (contactsData?.content || []).filter((contact: any) => {
    if (initialData?.id && contact.id === initialData.id) {
      return false;
    }
    if (!formData.companyId) {
      return true;
    }
    return contact.companyId === formData.companyId;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email,
      phone: formData.phone || null,
      mobile: formData.mobile || null,
      title: formData.title || null,
      department: formData.department || null,
      companyId: formData.companyId || null,
      stakeholderRole: formData.stakeholderRole || null,
      influenceLevel: formData.influenceLevel || null,
      preferredContactMethod: formData.preferredContactMethod || null,
      reportsToId: formData.reportsToId || null,
      isPrimary: formData.isPrimary,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      postalCode: formData.zipCode || null,
      country: formData.country || null,
      linkedinUrl: formData.linkedin || null,
      twitterUrl: formData.twitter || null,
      notes: formData.notes || null,
      status: formData.status || "ACTIVE",
    });
    onClose();
  };

  const [activeTab, setActiveTab] = useState<'contact' | 'role' | 'address' | 'notes'>('contact');

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = `${inputClass} bg-white dark:bg-gray-800/50`;
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const tabHeaders: Record<string, string> = {
    contact: initialData ? 'Update contact details below.' : 'Add a new contact — start with the basics.',
    role: 'Define their role in the buying committee and org structure.',
    address: 'Where are they located? Add social profiles too.',
    notes: 'Anything else worth remembering? Jot it down here.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Contact" : "Create New Contact"}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[0.8125rem] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-1.5 rounded-lg bg-teal-600 text-white text-[0.8125rem] font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 transition-all duration-150 shadow-sm"
          >
            {initialData ? "Save Changes" : "Create Contact"}
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
          {(['contact', 'role', 'address', 'notes'] as const).map((tab) => (
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
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>First Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Last Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Mobile</label>
                  <input type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Job Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Department</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Preferred Contact</label>
                  <select value={formData.preferredContactMethod} onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })} className={selectClass}>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="LINKEDIN">LinkedIn</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Role Tab */}
          {activeTab === 'role' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Company</label>
                  <select value={formData.companyId} onChange={(e) => setFormData({ ...formData, companyId: e.target.value, reportsToId: "" })} className={selectClass}>
                    <option value="">Select a company</option>
                    {companies.map((company: any) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Stakeholder Role</label>
                  <select value={formData.stakeholderRole} onChange={(e) => setFormData({ ...formData, stakeholderRole: e.target.value })} className={selectClass}>
                    <option value="">Select role</option>
                    <option value="EXECUTIVE_SPONSOR">Executive sponsor</option>
                    <option value="DECISION_MAKER">Decision maker</option>
                    <option value="CHAMPION">Champion</option>
                    <option value="INFLUENCER">Influencer</option>
                    <option value="PROCUREMENT">Procurement</option>
                    <option value="FINANCE">Finance</option>
                    <option value="TECHNICAL_EVALUATOR">Technical evaluator</option>
                    <option value="END_USER">End user</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Influence Level</label>
                  <select value={formData.influenceLevel} onChange={(e) => setFormData({ ...formData, influenceLevel: e.target.value })} className={selectClass}>
                    <option value="">Select influence</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Reports To</label>
                  <select value={formData.reportsToId} onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })} className={selectClass}>
                    <option value="">No manager</option>
                    {reportingOptions.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClass}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                    />
                    <span className="text-[0.8125rem] text-gray-700 dark:text-gray-300">Primary stakeholder</span>
                  </label>
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
                  <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>LinkedIn Profile</label>
                  <input type="url" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className={inputClass} placeholder="https://linkedin.com/in/" />
                </div>
                <div>
                  <label className={labelClass}>Twitter / X Profile</label>
                  <input type="url" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} className={inputClass} placeholder="https://x.com/" />
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
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                rows={6}
                placeholder="Add stakeholder context, buying signals, or relationship notes..."
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
