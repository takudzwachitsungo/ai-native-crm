import { useState, useEffect } from "react";
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
  company: string;
  value: number;
  contact: string;
  probability: number;
  stage: Deal['stage'];
  expectedCloseDate?: string;
}

interface Stage {
  id: Deal['stage'];
  name: string;
  deals: PipelineDeal[];
  totalValue: number;
}

const stageDefinitions: { id: Deal['stage']; name: string }[] = [
  { id: 'PROSPECTING', name: 'Prospecting' },
  { id: 'QUALIFICATION', name: 'Qualification' },
  { id: 'PROPOSAL', name: 'Proposal' },
  { id: 'NEGOTIATION', name: 'Negotiation' },
  { id: 'CLOSED_WON', name: 'Closed Won' },
  { id: 'CLOSED_LOST', name: 'Closed Lost' },
];

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all deals with auto-refresh every 30 seconds
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsApi.getAll({ page: 0, size: 1000 }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds for real-time pipeline updates
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Deal['stage'] }) => 
      dealsApi.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      showToast('Deal stage updated', 'success');
    },
    onError: () => {
      showToast('Failed to update deal stage', 'error');
    },
  });

  // Transform deals into pipeline stages
  useEffect(() => {
    if (dealsData?.content) {
      const deals = dealsData.content;
      
      const newStages: Stage[] = stageDefinitions.map(stageDef => {
        const stageDeals = deals
          .filter(deal => deal.stage === stageDef.id)
          .map(deal => ({
            id: deal.id!,
            name: deal.name,
            company: deal.companyId || 'Unknown',
            value: deal.value,
            contact: deal.contactId || '',
            probability: deal.probability || 0,
            stage: deal.stage,
            expectedCloseDate: deal.expectedCloseDate,
          }));
        
        return {
          id: stageDef.id,
          name: stageDef.name,
          deals: stageDeals,
          totalValue: stageDeals.reduce((sum, d) => sum + d.value, 0),
        };
      });
      
      setStages(newStages);
    }
  }, [dealsData]);
  
  // Get insight badges for a deal based on its data
  const getDealBadges = (deal: PipelineDeal): Array<{ type: 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> => {
    const badges: Array<{ type: 'hot' | 'stuck' | 'closing_soon' | 'at_risk'; label?: string }> = [];
    
    // Check if deal is closing soon (within 7 days)
    if (deal.expectedCloseDate) {
      const closeDate = new Date(deal.expectedCloseDate);
      const today = new Date();
      const daysUntilClose = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilClose >= 0 && daysUntilClose <= 7) {
        badges.push({ type: 'closing_soon', label: `${daysUntilClose}d` });
      }
    }
    
    // Check if deal is hot (high value and high probability)
    if (deal.value > 50000 && deal.probability > 70) {
      badges.push({ type: 'hot' });
    }
    
    // Check if deal is stuck (been in negotiation with low probability)
    if (deal.stage === 'NEGOTIATION' && deal.probability < 30) {
      badges.push({ type: 'stuck' });
    }
    
    // Check if deal is at risk (low probability in late stage)
    if (['PROPOSAL', 'NEGOTIATION'].includes(deal.stage) && deal.probability < 40) {
      badges.push({ type: 'at_risk' });
    }
    
    return badges;
  };
  
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; sourceStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const totalPipelineValue = stages.reduce((sum, stage) => sum + stage.totalValue, 0);
  const totalDeals = stages.reduce((sum, stage) => sum + stage.deals.length, 0);

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

    const sourceStage = stages.find((s) => s.id === draggedDeal.sourceStageId);
    const deal = sourceStage?.deals.find((d) => d.id === draggedDeal.dealId);
    
    if (!deal) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }

    // Update the deal stage in the backend
    updateStageMutation.mutate({ 
      id: draggedDeal.dealId, 
      stage: targetStageId as Deal['stage'] 
    });

    // Optimistic UI update
    setStages((prevStages) => {
      const newStages = [...prevStages];
      const sourceStageIndex = newStages.findIndex((s) => s.id === draggedDeal.sourceStageId);
      const targetStageIndex = newStages.findIndex((s) => s.id === targetStageId);

      // Remove from source
      newStages[sourceStageIndex].deals = newStages[sourceStageIndex].deals.filter((d) => d.id !== draggedDeal.dealId);
      newStages[sourceStageIndex].totalValue -= deal.value;

      // Add to target with updated stage
      newStages[targetStageIndex].deals.push({ ...deal, stage: targetStageId as Deal['stage'] });
      newStages[targetStageIndex].totalValue += deal.value;

      return newStages;
    });

    setDraggedDeal(null);
    setDragOverStage(null);
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
              <p className="text-sm text-muted-foreground mt-1">Visual overview of your sales pipeline</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2">
                <Icons.Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Pipeline Stats */}
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
              <p className="text-2xl font-semibold text-foreground">${Math.round(totalPipelineValue / totalDeals).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Active Stages</p>
              <p className="text-2xl font-semibold text-foreground">{stages.filter(s => s.deals.length > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
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
                selectedStage === stage.id && "ring-2 ring-primary",
                dragOverStage === stage.id && "ring-2 ring-primary/50 bg-primary/5"
              )}
            >
              {/* Stage Header */}
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{stage.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                    {stage.deals.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">${stage.totalValue.toLocaleString()}</p>
              </div>

              {/* Stage Deals */}
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
                          <InsightBadge 
                            key={idx}
                            type={badge.type}
                            label={badge.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.Building2 size={12} />
                        <span>{deal.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icons.Contact size={12} />
                        <span>{deal.contact}</span>
                      </div>
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
