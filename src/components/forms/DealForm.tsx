import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { companiesApi, contactsApi } from '../../lib/api';

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function DealForm({ isOpen, onClose, onSubmit, initialData }: DealFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    value: initialData?.value || '',
    company: initialData?.companyId || '',
    contact: initialData?.contactId || '',
    stage: initialData?.stage || 'PROSPECTING',
    probability: initialData?.probability || '10',
    expectedCloseDate: initialData?.expectedCloseDate || '',
    type: initialData?.type || 'New Business',
    source: initialData?.source || '',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        value: initialData.value || '',
        company: initialData.companyId || '',
        contact: initialData.contactId || '',
        stage: initialData.stage || 'PROSPECTING',
        probability: initialData.probability || '10',
        expectedCloseDate: initialData.expectedCloseDate || '',
        type: initialData.type || 'New Business',
        source: initialData.source || '',
        description: initialData.description || '',
        notes: initialData.notes || '',
      });
    } else {
      // Reset form when creating new deal
      setFormData({
        name: '',
        value: '',
        company: '',
        contact: '',
        stage: 'PROSPECTING',
        probability: '10',
        expectedCloseDate: '',
        type: 'New Business',
        source: '',
        description: '',
        notes: '',
      });
    }
  }, [initialData]);

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen, // Only fetch when modal is open
  });

  const companies = companiesData?.content || [];

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getAll({ page: 0, size: 100 }),
    enabled: isOpen, // Only fetch when modal is open
  });

  const contacts = contactsData?.content || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform form data to match backend DTO
    const dealData = {
      ...formData,
      companyId: formData.company || null,  // Rename company to companyId
      contactId: formData.contact && formData.contact.trim() !== '' ? formData.contact : null,  // Rename contact to contactId, send null if empty
      value: formData.value ? parseFloat(formData.value) : null,
      probability: formData.probability ? parseInt(formData.probability) : null,
    };
    
    // Remove the frontend field names
    delete dealData.company;
    delete dealData.contact;
    delete dealData.contact;
    
    onSubmit(dealData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Deal' : 'Create New Deal'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            {initialData ? 'Save Changes' : 'Create Deal'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deal Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              placeholder="e.g., Enterprise License - Q4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deal Value ($) *</label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <select
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a company (optional)</option>
              {companies.map((company: any) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary Contact</label>
            <select
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a contact (optional)</option>
              {contacts.map((contact: any) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Stage *</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="PROSPECTING">Prospecting</option>
              <option value="QUALIFICATION">Qualification</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Probability (%)</label>
            <input
              type="number"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expected Close Date</label>
            <input
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deal Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option>New Business</option>
              <option>Existing Business</option>
              <option>Renewal</option>
              <option>Upsell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lead Source</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g., Website, Referral, Cold Call"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            placeholder="Describe the deal details..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Internal Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            placeholder="Add any internal notes..."
          />
        </div>
      </form>
    </Modal>
  );
}