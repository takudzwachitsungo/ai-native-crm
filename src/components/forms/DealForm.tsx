import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { companiesApi, contactsApi } from "../../lib/api";

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function DealForm({ isOpen, onClose, onSubmit, initialData }: DealFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    value: initialData?.value ? String(initialData.value) : "",
    companyId: initialData?.companyId || "",
    contactId: initialData?.contactId || "",
    stage: initialData?.stage || "PROSPECTING",
    probability: initialData?.probability ? String(initialData.probability) : "10",
    expectedCloseDate: initialData?.expectedCloseDate || "",
    territory: initialData?.territory || "",
    dealType: initialData?.dealType || "NEW_BUSINESS",
    leadSource: initialData?.leadSource || "",
    competitorName: initialData?.competitorName || "",
    nextStep: initialData?.nextStep || "",
    nextStepDueDate: initialData?.nextStepDueDate || "",
    riskLevel: initialData?.riskLevel || "",
    buyingCommitteeSummary: initialData?.buyingCommitteeSummary || "",
    description: initialData?.description || "",
    notes: initialData?.notes || "",
    winReason: initialData?.winReason || "",
    lossReason: initialData?.lossReason || "",
    closeNotes: initialData?.closeNotes || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        value: initialData.value ? String(initialData.value) : "",
        companyId: initialData.companyId || "",
        contactId: initialData.contactId || "",
        stage: initialData.stage || "PROSPECTING",
        probability: initialData.probability ? String(initialData.probability) : "10",
        expectedCloseDate: initialData.expectedCloseDate || "",
        territory: initialData.territory || "",
        dealType: initialData.dealType || "NEW_BUSINESS",
        leadSource: initialData.leadSource || "",
        competitorName: initialData.competitorName || "",
        nextStep: initialData.nextStep || "",
        nextStepDueDate: initialData.nextStepDueDate || "",
        riskLevel: initialData.riskLevel || "",
        buyingCommitteeSummary: initialData.buyingCommitteeSummary || "",
        description: initialData.description || "",
        notes: initialData.notes || "",
        winReason: initialData.winReason || "",
        lossReason: initialData.lossReason || "",
        closeNotes: initialData.closeNotes || "",
      });
    } else {
      setFormData({
        name: "",
        value: "",
        companyId: "",
        contactId: "",
        stage: "PROSPECTING",
        probability: "10",
        expectedCloseDate: "",
        territory: "",
        dealType: "NEW_BUSINESS",
        leadSource: "",
        competitorName: "",
        nextStep: "",
        nextStepDueDate: "",
        riskLevel: "",
        buyingCommitteeSummary: "",
        description: "",
        notes: "",
        winReason: "",
        lossReason: "",
        closeNotes: "",
      });
    }
  }, [initialData, isOpen]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies", "deal-form-options"],
    queryFn: () => companiesApi.getAll({ page: 0, size: 1000, sort: "name,asc" }),
    enabled: isOpen,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", "deal-form-options"],
    queryFn: () => contactsApi.getAll({ page: 0, size: 1000, sort: "lastName,asc" }),
    enabled: isOpen,
  });

  const companies = companiesData?.content || [];
  const contacts = contactsData?.content || [];
  const selectedCompany = companies.find((company: any) => company.id === formData.companyId);
  const filteredContacts = useMemo(() => {
    if (!formData.companyId) {
      return contacts;
    }
    return contacts.filter((contact: any) => contact.companyId === formData.companyId);
  }, [contacts, formData.companyId]);

  const isClosedWon = formData.stage === "CLOSED_WON";
  const isClosedLost = formData.stage === "CLOSED_LOST";
  const numericValue = formData.value ? Number(formData.value) : 0;
  const approvalRequired = formData.stage !== "CLOSED_LOST" && (
    numericValue >= 100000 || formData.riskLevel === "HIGH"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      name: formData.name,
      value: formData.value ? parseFloat(formData.value) : null,
      companyId: formData.companyId || null,
      contactId: formData.contactId || null,
      stage: formData.stage,
      probability: formData.probability ? parseInt(formData.probability, 10) : null,
      expectedCloseDate: formData.expectedCloseDate || null,
      territory: formData.territory || null,
      dealType: formData.dealType || null,
      leadSource: formData.leadSource || null,
      competitorName: formData.competitorName || null,
      nextStep: formData.nextStep || null,
      nextStepDueDate: formData.nextStepDueDate || null,
      riskLevel: formData.riskLevel || null,
      buyingCommitteeSummary: formData.buyingCommitteeSummary || null,
      description: formData.description || null,
      notes: formData.notes || null,
      winReason: isClosedWon ? formData.winReason || null : null,
      lossReason: isClosedLost ? formData.lossReason || null : null,
      closeNotes: (isClosedWon || isClosedLost) ? formData.closeNotes || null : null,
    });
    onClose();
  };

  const [activeTab, setActiveTab] = useState<'basics' | 'strategy' | 'narrative'>('basics');

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = `${inputClass} bg-white dark:bg-gray-800/50`;
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const tabHeaders: Record<string, string> = {
    basics: initialData ? 'Update deal details below.' : 'Create a new deal — set the account, value, and stage.',
    strategy: 'Define next steps, competition, and risk level.',
    narrative: 'Add context — description, notes, and close details.',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Deal" : "Create New Deal"}
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
            {initialData ? "Save Changes" : "Create Deal"}
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
          {(['basics', 'strategy', 'narrative'] as const).map((tab) => (
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

        {/* Approval banner */}
        {approvalRequired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-[0.8125rem] text-amber-800 dark:text-amber-300">
            This deal will require manager approval before it can be marked closed won.
          </div>
        )}

        {/* Tab Content — fixed height so modal doesn't resize */}
        <div className="min-h-[20rem]">
          {/* Basics Tab */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Deal Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Deal Value ($) <span className="text-red-400">*</span></label>
                  <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={inputClass} required min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Company <span className="text-red-400">*</span></label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => {
                      const nextCompany = companies.find((company: any) => company.id === e.target.value);
                      setFormData({ ...formData, companyId: e.target.value, contactId: "", territory: nextCompany?.territory || nextCompany?.country || "" });
                    }}
                    className={selectClass} required
                  >
                    <option value="">Select a company</option>
                    {companies.map((company: any) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Primary Contact</label>
                  <select value={formData.contactId} onChange={(e) => setFormData({ ...formData, contactId: e.target.value })} className={selectClass}>
                    <option value="">Select a contact</option>
                    {filteredContacts.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Stage <span className="text-red-400">*</span></label>
                  <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className={selectClass}>
                    <option value="PROSPECTING">Prospecting</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="CLOSED_WON">Closed Won</option>
                    <option value="CLOSED_LOST">Closed Lost</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Probability (%)</label>
                  <input type="number" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: e.target.value })} className={inputClass} min="0" max="100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Expected Close Date</label>
                  <input type="date" value={formData.expectedCloseDate} onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Territory</label>
                  <input type="text" value={formData.territory} onChange={(e) => setFormData({ ...formData, territory: e.target.value })} className={inputClass} placeholder="Inherited from the account unless overridden" />
                  {selectedCompany?.territory && (
                    <p className="mt-1 text-[0.7rem] text-gray-400">Account territory: {selectedCompany.territory}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Deal Type</label>
                  <select value={formData.dealType} onChange={(e) => setFormData({ ...formData, dealType: e.target.value })} className={selectClass}>
                    <option value="NEW_BUSINESS">New Business</option>
                    <option value="EXISTING_BUSINESS">Existing Business</option>
                    <option value="RENEWAL">Renewal</option>
                    <option value="UPSELL">Upsell</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Tab */}
          {activeTab === 'strategy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Lead Source</label>
                  <select value={formData.leadSource} onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })} className={selectClass}>
                    <option value="">Select lead source</option>
                    <option value="WEBSITE">Website</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="SOCIAL_MEDIA">Social media</option>
                    <option value="COLD_CALL">Cold call</option>
                    <option value="EVENT">Event</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Competitor</label>
                  <input type="text" value={formData.competitorName} onChange={(e) => setFormData({ ...formData, competitorName: e.target.value })} className={inputClass} placeholder="Main competitor in this deal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Next Step</label>
                  <input type="text" value={formData.nextStep} onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })} className={inputClass} placeholder="What needs to happen next?" />
                </div>
                <div>
                  <label className={labelClass}>Next Step Due Date</label>
                  <input type="date" value={formData.nextStepDueDate} onChange={(e) => setFormData({ ...formData, nextStepDueDate: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Risk Level</label>
                  <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} className={selectClass}>
                    <option value="">Auto-assess</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Buying Committee Summary</label>
                <textarea
                  value={formData.buyingCommitteeSummary}
                  onChange={(e) => setFormData({ ...formData, buyingCommitteeSummary: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                  rows={3}
                  placeholder="Summarize the stakeholders, their influence, and where they stand."
                />
              </div>
            </div>
          )}

          {/* Narrative Tab */}
          {activeTab === 'narrative' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                  rows={3}
                  placeholder="Describe the deal details..."
                />
              </div>
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                  rows={3}
                  placeholder="Internal collaboration notes, blockers, or strategy..."
                />
              </div>
              {(isClosedWon || isClosedLost) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <label className={labelClass}>{isClosedWon ? "Win Reason" : "Loss Reason"}{isClosedLost ? " *" : ""}</label>
                    <textarea
                      value={isClosedWon ? formData.winReason : formData.lossReason}
                      onChange={(e) => setFormData({ ...formData, [isClosedWon ? "winReason" : "lossReason"]: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                      rows={3}
                      required={isClosedLost}
                      placeholder={isClosedWon ? "Why did we win?" : "Why did we lose?"}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Close Notes</label>
                    <textarea
                      value={formData.closeNotes}
                      onChange={(e) => setFormData({ ...formData, closeNotes: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                      rows={3}
                      placeholder="Commercial terms, objections, timeline, and final context..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
