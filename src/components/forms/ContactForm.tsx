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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Contact" : "Create New Contact"}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            {initialData ? "Save Changes" : "Create Contact"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Stakeholder Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value, reportsToId: "" })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
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
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stakeholder Role</label>
              <select
                value={formData.stakeholderRole}
                onChange={(e) => setFormData({ ...formData, stakeholderRole: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
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
            <div>
              <label className="block text-sm font-medium mb-1">Influence Level</label>
              <select
                value={formData.influenceLevel}
                onChange={(e) => setFormData({ ...formData, influenceLevel: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">Select influence</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Contact Method</label>
              <select
                value={formData.preferredContactMethod}
                onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="MOBILE">Mobile</option>
                <option value="LINKEDIN">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reports To</label>
              <select
                value={formData.reportsToId}
                onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">No manager</option>
                {reportingOptions.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded border border-border px-3 py-2">
              <input
                id="isPrimary"
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isPrimary" className="text-sm font-medium">
                Mark as primary stakeholder for this account
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State/Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ZIP/Postal Code</label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Channels</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn Profile</label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://linkedin.com/in/"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Twitter / X Profile</label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://x.com/"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              Preserve buying-committee context by linking each stakeholder to the right account and manager.
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            placeholder="Add stakeholder context, buying signals, or relationship notes..."
          />
        </div>
      </form>
    </Modal>
  );
}
