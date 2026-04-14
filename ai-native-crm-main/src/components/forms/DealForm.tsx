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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Deal" : "Create New Deal"}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            {initialData ? "Save Changes" : "Create Deal"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Deal Basics</h3>
          {approvalRequired && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This deal will require manager approval before it can be marked closed won.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Deal Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
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
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company *</label>
              <select
                value={formData.companyId}
                onChange={(e) => {
                  const nextCompany = companies.find((company: any) => company.id === e.target.value);
                  setFormData({
                    ...formData,
                    companyId: e.target.value,
                    contactId: "",
                    territory: nextCompany?.territory || nextCompany?.country || "",
                  });
                }}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                required
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
              <label className="block text-sm font-medium mb-1">Primary Contact</label>
              <select
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">Select a contact</option>
                {filteredContacts.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stage *</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
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
            <div>
              <label className="block text-sm font-medium mb-1">Territory</label>
              <input
                type="text"
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Inherited from the account unless overridden"
              />
              {selectedCompany?.territory && (
                <p className="mt-1 text-xs text-muted-foreground">Account territory: {selectedCompany.territory}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deal Type</label>
              <select
                value={formData.dealType}
                onChange={(e) => setFormData({ ...formData, dealType: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="NEW_BUSINESS">New Business</option>
                <option value="EXISTING_BUSINESS">Existing Business</option>
                <option value="RENEWAL">Renewal</option>
                <option value="UPSELL">Upsell</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Collaboration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lead Source</label>
              <select
                value={formData.leadSource}
                onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
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
              <label className="block text-sm font-medium mb-1">Competitor</label>
              <input
                type="text"
                value={formData.competitorName}
                onChange={(e) => setFormData({ ...formData, competitorName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Main competitor in this deal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Step</label>
              <input
                type="text"
                value={formData.nextStep}
                onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="What needs to happen next?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Step Due Date</label>
              <input
                type="date"
                value={formData.nextStepDueDate}
                onChange={(e) => setFormData({ ...formData, nextStepDueDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Risk Level</label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">Auto-assess</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Buying Committee Summary</label>
              <textarea
                value={formData.buyingCommitteeSummary}
                onChange={(e) => setFormData({ ...formData, buyingCommitteeSummary: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={2}
                placeholder="Summarize the stakeholders, their influence, and where they stand."
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Narrative</h3>
          <div className="space-y-4">
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
                placeholder="Internal collaboration notes, blockers, or strategy..."
              />
            </div>
            {(isClosedWon || isClosedLost) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{isClosedWon ? "Win Reason" : "Loss Reason"}{isClosedLost ? " *" : ""}</label>
                  <textarea
                    value={isClosedWon ? formData.winReason : formData.lossReason}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [isClosedWon ? "winReason" : "lossReason"]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                    rows={3}
                    required={isClosedLost}
                    placeholder={isClosedWon ? "Why did we win?" : "Why did we lose?"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Close Notes</label>
                  <textarea
                    value={formData.closeNotes}
                    onChange={(e) => setFormData({ ...formData, closeNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                    rows={3}
                    placeholder="Commercial terms, objections, timeline, and final context..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
