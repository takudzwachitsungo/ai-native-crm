import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { companiesApi } from '../../lib/api';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function ContactForm({ isOpen, onClose, onSubmit, initialData }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: initialData ? `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim() : '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    companyId: initialData?.companyId || '',
    title: initialData?.title || '',
    department: initialData?.department || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.postalCode || '',
    country: initialData?.country || 'United States',
    website: initialData?.website || '',
    linkedin: initialData?.linkedinUrl || '',
    notes: initialData?.notes || '',
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim(),
        email: initialData.email || '',
        phone: initialData.phone || '',
        companyId: initialData.companyId || '',
        title: initialData.title || '',
        department: initialData.department || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zipCode: initialData.postalCode || '',
        country: initialData.country || 'United States',
        website: initialData.website || '',
        linkedin: initialData.linkedinUrl || '',
        notes: initialData.notes || '',
      });
    } else {
      // Reset form when creating new contact
      setFormData({
        name: '',
        email: '',
        phone: '',
        companyId: '',
        title: '',
        department: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        website: '',
        linkedin: '',
        notes: '',
      });
    }
  }, [initialData]);

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll({ page: 0, size: 1000 }),
  });

  const companies = companiesData?.content || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split name into firstName and lastName
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];
    
    const contactData = {
      firstName,
      lastName,
      email: formData.email,
      phone: formData.phone || null,
      mobile: null,
      title: formData.title || null,
      companyId: formData.companyId || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      postalCode: formData.zipCode || null,
      country: formData.country || null,
      linkedinUrl: formData.linkedin || null,
      twitterUrl: null,
      notes: formData.notes || null,
      status: initialData?.status || 'ACTIVE',
    };
    
    onSubmit(contactData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Contact' : 'Create New Contact'}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            {initialData ? 'Save Changes' : 'Create Contact'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <label className="block text-sm font-medium mb-1">Company</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
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
          <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://"
              />
            </div>
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
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            placeholder="Add any additional notes..."
          />
        </div>
      </form>
    </Modal>
  );
}