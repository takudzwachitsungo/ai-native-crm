import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { dealsApi } from "../lib/api";
import type { Deal } from "../lib/types";
import { useToast } from "../components/Toast";
import { InsightBadge } from "../components/InsightBadge";

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
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
              <p className="text-sm text-muted-foreground mt-1">Drag deals between stages and keep the next step moving.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2">
                <Icons.Download size={16} />
                Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 py-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Pipeline Value</p>
              <p className="text-2xl font-semibold text-foreground">${totalPipelineValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Deals</p>
              <p className="text-2xl font-semibold text-foreground">{totalDeals}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Deal Size</p>
              <p className="text-2xl font-semibold text-foreground">
                ${totalDeals > 0 ? Math.round(totalPipelineValue / totalDeals).toLocaleString() : "0"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">High Risk Deals</p>
              <p className="text-2xl font-semibold text-foreground">{riskyDeals}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                "w-80 bg-card border border-border rounded-lg flex-shrink-0 transition-all",
                dragOverStage === stage.id && "ring-2 ring-primary/50 bg-primary/5"
              )}
            >
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{stage.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                    {stage.deals.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">${stage.totalValue.toLocaleString()}</p>
              </div>

              <div className="p-3 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                    className={cn(
                      "p-3 bg-background border border-border rounded-lg hover:shadow-md transition-all cursor-move",
                      draggedDeal?.dealId === deal.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
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
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="font-semibold text-foreground">${deal.value.toLocaleString()}</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
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
    </PageLayout>
  );
}
