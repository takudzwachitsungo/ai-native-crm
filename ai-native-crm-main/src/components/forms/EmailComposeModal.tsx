import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { emailsApi } from '../../lib/api';
import { useToast } from '../Toast';
import type { Email } from '../../lib/types';

interface EmailComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  template: string;
}

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<EmailComposeData>;
}

export function EmailComposeModal({ isOpen, onClose, initialData }: EmailComposeModalProps) {
  const [formData, setFormData] = useState<EmailComposeData>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    template: '',
  });
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fromEmail = user.email || 'noreply@crm.com';

  const saveDraftMutation = useMutation({
    mutationFn: (data: Partial<Email>) => emailsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      showToast('Draft saved successfully', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to save draft', 'error');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: Partial<Email>) => {
      const email = await emailsApi.create(data);
      if (email.id) {
        return emailsApi.send(email.id);
      }
      throw new Error('Failed to create email');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      showToast('Email sent successfully', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to send email', 'error');
    },
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
      if (initialData.cc) setShowCC(true);
      if (initialData.bcc) setShowBCC(true);
      return;
    }

    setFormData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      template: '',
    });
    setShowCC(false);
    setShowBCC(false);
  }, [initialData, isOpen]);

  const handleTemplateChange = (templateId: string) => {
    setFormData({ ...formData, template: templateId });

    if (templateId === 'intro') {
      setFormData({
        ...formData,
        template: templateId,
        subject: 'Introduction to [Your Company]',
        body: 'Hi [Name],\n\nI hope this email finds you well. I wanted to introduce you to [Your Company] and how we can help...\n\nBest regards,\n[Your Name]',
      });
    } else if (templateId === 'followup') {
      setFormData({
        ...formData,
        template: templateId,
        subject: 'Following up on our conversation',
        body: 'Hi [Name],\n\nI wanted to follow up on our recent conversation about...\n\nLooking forward to hearing from you.\n\nBest regards,\n[Your Name]',
      });
    } else if (templateId === 'proposal') {
      setFormData({
        ...formData,
        template: templateId,
        subject: 'Proposal for [Project Name]',
        body: 'Hi [Name],\n\nPlease find attached our proposal for [Project Name]. We have outlined...\n\nPlease let me know if you have any questions.\n\nBest regards,\n[Your Name]',
      });
    }
  };

  const handleSaveDraft = () => {
    const emailData: Partial<Email> = {
      fromEmail,
      toEmail: formData.to,
      ccEmail: formData.cc || undefined,
      bccEmail: formData.bcc || undefined,
      subject: formData.subject,
      body: formData.body,
      isDraft: true,
      isSent: false,
      isRead: false,
      folder: 'DRAFTS',
    };
    saveDraftMutation.mutate(emailData);
  };

  const handleSend = () => {
    if (!formData.to || !formData.subject || !formData.body) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const emailData: Partial<Email> = {
      fromEmail,
      toEmail: formData.to,
      ccEmail: formData.cc || undefined,
      bccEmail: formData.bcc || undefined,
      subject: formData.subject,
      body: formData.body,
      isDraft: false,
      isSent: false,
      isRead: false,
      folder: 'INBOX',
    };
    sendEmailMutation.mutate(emailData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Email"
      size="xl"
      footer={
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {saveDraftMutation.isPending ? 'Saving...' : 'Save as Draft'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sendEmailMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Use Template</label>
          <select
            value={formData.template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">No Template</option>
            <option value="intro">Introduction Email</option>
            <option value="followup">Follow-up Email</option>
            <option value="proposal">Proposal Email</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            To <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            multiple
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="email@example.com, email2@example.com"
          />
          <div className="flex gap-2 mt-2">
            {!showCC && (
              <button
                type="button"
                onClick={() => setShowCC(true)}
                className="text-xs text-primary hover:underline"
              >
                Add CC
              </button>
            )}
            {!showBCC && (
              <button
                type="button"
                onClick={() => setShowBCC(true)}
                className="text-xs text-primary hover:underline"
              >
                Add BCC
              </button>
            )}
          </div>
        </div>

        {showCC && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">CC</label>
            <input
              type="email"
              multiple
              value={formData.cc}
              onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="cc@example.com"
            />
          </div>
        )}

        {showBCC && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">BCC</label>
            <input
              type="email"
              multiple
              value={formData.bcc}
              onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="bcc@example.com"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={12}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
          />
        </div>
      </div>
    </Modal>
  );
}
