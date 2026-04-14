import { useEffect, useState } from "react";
import { Modal } from "../Modal";

interface SupportCaseFormData {
  title: string;
  status: string;
  priority: string;
  customerTier: string;
  source: string;
  responseDueAt: string;
  resolutionDueAt: string;
  customerImpact: string;
  description: string;
  resolutionSummary: string;
}

interface SupportCaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  initialData?: Partial<SupportCaseFormData>;
}

const defaultFormData: SupportCaseFormData = {
  title: "",
  status: "OPEN",
  priority: "MEDIUM",
  customerTier: "STANDARD",
  source: "OTHER",
  responseDueAt: "",
  resolutionDueAt: "",
  customerImpact: "",
  description: "",
  resolutionSummary: "",
};

export function SupportCaseForm({ isOpen, onClose, onSubmit, initialData }: SupportCaseFormProps) {
  const [formData, setFormData] = useState<SupportCaseFormData>(defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultFormData,
        ...initialData,
      });
      return;
    }
    setFormData(defaultFormData);
  }, [initialData, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.responseDueAt && formData.resolutionDueAt && formData.resolutionDueAt < formData.responseDueAt) {
      alert("Resolution SLA cannot be before response SLA.");
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      status: formData.status,
      priority: formData.priority,
      customerTier: formData.customerTier,
      source: formData.source,
      responseDueAt: formData.responseDueAt || null,
      resolutionDueAt: formData.resolutionDueAt || null,
      customerImpact: formData.customerImpact.trim() || null,
      description: formData.description.trim() || null,
      resolutionSummary: formData.resolutionSummary.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Case" : "Create Case"}
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Case Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Customer Tier</label>
            <select
              value={formData.customerTier}
              onChange={(e) => setFormData({ ...formData, customerTier: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
              <option value="STRATEGIC">Strategic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
              <option value="PORTAL">Portal</option>
              <option value="CHAT">Chat</option>
              <option value="INTERNAL">Internal</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Response SLA</label>
            <input
              type="datetime-local"
              value={formData.responseDueAt}
              onChange={(e) => setFormData({ ...formData, responseDueAt: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Resolution SLA</label>
            <input
              type="datetime-local"
              value={formData.resolutionDueAt}
              onChange={(e) => setFormData({ ...formData, resolutionDueAt: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Customer Impact</label>
          <input
            type="text"
            value={formData.customerImpact}
            onChange={(e) => setFormData({ ...formData, customerImpact: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Billing blocked, user access lost, onboarding delayed..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Resolution Summary</label>
          <textarea
            value={formData.resolutionSummary}
            onChange={(e) => setFormData({ ...formData, resolutionSummary: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
