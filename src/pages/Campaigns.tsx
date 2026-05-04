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
import { exportToCSV } from "../lib/helpers";

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
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[26px] leading-none font-semibold text-foreground">Campaigns</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Plan, track, and review campaign performance from one place.
              </p>
            </div>
          </div>

          <div className="mt-4 mb-3 w-full overflow-hidden rounded-[1.05rem] border border-border/60 bg-background/55 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-6">
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icons.Campaigns size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Total Campaigns</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{campaignStats?.totalCampaigns ?? 0}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">All campaign records</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.CheckCircle size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Active</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{campaignStats?.activeCampaigns ?? 0}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Currently running</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/60">
                    <Icons.CircleDollarSign size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Budget</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{money(campaignStats?.totalBudget)}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Allocated spend</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.TrendingUp size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Expected Revenue</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{money(campaignStats?.totalExpectedRevenue)}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Forecasted return</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icons.Users size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Leads Generated</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{campaignStats?.totalLeadsGenerated ?? 0}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Net new leads</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.BarChart3 size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Attributed Pipeline</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{money(campaignStats?.totalAttributedPipelineValue)}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Pipeline influenced</p>
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
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full h-9 pl-8.5 pr-3.5 text-[13px] border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="h-8 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium shadow-[0_3px_12px_rgba(15,23,42,0.035)] focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PLANNED">Planned</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                onClick={() => {
                  exportToCSV(
                    campaigns,
                    [
                      { header: "Name", accessor: "name" },
                      { header: "Type", accessor: (campaign: Campaign) => campaign.type.replaceAll("_", " ") },
                      { header: "Status", accessor: (campaign: Campaign) => campaign.status.replaceAll("_", " ") },
                      { header: "Channel", accessor: (campaign: Campaign) => campaign.channel.replaceAll("_", " ") },
                      { header: "Audience", accessor: "targetAudience" },
                      { header: "Budget", accessor: "budget" },
                      { header: "Expected Revenue", accessor: "expectedRevenue" },
                      { header: "Leads Generated", accessor: "leadsGenerated" },
                      { header: "Opportunities", accessor: "opportunitiesCreated" },
                      { header: "Conversions", accessor: "conversions" },
                      { header: "ROI", accessor: (campaign: Campaign) => percent(campaign.roiPercent) },
                    ],
                    "campaigns"
                  );
                  showToast(`Exported ${campaigns.length} campaigns to CSV`, "success");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)] hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={13} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedCampaign(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors shadow-[0_3px_12px_rgba(37,99,235,0.18)] hover:bg-primary/90"
              >
                <Icons.Campaigns size={13} />
                New Campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Timeline</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Results</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ROI</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
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

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
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
