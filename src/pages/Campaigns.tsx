import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { CampaignInsightsModal } from "../components/CampaignInsightsModal";
import { CampaignForm } from "../components/forms";
import { ConfirmModal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { Icons } from "../components/icons";
import { useToast } from "../components/Toast";
import { campaignsApi } from "../lib/api";
import { cn } from "../lib/utils";
import type { Campaign } from "../lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-700 border-slate-200",
  PLANNED: "bg-blue-50 text-blue-700 border-blue-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const money = (value?: number | null) => {
  if (value == null) {
    return "$0";
  }
  return `$${value.toLocaleString()}`;
};

const percent = (value?: number | null) => {
  if (value == null) {
    return "0%";
  }
  return `${value.toFixed(1)}%`;
};

export default function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [insightsCampaign, setInsightsCampaign] = useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedCampaign(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["campaigns", searchQuery, statusFilter, currentPage, pageSize],
    queryFn: () =>
      campaignsApi.getAll({
        page: currentPage,
        size: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as Campaign["status"]) : undefined,
      }),
  });

  const { data: campaignStats } = useQuery({
    queryKey: ["campaign-stats"],
    queryFn: () => campaignsApi.getStatistics(),
    staleTime: 60_000,
  });

  const { data: campaignInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["campaign-insights", insightsCampaign?.id],
    queryFn: () => campaignsApi.getInsights(insightsCampaign!.id!),
    enabled: Boolean(insightsCampaign?.id),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Campaign>) => campaignsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      setIsFormOpen(false);
      showToast("Campaign created successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to create campaign", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Campaign> }) => campaignsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      setIsFormOpen(false);
      setSelectedCampaign(null);
      showToast("Campaign updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to update campaign", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      setIsDeleteOpen(false);
      setSelectedCampaign(null);
      showToast("Campaign archived successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to archive campaign", "error");
    },
  });

  const campaigns = campaignsData?.content || [];
  const totalElements = campaignsData?.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  return (
    <PageLayout>
      <div className="border-b border-border bg-card">
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[26px] leading-none font-semibold text-foreground">Campaigns</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Plan, track, and review campaign performance from one place.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCampaign(null);
                setIsFormOpen(true);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Icons.Campaigns size={14} />
              New Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2.5 mb-3">
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Campaigns</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{campaignStats?.totalCampaigns ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{campaignStats?.activeCampaigns ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{money(campaignStats?.totalBudget)}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Revenue</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{money(campaignStats?.totalExpectedRevenue)}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads Generated</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{campaignStats?.totalLeadsGenerated ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attributed Pipeline</p>
              <p className="text-lg leading-none font-semibold mt-1.5">{money(campaignStats?.totalAttributedPipelineValue)}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="h-9 rounded-full border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="border border-border rounded-lg bg-card p-8 text-center text-muted-foreground">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Icons.Campaigns size={36} />}
            title="No campaigns yet"
            description="Create your first campaign to start tracking demand generation and pipeline impact."
            action={{
              label: "Create Campaign",
              onClick: () => {
                setSelectedCampaign(null);
                setIsFormOpen(true);
              },
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Timeline</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Results</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">ROI</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                  >
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="font-medium text-foreground">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign.channel.replaceAll("_", " ")} · {campaign.targetAudience || "General audience"}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">{campaign.type.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        statusColors[campaign.status] || statusColors.DRAFT
                      )}>
                        {campaign.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      <div>{campaign.startDate || "No start date"}</div>
                      <div>{campaign.endDate || "No end date"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="font-medium">{money(campaign.budget)}</div>
                      <div className="text-muted-foreground">{money(campaign.expectedRevenue)} expected</div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div>{campaign.leadsGenerated ?? 0} leads</div>
                      <div className="text-muted-foreground">
                        {campaign.opportunitiesCreated ?? 0} opps · {campaign.conversions ?? 0} conversions
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium">{percent(campaign.roiPercent)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInsightsCampaign(campaign)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Insights"
                        >
                          <Icons.BarChart3 size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Archive"
                        >
                          <Icons.Trash size={16} className="text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-card">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min(currentPage * pageSize + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} campaigns
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
            disabled={currentPage === 0}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {Math.min(currentPage + 1, totalPages)} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
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

      <CampaignForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCampaign(null);
        }}
        onSubmit={(payload) => {
          if (selectedCampaign?.id) {
            updateMutation.mutate({ id: selectedCampaign.id, payload });
            return;
          }
          createMutation.mutate(payload);
        }}
        initialData={selectedCampaign ? {
          name: selectedCampaign.name,
          type: selectedCampaign.type,
          status: selectedCampaign.status,
          channel: selectedCampaign.channel,
          targetAudience: selectedCampaign.targetAudience || "",
          segmentType: selectedCampaign.segmentType || "CUSTOM",
          segmentName: selectedCampaign.segmentName || "",
          primaryPersona: selectedCampaign.primaryPersona || "",
          territoryFocus: selectedCampaign.territoryFocus || "",
          journeyStage: selectedCampaign.journeyStage || "AWARENESS",
          autoEnrollNewLeads: selectedCampaign.autoEnrollNewLeads ?? true,
          nurtureCadenceDays: selectedCampaign.nurtureCadenceDays?.toString() || "3",
          nurtureTouchCount: selectedCampaign.nurtureTouchCount?.toString() || "4",
          primaryCallToAction: selectedCampaign.primaryCallToAction || "",
          audienceSize: selectedCampaign.audienceSize?.toString() || "",
          budget: selectedCampaign.budget?.toString() || "",
          expectedRevenue: selectedCampaign.expectedRevenue?.toString() || "",
          actualRevenue: selectedCampaign.actualRevenue?.toString() || "",
          leadsGenerated: selectedCampaign.leadsGenerated?.toString() || "",
          opportunitiesCreated: selectedCampaign.opportunitiesCreated?.toString() || "",
          conversions: selectedCampaign.conversions?.toString() || "",
          startDate: selectedCampaign.startDate || "",
          endDate: selectedCampaign.endDate || "",
          description: selectedCampaign.description || "",
          notes: selectedCampaign.notes || "",
        } : undefined}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedCampaign(null);
        }}
        onConfirm={() => {
          if (selectedCampaign?.id) {
            deleteMutation.mutate(selectedCampaign.id);
          }
        }}
        title="Archive Campaign"
        message={`Are you sure you want to archive "${selectedCampaign?.name}"?`}
        variant="danger"
      />

      <CampaignInsightsModal
        isOpen={Boolean(insightsCampaign)}
        onClose={() => setInsightsCampaign(null)}
        insights={campaignInsights}
        loading={insightsLoading}
      />
    </PageLayout>
  );
}
