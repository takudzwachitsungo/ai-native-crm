import { useState, useEffect } from 'react';
import { Modal } from '../Modal';

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function LeadForm({ isOpen, onClose, onSubmit, initialData }: LeadFormProps) {
  const [formData, setFormData] = useState({
    name: initialData ? `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim() : '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    title: initialData?.title || '',
    source: initialData?.source || 'WEBSITE',
    status: initialData?.status?.toLowerCase() || 'new',
    value: initialData?.estimatedValue || '',
    notes: initialData?.notes || '',
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim(),
        email: initialData.email || '',
        phone: initialData.phone || '',
        company: initialData.company || '',
        title: initialData.title || '',
        source: initialData.source || 'WEBSITE',
        status: initialData.status?.toLowerCase() || 'new',
        value: initialData.estimatedValue || '',
        notes: initialData.notes || '',
      });
    } else {
      // Reset form when creating new lead
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        source: 'WEBSITE',
        status: 'new',
        value: '',
        notes: '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split name into firstName and lastName
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // If only one name, use it for both
    
    const leadData = {
      firstName,
      lastName,
      email: formData.email,
      phone: formData.phone || null,
      company: formData.company || null,
      title: formData.title || null,
      source: formData.source || null,
      status: formData.status.toUpperCase(),
      estimatedValue: formData.value ? parseFloat(formData.value) : null,
      notes: formData.notes || null,
    };
    
    onSubmit(leadData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Lead' : 'Create New Lead'}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            {initialData ? 'Save Changes' : 'Create Lead'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium mb-1">Lead Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="WEBSITE">Website</option>
              <option value="REFERRAL">Referral</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
              <option value="COLD_CALL">Cold Call</option>
              <option value="EVENT">Event</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estimated Value ($)</label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={4}
            placeholder="Add any additional notes..."
          />
        </div>
      </form>
    </Modal>
  );
}