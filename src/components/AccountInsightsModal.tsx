import { useQuery } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { companiesApi } from "../lib/api";
import type { Company, CompanyInsights } from "../lib/types";
import { Icons } from "./icons";
import { cn } from "../lib/utils";

interface AccountInsightsModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

function healthClasses(status?: CompanyInsights["healthStatus"]) {
  switch (status) {
    case "HEALTHY":
      return "bg-green-50 text-green-700 border-green-200";
    case "WATCH":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "AT_RISK":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatCurrency(value?: number) {
  if (value == null) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRole(role: string) {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AccountInsightsModal({ company, isOpen, onClose }: AccountInsightsModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["company-insights", company?.id],
    queryFn: () => companiesApi.getInsights(company!.id!),
    enabled: isOpen && Boolean(company?.id),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? `${company.name} Intelligence` : "Account Intelligence"}
      size="xl"
    >
      {!company ? null : isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading account intelligence...</div>
      ) : !data ? (
        <div className="py-10 text-center text-muted-foreground">No account intelligence available.</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-foreground">{data.companyName}</h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                    healthClasses(data.healthStatus)
                  )}
                >
                  {data.healthStatus.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.parentCompanyName ? `Child of ${data.parentCompanyName}` : "Top-level account"}
                {data.childCompanyCount > 0 ? ` • ${data.childCompanyCount} subsidiaries` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Health Score</p>
                <p className="text-2xl font-semibold text-foreground">{data.healthScore}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Coverage</p>
                <p className="text-2xl font-semibold text-foreground">{data.stakeholderCoveragePercent}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Account Territory</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.territory || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Owner Territory</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.ownerTerritory || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Territory Coverage</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.territoryMismatch ? "Misaligned" : "Aligned"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{data.territoryMismatchDeals} active deal mismatches</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(data.pipelineValue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.activeDeals} active deals</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Weighted Pipeline</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(data.weightedPipelineValue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.highRiskDeals} high-risk deals</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Stakeholders</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.totalContacts}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.primaryStakeholders} primary • {data.decisionMakers} decision makers
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Follow-Up Risk</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.overdueTasks + data.overdueNextSteps}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.overdueTasks} overdue tasks • {data.overdueNextSteps} overdue next steps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <h4 className="font-medium text-foreground">Opportunity Watchlist</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Top active deals on this account, sorted by value.</p>
                </div>
                <div className="divide-y divide-border">
                  {data.opportunities.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No active opportunities on this account yet.</div>
                  ) : (
                    data.opportunities.map((opportunity) => (
                      <div key={opportunity.dealId} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{opportunity.dealName}</p>
                              {opportunity.riskLevel && (
                                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                  {opportunity.riskLevel}
                                </span>
                              )}
                              {opportunity.stalled && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                                  Stalled
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {opportunity.stage.replaceAll("_", " ")} • {opportunity.ownerName || "Unassigned owner"}
                            </p>
                            <p className="mt-2 text-sm text-foreground">
                              {opportunity.nextStep || "No next step captured"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {opportunity.nextStepDueDate
                                ? `Due ${new Date(opportunity.nextStepDueDate).toLocaleDateString()}`
                                : "No due date"}
                              {opportunity.overdueNextStep ? " • Overdue" : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{formatCurrency(opportunity.value)}</p>
                            <p className="text-xs text-muted-foreground">
                              Weighted {formatCurrency(opportunity.weightedValue)}
                            </p>
                            <p className="text-xs text-muted-foreground">{opportunity.probability ?? 0}% probability</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Icons.Users size={16} className="text-primary" />
                  <h4 className="font-medium text-foreground">Relationship Coverage</h4>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">High-influence contacts</span>
                    <span className="font-medium text-foreground">{data.highInfluenceContacts}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Missing stakeholder roles</span>
                    <span className="font-medium text-foreground">{data.missingStakeholderRoles.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Territory mismatch deals</span>
                    <span className="font-medium text-foreground">{data.territoryMismatchDeals}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.missingStakeholderRoles.length === 0 ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
                        Buying committee coverage looks complete
                      </span>
                    ) : (
                      data.missingStakeholderRoles.map((role) => (
                        <span key={role} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {formatRole(role)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Icons.CheckSquare size={16} className="text-primary" />
                  <h4 className="font-medium text-foreground">Recommended Actions</h4>
                </div>
                <ul className="mt-4 space-y-2">
                  {data.recommendedActions.map((action) => (
                    <li key={action} className="flex gap-2 text-sm text-foreground">
                      <Icons.ArrowRight size={14} className="mt-0.5 shrink-0 text-primary" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Icons.Activity size={16} className="text-primary" />
                  <h4 className="font-medium text-foreground">Risk Summary</h4>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Stalled Deals</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{data.stalledDeals}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Open Tasks</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{data.openTasks}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Overdue Tasks</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{data.overdueTasks}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Overdue Next Steps</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{data.overdueNextSteps}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
