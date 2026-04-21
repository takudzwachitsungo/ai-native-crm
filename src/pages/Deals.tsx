import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { DealForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { dealsApi } from "../lib/api";
import type { Deal, DealAttentionItem } from "../lib/types";
import { useInsights } from "../hooks/useInsights";
import { InsightBadge } from "../components/InsightBadge";
import { exportToCSV } from "../lib/helpers";
import { useAuth } from "../contexts/AuthContext";

const stageTabs = [
  { value: "all", label: "All Deals" },
  { value: "PROSPECTING", label: "Prospecting" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "CLOSED_WON", label: "Closed Won" },
  { value: "CLOSED_LOST", label: "Closed Lost" },
] as const;

function getStageColor(stage: Deal["stage"]) {
  switch (stage) {
    case "PROSPECTING": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "QUALIFICATION": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "PROPOSAL": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "NEGOTIATION": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "CLOSED_WON": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "CLOSED_LOST": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

function getRiskBadgeColor(riskLevel?: Deal["riskLevel"]) {
  switch (riskLevel) {
    case "HIGH": return "bg-red-100 text-red-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    case "LOW": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function getApprovalBadgeColor(deal: Deal) {
  if (!deal.approvalRequired) {
    return "bg-gray-100 text-gray-700";
  }
  switch (deal.approvalStatus) {
    case "PENDING": return "bg-amber-100 text-amber-700";
    case "APPROVED": return "bg-green-100 text-green-700";
    case "REJECTED": return "bg-red-100 text-red-700";
    default: return "bg-blue-100 text-blue-700";
  }
}

function getApprovalLabel(deal: Deal) {
  if (!deal.approvalRequired) {
    return "Not required";
  }
  switch (deal.approvalStatus) {
    case "PENDING": return "Pending approval";
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return "Approval required";
  }
}

function getDealBadges(deal: Deal): Array<{ type: 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> {
  const badges: Array<{ type: 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> = [];
  if (deal.nextStepDueDate) {
    const dueDate = new Date(deal.nextStepDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue >= 0 && daysUntilDue <= 7) {
      badges.push({ type: "closing_soon", label: `${daysUntilDue}d next` });
    }
    if (daysUntilDue < 0 && deal.stage !== "CLOSED_WON" && deal.stage !== "CLOSED_LOST") {
      badges.push({ type: "stuck", label: "next step late" });
    }
  }
  if ((deal.value || 0) > 50000 && (deal.probability || 0) > 70) {
    badges.push({ type: "hot" });
  }
  if ((deal.stage === "PROPOSAL" || deal.stage === "NEGOTIATION") && deal.riskLevel === "HIGH") {
    badges.push({ type: "at_risk" });
  }
  return badges;
}

function mapDealFormData(data: any): Partial<Deal> {
  return {
    name: data.name,
    value: data.value,
    companyId: data.companyId || undefined,
    contactId: data.contactId || undefined,
    stage: data.stage,
    probability: data.probability ?? undefined,
    expectedCloseDate: data.expectedCloseDate || undefined,
    dealType: data.dealType || undefined,
    leadSource: data.leadSource || undefined,
    territory: data.territory || undefined,
    competitorName: data.competitorName || undefined,
    nextStep: data.nextStep || undefined,
    nextStepDueDate: data.nextStepDueDate || undefined,
    riskLevel: data.riskLevel || undefined,
    buyingCommitteeSummary: data.buyingCommitteeSummary || undefined,
    description: data.description || undefined,
    notes: data.notes || undefined,
    winReason: data.winReason || undefined,
    lossReason: data.lossReason || undefined,
    closeNotes: data.closeNotes || undefined,
  };
}

function formatAttentionTiming(item: DealAttentionItem) {
  if (item.overdueNextStep && typeof item.daysUntilNextStepDue === "number") {
    return `${Math.abs(item.daysUntilNextStepDue)}d overdue`;
  }
  if (typeof item.daysInStage === "number") {
    return `${item.daysInStage}d in stage`;
  }
  return "Needs review";
}

export default function DealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Deal | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canApproveDeals = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canRequestApproval = canApproveDeals || user?.role === "SALES_REP";

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedItem(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useInsights("deals");

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ["deals", searchQuery, currentPage, pageSize],
    queryFn: () => dealsApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
    refetchInterval: 60000,
  });

  const { data: dealStats } = useQuery({
    queryKey: ["deal-stats"],
    queryFn: () => dealsApi.getStatistics(),
    staleTime: 60000,
  });

  const { data: attentionSummary } = useQuery({
    queryKey: ["deal-attention-summary"],
    queryFn: () => dealsApi.getAttentionSummary(),
    staleTime: 30000,
  });

  const { data: territoryGovernanceQueue } = useQuery({
    queryKey: ["deal-territory-governance-queue"],
    queryFn: () => dealsApi.getTerritoryGovernanceQueue(),
    staleTime: 30000,
    enabled: canApproveDeals,
  });

  const deals = dealsData?.content || [];
  const totalElements = dealsData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Deal>) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      setIsFormOpen(false);
      showToast("Deal created successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to create deal", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deal> }) => dealsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      setIsFormOpen(false);
      showToast("Deal updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to update deal", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      setIsDeleteModalOpen(false);
      showToast("Deal deleted successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to delete deal", "error");
    },
  });

  const stalledAutomationMutation = useMutation({
    mutationFn: () => dealsApi.runStalledReviewAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["deal-attention-summary"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      showToast(
        result.rescueTasksCreated > 0
          ? `Created ${result.rescueTasksCreated} rescue task${result.rescueTasksCreated === 1 ? "" : "s"}`
          : "No new rescue tasks were needed",
        "success"
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to run stalled deal automation", "error");
    },
  });

  const territoryReassignmentMutation = useMutation({
    mutationFn: (dealIds?: string[]) => dealsApi.reassignTerritoryMismatches(dealIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["deal-attention-summary"] });
      queryClient.invalidateQueries({ queryKey: ["deal-territory-governance-queue"] });
      showToast(
        result.reassignedDeals > 0
          ? `Reassigned ${result.reassignedDeals} territory-mismatched deal${result.reassignedDeals === 1 ? "" : "s"}`
          : "No reassignment changes were needed",
        "success"
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to reassign territory mismatches", "error");
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: (id: string) => dealsApi.requestApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      showToast("Approval requested", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to request approval", "error");
    },
  });

  const approveDealMutation = useMutation({
    mutationFn: (id: string) => dealsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      showToast("Deal approved", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to approve deal", "error");
    },
  });

  const rejectDealMutation = useMutation({
    mutationFn: (id: string) => dealsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      showToast("Approval request rejected", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to reject approval request", "error");
    },
  });

  const filteredDeals = deals.filter((deal) => stageFilter === "all" || deal.stage === stageFilter);

  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, stageFilter]);

  const stageCounts = {
    all: totalElements,
    PROSPECTING: deals.filter((deal) => deal.stage === "PROSPECTING").length,
    QUALIFICATION: deals.filter((deal) => deal.stage === "QUALIFICATION").length,
    PROPOSAL: deals.filter((deal) => deal.stage === "PROPOSAL").length,
    NEGOTIATION: deals.filter((deal) => deal.stage === "NEGOTIATION").length,
    CLOSED_WON: deals.filter((deal) => deal.stage === "CLOSED_WON").length,
    CLOSED_LOST: deals.filter((deal) => deal.stage === "CLOSED_LOST").length,
  };

  const renderApprovalActions = (deal: Deal) => (
    <>
      {canRequestApproval && deal.approvalRequired && deal.approvalStatus !== "PENDING" && deal.approvalStatus !== "APPROVED" && deal.id && (
        <button
          onClick={() => requestApprovalMutation.mutate(deal.id!)}
          className="px-2 py-1 text-xs border border-amber-200 text-amber-700 rounded hover:bg-amber-50 transition-colors"
        >
          Request Approval
        </button>
      )}
      {canApproveDeals && deal.approvalStatus === "PENDING" && deal.id && (
        <>
          <button
            onClick={() => approveDealMutation.mutate(deal.id!)}
            className="px-2 py-1 text-xs border border-green-200 text-green-700 rounded hover:bg-green-50 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => rejectDealMutation.mutate(deal.id!)}
            className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        </>
      )}
    </>
  );

  return (
    <PageLayout>
      <div className="border-b border-border bg-card">
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[26px] leading-none font-semibold text-foreground">Deals</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => stalledAutomationMutation.mutate()}
                disabled={stalledAutomationMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icons.RefreshCw size={14} className={cn(stalledAutomationMutation.isPending && "animate-spin")} />
                Run Rescue Automation
              </button>
              <button
                onClick={() => {
                  exportToCSV(
                    filteredDeals,
                    [
                      { header: "Name", accessor: "name" },
                      { header: "Company", accessor: "companyName" },
                      { header: "Contact", accessor: "contactName" },
                      { header: "Amount", accessor: (deal: Deal) => deal.value || "" },
                      { header: "Stage", accessor: "stage" },
                      { header: "Territory", accessor: (deal: Deal) => deal.territory || "" },
                      { header: "Owner Territory", accessor: (deal: Deal) => deal.ownerTerritory || "" },
                      { header: "Probability", accessor: "probability" },
                      { header: "Competitor", accessor: "competitorName" },
                      { header: "Risk", accessor: "riskLevel" },
                      { header: "Next Step", accessor: "nextStep" },
                      { header: "Expected Close", accessor: (deal: Deal) => deal.expectedCloseDate || "" },
                    ],
                    "deals"
                  );
                  showToast(`Exported ${filteredDeals.length} deals to CSV`, "success");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={14} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icons.Plus size={14} />
                Create Deal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2.5 mb-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
              <p className="text-lg leading-none font-semibold text-foreground mt-1">
                ${Number(dealStats?.totalValue ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Weighted Value</p>
              <p className="text-lg leading-none font-semibold text-foreground mt-1">
                ${Number(dealStats?.weightedTotalValue ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg leading-none font-semibold text-foreground mt-1">{Math.round(dealStats?.winRate ?? 0)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Needs Attention</p>
              <p className="text-lg leading-none font-semibold text-foreground mt-1">{attentionSummary?.dealsNeedingAttention ?? dealStats?.dealsNeedingAttention ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Pending Approval</p>
              <p className="text-lg leading-none font-semibold text-foreground mt-1">{dealStats?.pendingApprovalCount ?? 0}</p>
            </div>
          </div>

          {(attentionSummary?.deals?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 mb-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Deals Needing Attention</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {attentionSummary?.stalledDealCount ?? 0} stalled, {attentionSummary?.overdueNextStepCount ?? 0} overdue next steps, {attentionSummary?.highRiskDealCount ?? 0} high risk
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {attentionSummary?.dealsNeedingAttention ?? 0} total flagged
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {attentionSummary?.deals.map((item) => (
                  <div key={item.dealId} className="rounded-lg border border-amber-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.dealName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.companyName || "No account"} • {item.stage.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {item.stalled && <InsightBadge type="stuck" label="stalled" />}
                        {item.overdueNextStep && <InsightBadge type="overdue" label="next step overdue" />}
                        {item.riskLevel === "HIGH" && <InsightBadge type="at_risk" label="high risk" />}
                        {item.territoryMismatch && <InsightBadge type="stuck" label="territory mismatch" />}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-foreground">{item.nextStep || "No next step captured"}</div>
                    {item.territory && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Territory {item.territory}{item.ownerTerritory ? ` • owner ${item.ownerTerritory}` : ""}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatAttentionTiming(item)}</span>
                      <span>{item.rescueTaskOpen ? "Rescue task open" : item.hasOpenTask ? "Open task exists" : "No open task"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canApproveDeals && (territoryGovernanceQueue?.deals?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/70 p-4 mb-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Territory Governance Queue</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {territoryGovernanceQueue?.mismatchCount ?? 0} active deal owner mismatch{territoryGovernanceQueue?.mismatchCount === 1 ? "" : "es"}, {territoryGovernanceQueue?.highPriorityCount ?? 0} high priority
                  </p>
                </div>
                <button
                  onClick={() => territoryReassignmentMutation.mutate(territoryGovernanceQueue?.deals.map((item) => item.dealId))}
                  disabled={territoryReassignmentMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icons.RefreshCw size={16} className={cn(territoryReassignmentMutation.isPending && "animate-spin")} />
                  Auto-Reassign Queue
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {territoryGovernanceQueue?.deals.slice(0, 6).map((item) => (
                  <div key={item.dealId} className="rounded-lg border border-red-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.dealName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.companyName || "No account"} • {item.stage.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {item.stalled && <InsightBadge type="stuck" label="stalled" />}
                        {item.overdueNextStep && <InsightBadge type="overdue" label="next step overdue" />}
                        {item.riskLevel === "HIGH" && <InsightBadge type="at_risk" label="high risk" />}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-foreground">
                      {item.currentOwnerName || "No current owner"} ({item.currentOwnerTerritory || "No territory"}) →{" "}
                      {item.suggestedOwnerName || "No suggested owner"} ({item.suggestedOwnerTerritory || "No territory"})
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Deal territory {item.territory || "Unassigned"} • Value ${(item.value || 0).toLocaleString()}
                    </div>
                    {item.nextStep && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Next step: {item.nextStep}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => territoryReassignmentMutation.mutate([item.dealId])}
                        disabled={territoryReassignmentMutation.isPending || !item.suggestedOwnerId}
                        className="px-3 py-1.5 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reassign Deal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  viewMode === "table" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Table view"
              >
                <Icons.List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Grid view"
              >
                <Icons.LayoutDashboard size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border -mb-px overflow-x-auto">
            {stageTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStageFilter(tab.value)}
                className={cn(
                  "px-3 py-2 text-xs font-medium transition-colors relative whitespace-nowrap",
                  stageFilter === tab.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-secondary">
                  {tab.value === "all" ? stageCounts.all : stageCounts[tab.value as keyof typeof stageCounts]}
                </span>
                {stageFilter === tab.value && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Deal Name</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Risk</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Territory</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Approval</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next Step</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="border-b border-border/60 text-left px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredDeals.map((deal) => (
                <tr
                  key={deal.id}
                  className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{deal.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {getDealBadges(deal).map((badge, idx) => (
                        <InsightBadge key={idx} type={badge.type} label={badge.label} />
                      ))}
                    </div>
                    {deal.competitorName && <div className="text-xs text-muted-foreground mt-1">Competitor: {deal.competitorName}</div>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-foreground">{deal.companyName || "N/A"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-foreground">
                    <div>${(deal.value || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Weighted ${(deal.weightedValue || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", getStageColor(deal.stage))}>
                      {deal.stage.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getRiskBadgeColor(deal.riskLevel))}>
                      {deal.riskLevel || "AUTO"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-muted-foreground">
                    <div>{deal.territory || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">{deal.ownerTerritory || "No owner territory"}</div>
                    {deal.territoryMismatch && (
                      <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        Needs reassignment
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-muted-foreground">
                    <div>
                      <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getApprovalBadgeColor(deal))}>
                        {getApprovalLabel(deal)}
                      </span>
                    </div>
                    {deal.approvalRequestedByName && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Requested by {deal.approvalRequestedByName}
                      </div>
                    )}
                    {deal.approvedByName && (
                      <div className="text-xs text-green-700 mt-1">Approved by {deal.approvedByName}</div>
                    )}
                    {deal.rejectedByName && (
                      <div className="text-xs text-red-700 mt-1">Rejected by {deal.rejectedByName}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-muted-foreground">
                    <div>{deal.nextStep || "No next step set"}</div>
                    <div className="text-xs text-muted-foreground">{deal.nextStepDueDate || deal.expectedCloseDate || "No due date"}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                    <div>{deal.contactName || "N/A"}</div>
                    {(deal.stage === "CLOSED_WON" && deal.winReason) && <div className="text-xs text-green-700">Won: {deal.winReason}</div>}
                    {(deal.stage === "CLOSED_LOST" && deal.lossReason) && <div className="text-xs text-red-700">Lost: {deal.lossReason}</div>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderApprovalActions(deal)}
                      <button
                        onClick={() => {
                          setSelectedItem(deal);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit deal"
                      >
                        <Icons.Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(deal);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors"
                        aria-label="Delete deal"
                      >
                        <Icons.Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDeals.map((deal) => (
            <div key={deal.id} className="border border-border rounded-lg p-3 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{deal.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{deal.companyName || "N/A"}</p>
                </div>
                <span className={cn("px-2 py-1 text-xs font-medium rounded", getStageColor(deal.stage))}>
                  {deal.stage.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium text-foreground">${(deal.value || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Probability:</span>
                  <span className="font-medium text-foreground">{deal.probability || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk:</span>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getRiskBadgeColor(deal.riskLevel))}>{deal.riskLevel || "AUTO"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Territory:</span>
                  <span className="text-right text-foreground">{deal.territory || "N/A"}</span>
                </div>
                {deal.territoryMismatch && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
                    Owner territory {deal.ownerTerritory || "Unknown"} does not match this deal.
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Approval:</span>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getApprovalBadgeColor(deal))}>
                    {getApprovalLabel(deal)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">Next step</div>
                  <div className="text-sm text-foreground">{deal.nextStep || "No next step set"}</div>
                  <div className="text-xs text-muted-foreground">{deal.nextStepDueDate || "No due date"}</div>
                </div>
                {deal.buyingCommitteeSummary && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">Buying committee</div>
                    <div className="text-sm text-foreground line-clamp-2">{deal.buyingCommitteeSummary}</div>
                  </div>
                )}
                {(deal.approvalRequestedByName || deal.approvedByName || deal.rejectedByName) && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">Governance</div>
                    <div className="text-sm text-foreground">
                      {deal.approvedByName
                        ? `Approved by ${deal.approvedByName}`
                        : deal.rejectedByName
                          ? `Rejected by ${deal.rejectedByName}`
                          : `Requested by ${deal.approvalRequestedByName}`}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex items-center gap-2 flex-wrap">
                  {renderApprovalActions(deal)}
                  <button
                    onClick={() => {
                      setSelectedItem(deal);
                      setIsFormOpen(true);
                    }}
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      )}

      {!isLoading && deals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No deals found</p>
        </div>
      )}

      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-card">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} deals
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i;
            else if (currentPage < 3) pageNum = i;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 5 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "h-8 min-w-8 px-3 text-xs font-medium rounded-full transition-colors",
                  currentPage === pageNum ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
                )}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
      </div>

      <DealForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          const payload = mapDealFormData(data);
          if (selectedItem?.id) {
            updateMutation.mutate({ id: selectedItem.id, data: payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
        initialData={selectedItem || undefined}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={() => {
          if (selectedItem?.id) {
            deleteMutation.mutate(selectedItem.id);
          }
        }}
        title="Delete Deal"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
