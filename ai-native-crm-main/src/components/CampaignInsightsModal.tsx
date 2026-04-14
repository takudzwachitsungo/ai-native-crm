import { Modal } from "./Modal";
import type { CampaignInsights } from "../lib/types";

interface CampaignInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights?: CampaignInsights | null;
  loading?: boolean;
}

const money = (value?: number | null) => {
  if (value == null) return "$0";
  return `$${value.toLocaleString()}`;
};

export function CampaignInsightsModal({
  isOpen,
  onClose,
  insights,
  loading = false,
}: CampaignInsightsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Insights"
      size="xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
        >
          Close
        </button>
      }
    >
      {loading || !insights ? (
        <div className="p-6 text-sm text-muted-foreground">Loading campaign insights...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attributed Leads</p>
              <p className="mt-2 text-2xl font-semibold">{insights.attributedLeadCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Leads</p>
              <p className="mt-2 text-2xl font-semibold">{insights.openAttributedLeadCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline</p>
              <p className="mt-2 text-2xl font-semibold">{money(insights.attributedPipelineValue)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Score</p>
              <p className="mt-2 text-2xl font-semibold">{insights.averageLeadScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h4 className="font-semibold">Segment & Journey</h4>
              <p className="text-sm text-muted-foreground">Segment: {insights.segmentName || "General audience"}</p>
              <p className="text-sm text-muted-foreground">Segment Type: {insights.segmentType?.replaceAll("_", " ") || "Not set"}</p>
              <p className="text-sm text-muted-foreground">Journey Stage: {insights.journeyStage?.replaceAll("_", " ") || "Not set"}</p>
              <p className="text-sm text-muted-foreground">
                Nurture Plan: {insights.autoEnrollNewLeads ? "Auto-enroll" : "Manual"}
                {insights.nurtureTouchCount ? ` · ${insights.nurtureTouchCount} touches` : ""}
                {insights.nurtureCadenceDays ? ` every ${insights.nurtureCadenceDays} day(s)` : ""}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h4 className="font-semibold">Momentum</h4>
              <p className="text-sm text-muted-foreground">Fast-tracked Leads: {insights.fastTrackedLeadCount}</p>
              <p className="text-sm text-muted-foreground">Top Territories: {Object.keys(insights.leadsByTerritory).join(", ") || "None yet"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="font-semibold mb-3">Status Mix</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {Object.entries(insights.leadsByStatus).length === 0 ? (
                  <p>No attributed leads yet.</p>
                ) : (
                  Object.entries(insights.leadsByStatus).map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span>{label.replaceAll("_", " ")}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="font-semibold mb-3">Source Mix</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {Object.entries(insights.leadsBySource).length === 0 ? (
                  <p>No sources yet.</p>
                ) : (
                  Object.entries(insights.leadsBySource).map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span>{label.replaceAll("_", " ")}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="font-semibold mb-3">Territory Mix</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {Object.entries(insights.leadsByTerritory).length === 0 ? (
                  <p>No territory spread yet.</p>
                ) : (
                  Object.entries(insights.leadsByTerritory).map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span>{label}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="font-semibold mb-3">Recommended Actions</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {insights.recommendedActions.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
