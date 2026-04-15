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

  const [activeTab, setActiveTab] = useState<'basics' | 'targeting' | 'timeline' | 'performance' | 'notes'>('basics');

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = `${inputClass} bg-white dark:bg-gray-800/50`;
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const tabHeaders: Record<string, string> = {
    basics: initialData ? 'Update campaign details below.' : 'Set up a new campaign — name it and pick a channel.',
    targeting: 'Who are you reaching? Define the audience and segment.',
    timeline: 'When does it run? Set dates, budget, and nurture cadence.',
    performance: 'Track results — revenue, leads, and conversions.',
    notes: 'Add a description or any extra context.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Campaign" : "Create Campaign"}
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
          {(['basics', 'targeting', 'timeline', 'performance', 'notes'] as const).map((tab) => (
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
          {/* Basics Tab */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Campaign Name <span className="text-red-400">*</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClass}>
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
                  <label className={labelClass}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClass}>
                    <option value="DRAFT">Draft</option>
                    <option value="PLANNED">Planned</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Channel</label>
                  <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className={selectClass}>
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
                  <label className={labelClass}>Journey Stage</label>
                  <select value={formData.journeyStage} onChange={(e) => setFormData({ ...formData, journeyStage: e.target.value })} className={selectClass}>
                    <option value="AWARENESS">Awareness</option>
                    <option value="CONSIDERATION">Consideration</option>
                    <option value="DECISION">Decision</option>
                    <option value="EXPANSION">Expansion</option>
                    <option value="RETENTION">Retention</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Primary Call to Action</label>
                <input type="text" value={formData.primaryCallToAction} onChange={(e) => setFormData({ ...formData, primaryCallToAction: e.target.value })} className={inputClass} />
              </div>
            </div>
          )}

          {/* Targeting Tab */}
          {activeTab === 'targeting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Target Audience</label>
                  <input type="text" value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Segment Type</label>
                  <select value={formData.segmentType} onChange={(e) => setFormData({ ...formData, segmentType: e.target.value })} className={selectClass}>
                    <option value="INDUSTRY">Industry</option>
                    <option value="TERRITORY">Territory</option>
                    <option value="PERSONA">Persona</option>
                    <option value="ACCOUNT_BASED">Account-based</option>
                    <option value="LIFECYCLE">Lifecycle</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Segment Name</label>
                  <input type="text" value={formData.segmentName} onChange={(e) => setFormData({ ...formData, segmentName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Primary Persona</label>
                  <input type="text" value={formData.primaryPersona} onChange={(e) => setFormData({ ...formData, primaryPersona: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Territory Focus</label>
                  <input type="text" value={formData.territoryFocus} onChange={(e) => setFormData({ ...formData, territoryFocus: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Audience Size</label>
                  <input type="number" min="0" value={formData.audienceSize} onChange={(e) => setFormData({ ...formData, audienceSize: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Budget</label>
                  <input type="number" min="0" step="0.01" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nurture Cadence (Days)</label>
                  <input type="number" min="1" max="30" value={formData.nurtureCadenceDays} onChange={(e) => setFormData({ ...formData, nurtureCadenceDays: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Nurture Touches</label>
                  <input type="number" min="1" max="20" value={formData.nurtureTouchCount} onChange={(e) => setFormData({ ...formData, nurtureTouchCount: e.target.value })} className={inputClass} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoEnrollNewLeads}
                      onChange={(e) => setFormData({ ...formData, autoEnrollNewLeads: e.target.checked })}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                    />
                    <span className="text-[0.8125rem] text-gray-700 dark:text-gray-300">Auto-enroll new leads</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Expected Revenue</label>
                  <input type="number" min="0" step="0.01" value={formData.expectedRevenue} onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Actual Revenue</label>
                  <input type="number" min="0" step="0.01" value={formData.actualRevenue} onChange={(e) => setFormData({ ...formData, actualRevenue: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Leads Generated</label>
                  <input type="number" min="0" value={formData.leadsGenerated} onChange={(e) => setFormData({ ...formData, leadsGenerated: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Opportunities Created</label>
                  <input type="number" min="0" value={formData.opportunitiesCreated} onChange={(e) => setFormData({ ...formData, opportunitiesCreated: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Conversions</label>
                  <input type="number" min="0" value={formData.conversions} onChange={(e) => setFormData({ ...formData, conversions: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
