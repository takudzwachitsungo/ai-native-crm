import { useState, useEffect } from 'react';
import { Modal } from '../Modal';

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function LeadForm({ isOpen, onClose, onSubmit, initialData }: LeadFormProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'qualification' | 'notes'>('contact');
  const [formData, setFormData] = useState({
    name: initialData ? `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim() : '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    title: initialData?.title || '',
    territory: initialData?.territory || '',
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
        territory: initialData.territory || '',
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
        territory: '',
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
      territory: formData.territory || null,
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
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[0.8125rem] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-1.5 rounded-lg bg-teal-600 text-white text-[0.8125rem] font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 transition-all duration-150 shadow-sm"
          >
            {initialData ? 'Save Changes' : 'Create Lead'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Conversational header per tab */}
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">
            {activeTab === 'contact' && (initialData ? 'Update contact details below.' : 'Add a new lead in seconds — start with the basics.')}
            {activeTab === 'qualification' && 'How did they find you? Set the source, status, and value.'}
            {activeTab === 'notes' && 'Anything else worth remembering? Jot it down here.'}
          </p>
        </div>

        {/* Segment Control */}
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
          {(['contact', 'qualification', 'notes'] as const).map((tab) => (
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
              {tab === 'qualification' ? 'Qualification' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content — fixed height so modal doesn't resize */}
        <div className="min-h-[14.5rem]">
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Territory</label>
                  <input
                    type="text"
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    placeholder="e.g. Harare, West Coast, EMEA"
                    className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Qualification Tab */}
          {activeTab === 'qualification' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                >
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="EVENT">Event</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Est. Value ($)</label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0"
                  className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                placeholder="Add any additional notes..."
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
