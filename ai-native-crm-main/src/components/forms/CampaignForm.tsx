import { useEffect, useState } from "react";
import { Modal } from "../Modal";

interface CampaignFormData {
  name: string;
  type: string;
  status: string;
  channel: string;
  targetAudience: string;
  segmentType: string;
  segmentName: string;
  primaryPersona: string;
  territoryFocus: string;
  journeyStage: string;
  autoEnrollNewLeads: boolean;
  nurtureCadenceDays: string;
  nurtureTouchCount: string;
  primaryCallToAction: string;
  audienceSize: string;
  budget: string;
  expectedRevenue: string;
  actualRevenue: string;
  leadsGenerated: string;
  opportunitiesCreated: string;
  conversions: string;
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
}

interface CampaignFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  initialData?: Partial<CampaignFormData>;
}

const defaultFormData: CampaignFormData = {
  name: "",
  type: "EMAIL",
  status: "DRAFT",
  channel: "EMAIL",
  targetAudience: "",
  segmentType: "CUSTOM",
  segmentName: "",
  primaryPersona: "",
  territoryFocus: "",
  journeyStage: "AWARENESS",
  autoEnrollNewLeads: true,
  nurtureCadenceDays: "3",
  nurtureTouchCount: "4",
  primaryCallToAction: "",
  audienceSize: "",
  budget: "",
  expectedRevenue: "",
  actualRevenue: "",
  leadsGenerated: "",
  opportunitiesCreated: "",
  conversions: "",
  startDate: "",
  endDate: "",
  description: "",
  notes: "",
};

export function CampaignForm({ isOpen, onClose, onSubmit, initialData }: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignFormData>(defaultFormData);

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

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      alert("End date cannot be before start date.");
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      type: formData.type,
      status: formData.status,
      channel: formData.channel,
      targetAudience: formData.targetAudience.trim() || null,
      segmentType: formData.segmentType || null,
      segmentName: formData.segmentName.trim() || null,
      primaryPersona: formData.primaryPersona.trim() || null,
      territoryFocus: formData.territoryFocus.trim() || null,
      journeyStage: formData.journeyStage || null,
      autoEnrollNewLeads: formData.autoEnrollNewLeads,
      nurtureCadenceDays: formData.nurtureCadenceDays ? Number(formData.nurtureCadenceDays) : null,
      nurtureTouchCount: formData.nurtureTouchCount ? Number(formData.nurtureTouchCount) : null,
      primaryCallToAction: formData.primaryCallToAction.trim() || null,
      audienceSize: formData.audienceSize ? Number(formData.audienceSize) : null,
      budget: formData.budget ? Number(formData.budget) : null,
      expectedRevenue: formData.expectedRevenue ? Number(formData.expectedRevenue) : null,
      actualRevenue: formData.actualRevenue ? Number(formData.actualRevenue) : null,
      leadsGenerated: formData.leadsGenerated ? Number(formData.leadsGenerated) : null,
      opportunitiesCreated: formData.opportunitiesCreated ? Number(formData.opportunitiesCreated) : null,
      conversions: formData.conversions ? Number(formData.conversions) : null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      description: formData.description.trim() || null,
      notes: formData.notes.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Campaign" : "Create Campaign"}
      size="xl"
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
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Campaign Basics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Campaign Name <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="EMAIL">Email</option>
                <option value="EVENT">Event</option>
                <option value="SOCIAL">Social</option>
                <option value="CONTENT">Content</option>
                <option value="WEBINAR">Webinar</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="OUTBOUND">Outbound</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DRAFT">Draft</option>
                <option value="PLANNED">Planned</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="EMAIL">Email</option>
                <option value="SOCIAL">Social</option>
                <option value="PAID_ADS">Paid Ads</option>
                <option value="WEBSITE">Website</option>
                <option value="EVENT">Event</option>
                <option value="PHONE">Phone</option>
                <option value="SMS">SMS</option>
                <option value="PARTNER">Partner</option>
                <option value="MULTI_CHANNEL">Multi-channel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Target Audience</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Segment Type</label>
              <select
                value={formData.segmentType}
                onChange={(e) => setFormData({ ...formData, segmentType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="INDUSTRY">Industry</option>
                <option value="TERRITORY">Territory</option>
                <option value="PERSONA">Persona</option>
                <option value="ACCOUNT_BASED">Account-based</option>
                <option value="LIFECYCLE">Lifecycle</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Segment Name</label>
              <input
                type="text"
                value={formData.segmentName}
                onChange={(e) => setFormData({ ...formData, segmentName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Primary Persona</label>
              <input
                type="text"
                value={formData.primaryPersona}
                onChange={(e) => setFormData({ ...formData, primaryPersona: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Territory Focus</label>
              <input
                type="text"
                value={formData.territoryFocus}
                onChange={(e) => setFormData({ ...formData, territoryFocus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Timeline, Spend & Journey</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Budget</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Audience Size</label>
              <input
                type="number"
                min="0"
                value={formData.audienceSize}
                onChange={(e) => setFormData({ ...formData, audienceSize: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Journey Stage</label>
              <select
                value={formData.journeyStage}
                onChange={(e) => setFormData({ ...formData, journeyStage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="AWARENESS">Awareness</option>
                <option value="CONSIDERATION">Consideration</option>
                <option value="DECISION">Decision</option>
                <option value="EXPANSION">Expansion</option>
                <option value="RETENTION">Retention</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-enroll new leads</p>
                <p className="text-xs text-muted-foreground">Use campaign nurture settings on attributed leads.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoEnrollNewLeads}
                onChange={(e) => setFormData({ ...formData, autoEnrollNewLeads: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nurture Cadence (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.nurtureCadenceDays}
                onChange={(e) => setFormData({ ...formData, nurtureCadenceDays: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nurture Touches</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.nurtureTouchCount}
                onChange={(e) => setFormData({ ...formData, nurtureTouchCount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Primary Call to Action</label>
              <input
                type="text"
                value={formData.primaryCallToAction}
                onChange={(e) => setFormData({ ...formData, primaryCallToAction: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Expected Revenue</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expectedRevenue}
                onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Actual Revenue</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.actualRevenue}
                onChange={(e) => setFormData({ ...formData, actualRevenue: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Leads Generated</label>
              <input
                type="number"
                min="0"
                value={formData.leadsGenerated}
                onChange={(e) => setFormData({ ...formData, leadsGenerated: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Opportunities Created</label>
              <input
                type="number"
                min="0"
                value={formData.opportunitiesCreated}
                onChange={(e) => setFormData({ ...formData, opportunitiesCreated: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Conversions</label>
              <input
                type="number"
                min="0"
                value={formData.conversions}
                onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
