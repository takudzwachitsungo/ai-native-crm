import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { dealsApi } from "../lib/api";
import type { Deal } from "../lib/types";
import { useToast } from "../components/Toast";
import { InsightBadge } from "../components/InsightBadge";
import { exportToCSV } from "../lib/helpers";

interface PipelineDeal {
  id: string;
  name: string;
  companyName?: string;
  territory?: string;
  ownerTerritory?: string;
  territoryMismatch?: boolean;
  value: number;
  contactName?: string;
  probability: number;
  stage: Deal["stage"];
  expectedCloseDate?: string;
  nextStep?: string;
  nextStepDueDate?: string;
  competitorName?: string;
  riskLevel?: Deal["riskLevel"];
}

interface Stage {
  id: Deal["stage"];
  name: string;
  deals: PipelineDeal[];
  totalValue: number;
}

const stageDefinitions: { id: Deal["stage"]; name: string }[] = [
  { id: "PROSPECTING", name: "Prospecting" },
  { id: "QUALIFICATION", name: "Qualification" },
  { id: "PROPOSAL", name: "Proposal" },
  { id: "NEGOTIATION", name: "Negotiation" },
  { id: "CLOSED_WON", name: "Closed Won" },
  { id: "CLOSED_LOST", name: "Closed Lost" },
];

function getDealBadges(deal: PipelineDeal): Array<{ type: "hot" | "stuck" | "closing_soon" | "at_risk"; label?: string }> {
  const badges: Array<{ type: "hot" | "stuck" | "closing_soon" | "at_risk"; label?: string }> = [];

  if (deal.nextStepDueDate) {
    const dueDate = new Date(deal.nextStepDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue >= 0 && daysUntilDue <= 7) {
      badges.push({ type: "closing_soon", label: `${daysUntilDue}d next` });
    } else if (daysUntilDue < 0 && deal.stage !== "CLOSED_WON" && deal.stage !== "CLOSED_LOST") {
      badges.push({ type: "stuck", label: "late" });
    }
  }

  if (deal.value > 50000 && deal.probability > 70) {
    badges.push({ type: "hot" });
  }

  if ((deal.stage === "PROPOSAL" || deal.stage === "NEGOTIATION") && deal.riskLevel === "HIGH") {
    badges.push({ type: "at_risk" });
  }

  return badges;
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: dealsData } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsApi.getAll({ page: 0, size: 1000 }),
    refetchInterval: 30000,
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Deal["stage"] }) => dealsApi.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
      showToast("Deal stage updated", "success");
    },
    onError: () => {
      showToast("Failed to update deal stage", "error");
    },
  });

  useEffect(() => {
    if (dealsData?.content) {
      const deals = dealsData.content;
      const newStages: Stage[] = stageDefinitions.map((stageDef) => {
        const stageDeals = deals
          .filter((deal) => deal.stage === stageDef.id)
          .map((deal) => ({
            id: deal.id!,
            name: deal.name,
            companyName: deal.companyName,
            territory: deal.territory,
            ownerTerritory: deal.ownerTerritory,
            territoryMismatch: deal.territoryMismatch,
            value: deal.value,
            contactName: deal.contactName,
            probability: deal.probability || 0,
            stage: deal.stage,
            expectedCloseDate: deal.expectedCloseDate,
            nextStep: deal.nextStep,
            nextStepDueDate: deal.nextStepDueDate,
            competitorName: deal.competitorName,
            riskLevel: deal.riskLevel,
          }));

        return {
          id: stageDef.id,
          name: stageDef.name,
          deals: stageDeals,
          totalValue: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
        };
      });
      setStages(newStages);
    }
  }, [dealsData]);

  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; sourceStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const totalPipelineValue = useMemo(() => stages.reduce((sum, stage) => sum + stage.totalValue, 0), [stages]);
  const totalDeals = useMemo(() => stages.reduce((sum, stage) => sum + stage.deals.length, 0), [stages]);
  const riskyDeals = useMemo(() => stages.flatMap((stage) => stage.deals).filter((deal) => deal.riskLevel === "HIGH").length, [stages]);
  const averageDealSize = useMemo(() => (totalDeals > 0 ? Math.round(totalPipelineValue / totalDeals) : 0), [totalDeals, totalPipelineValue]);
  const filteredStages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return stages;
    }

    return stages.map((stage) => {
      const deals = stage.deals.filter((deal) => {
        return [deal.name, deal.companyName, deal.contactName, deal.territory, deal.nextStep, deal.competitorName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      });

      return {
        ...stage,
        deals,
        totalValue: deals.reduce((sum, deal) => sum + deal.value, 0),
      };
    });
  }, [searchQuery, stages]);

  const handleDragStart = (dealId: string, stageId: string) => {
    setDraggedDeal({ dealId, sourceStageId: stageId });
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.sourceStageId === targetStageId) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }

    const sourceStage = stages.find((stage) => stage.id === draggedDeal.sourceStageId);
    const deal = sourceStage?.deals.find((item) => item.id === draggedDeal.dealId);
    if (!deal) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }

    updateStageMutation.mutate({ id: draggedDeal.dealId, stage: targetStageId as Deal["stage"] });

    setStages((previous) => {
      const next = [...previous];
      const sourceStageIndex = next.findIndex((stage) => stage.id === draggedDeal.sourceStageId);
      const targetStageIndex = next.findIndex((stage) => stage.id === targetStageId);

      next[sourceStageIndex].deals = next[sourceStageIndex].deals.filter((item) => item.id !== draggedDeal.dealId);
      next[sourceStageIndex].totalValue -= deal.value;

      next[targetStageIndex].deals.push({ ...deal, stage: targetStageId as Deal["stage"] });
      next[targetStageIndex].totalValue += deal.value;

      return next;
    });

    setDraggedDeal(null);
    setDragOverStage(null);
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[26px] leading-none font-semibold text-foreground">Pipeline</h1>
              <p className="text-[13px] text-muted-foreground mt-1">Drag deals between stages and keep the next step moving.</p>
            </div>
          </div>

          <div className="mt-4 mb-3 flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
            <div className="w-full overflow-hidden rounded-[1.05rem] border border-border/60 bg-background/55 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
                <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                  <div className="relative flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <Icons.CircleDollarSign size={14} className="text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Total Pipeline Value</p>
                      <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">${totalPipelineValue.toLocaleString()}</p>
                      <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Open board value</p>
                    </div>
                  </div>
                </div>
                <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                  <div className="relative flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                      <Icons.Handshake size={14} className="text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Total Deals</p>
                      <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{totalDeals}</p>
                      <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Across all stages</p>
                    </div>
                  </div>
                </div>
                <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                  <div className="relative flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/60">
                      <Icons.BarChart3 size={14} className="text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Avg Deal Size</p>
                      <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">${averageDealSize.toLocaleString()}</p>
                      <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Mean active opportunity</p>
                    </div>
                  </div>
                </div>
                <div className="group relative min-w-0 px-2.5 py-2">
                  <div className="relative flex items-start gap-2.5">
                    <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                      <Icons.AlertCircle size={14} className="text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">High Risk Deals</p>
                      <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{riskyDeals}</p>
                      <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Priority watchlist</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-2.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div className="relative min-w-0 flex-1 lg:max-w-[720px]">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Search pipeline deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8.5 pr-3.5 text-[13px] border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              <button
                onClick={() => {
                  exportToCSV(
                    stages.flatMap((stage) => stage.deals),
                    [
                      { header: "Name", accessor: "name" },
                      { header: "Company", accessor: "companyName" },
                      { header: "Contact", accessor: "contactName" },
                      { header: "Value", accessor: "value" },
                      { header: "Stage", accessor: "stage" },
                      { header: "Territory", accessor: "territory" },
                      { header: "Owner Territory", accessor: "ownerTerritory" },
                      { header: "Probability", accessor: "probability" },
                      { header: "Next Step", accessor: "nextStep" },
                      { header: "Risk", accessor: "riskLevel" },
                    ],
                    "pipeline"
                  );
                  showToast(`Exported ${stages.flatMap((stage) => stage.deals).length} pipeline deals to CSV`, "success");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)] hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={13} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3.5">
        <div className="flex min-w-max gap-3">
          {filteredStages.map((stage) => (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                "w-[18rem] bg-card border border-border rounded-2xl flex-shrink-0 transition-all",
                dragOverStage === stage.id && "ring-2 ring-primary/50 bg-primary/5"
              )}
            >
              <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                    {stage.deals.length}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground">${stage.totalValue.toLocaleString()}</p>
              </div>

              <div className="min-h-[360px] max-h-[540px] space-y-2 overflow-y-auto p-2.5">
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                    className={cn(
                      "p-2.5 bg-background border border-border rounded-xl hover:shadow-md transition-all cursor-move",
                      draggedDeal?.dealId === deal.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-medium text-foreground text-sm flex-1">{deal.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {getDealBadges(deal).map((badge, idx) => (
                          <InsightBadge key={idx} type={badge.type} label={badge.label} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.Building2 size={12} />
                        <span>{deal.companyName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.Target size={12} />
                        <span>{deal.territory || "No territory"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.Contact size={12} />
                        <span>{deal.contactName || "No contact"}</span>
                      </div>
                      {deal.territoryMismatch && (
                        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                          Owner territory {deal.ownerTerritory || "unknown"} does not match this deal.
                        </div>
                      )}
                      {deal.nextStep && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <Icons.CheckSquare size={12} />
                          <span>{deal.nextStep}</span>
                        </div>
                      )}
                      {deal.competitorName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Icons.Target size={12} />
                          <span>Vs {deal.competitorName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border">
                        <span className="font-semibold text-foreground">${deal.value.toLocaleString()}</span>
                        <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-medium">
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
