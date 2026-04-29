import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { SupportCaseForm } from "../components/forms";
import { ConfirmModal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { Icons } from "../components/icons";
import { useToast } from "../components/Toast";
import { supportCasesApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import type { SupportCase } from "../lib/types";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  WAITING_ON_CUSTOMER: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  CLOSED: "bg-slate-50 text-slate-700 border-slate-200",
  ESCALATED: "bg-rose-50 text-rose-700 border-rose-200",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-700 border-slate-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const tierColors: Record<string, string> = {
  STANDARD: "bg-slate-50 text-slate-700 border-slate-200",
  PREMIUM: "bg-sky-50 text-sky-700 border-sky-200",
  STRATEGIC: "bg-violet-50 text-violet-700 border-violet-200",
};

const slaColors: Record<string, string> = {
  ON_TRACK: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WATCH: "bg-amber-50 text-amber-700 border-amber-200",
  BREACHED: "bg-red-50 text-red-700 border-red-200",
  MET: "bg-slate-50 text-slate-700 border-slate-200",
};

function formatDateTime(value?: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function CasesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedCase(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: casesData, isLoading } = useQuery({
    queryKey: ["support-cases", searchQuery, statusFilter, currentPage, pageSize],
    queryFn: () =>
      supportCasesApi.getAll({
        page: currentPage,
        size: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as SupportCase["status"]) : undefined,
      }),
  });

  const { data: caseStats } = useQuery({
    queryKey: ["support-case-stats"],
    queryFn: () => supportCasesApi.getStatistics(),
    staleTime: 60_000,
  });

  const canManageAssignments = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: assignmentQueue } = useQuery({
    queryKey: ["support-case-assignment-queue"],
    queryFn: () => supportCasesApi.getAssignmentQueue(),
    enabled: canManageAssignments,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<SupportCase>) => supportCasesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-assignment-queue"] });
      setIsFormOpen(false);
      showToast("Case created successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to create case", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupportCase> }) => supportCasesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-assignment-queue"] });
      setIsFormOpen(false);
      setSelectedCase(null);
      showToast("Case updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to update case", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportCasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-assignment-queue"] });
      setIsDeleteOpen(false);
      setSelectedCase(null);
      showToast("Case archived successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to archive case", "error");
    },
  });

  const slaAutomationMutation = useMutation({
    mutationFn: () => supportCasesApi.runSlaAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-assignment-queue"] });
      showToast(
        `SLA automation reviewed ${result.reviewedCases} cases, escalated ${result.escalatedCases}, and created ${result.escalationTasksCreated} escalation tasks`,
        "success"
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to run case SLA automation", "error");
    },
  });

  const assignmentAutomationMutation = useMutation({
    mutationFn: () => supportCasesApi.runAssignmentAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["support-cases"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["support-case-assignment-queue"] });
      showToast(
        `Assignment automation reviewed ${result.reviewedCases} cases, assigned ${result.assignedCases}, and created ${result.assignmentTasksCreated} assignment tasks`,
        "success"
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to run case assignment automation", "error");
    },
  });

  const cases = casesData?.content || [];
  const totalElements = casesData?.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[26px] leading-none font-semibold text-foreground">Cases</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Track customer issues, SLA commitments, and escalations in one queue.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => slaAutomationMutation.mutate()}
                disabled={slaAutomationMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-muted/60 disabled:opacity-60"
              >
                <Icons.Zap size={14} />
                {slaAutomationMutation.isPending ? "Running SLA Automation..." : "Run SLA Automation"}
              </button>
              <button
                onClick={() => {
                  setSelectedCase(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icons.Cases size={14} />
                New Case
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mb-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Cases</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.totalCases ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Cases</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.openCases ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue Response</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.overdueResponseCases ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue Resolution</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.overdueResolutionCases ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Response Watch</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.responseWatchCases ?? 0}</p>
            </div>
            <div className="border border-border rounded-lg px-3 py-2 bg-background">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalated</p>
              <p className="text-lg font-semibold mt-1.5">{caseStats?.escalatedCases ?? 0}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search cases..."
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {canManageAssignments && assignmentQueue && assignmentQueue.totalItems > 0 ? (
          <div className="mb-4 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Assignment Queue</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Active unassigned or escalated support cases waiting for owner coverage.
                </p>
              </div>
              <button
                onClick={() => assignmentAutomationMutation.mutate()}
                disabled={assignmentAutomationMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-muted/60 disabled:opacity-60"
              >
                <Icons.Users size={14} />
                {assignmentAutomationMutation.isPending ? "Assigning..." : "Run Assignment Automation"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              <div className="border border-border rounded-lg px-3 py-2 bg-background">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Queued</p>
                <p className="text-lg font-semibold mt-1.5">{assignmentQueue.totalItems}</p>
              </div>
              <div className="border border-border rounded-lg px-3 py-2 bg-background">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Unassigned</p>
                <p className="text-lg font-semibold mt-1.5">{assignmentQueue.unassignedCases}</p>
              </div>
              <div className="border border-border rounded-lg px-3 py-2 bg-background">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalated</p>
                <p className="text-lg font-semibold mt-1.5">{assignmentQueue.escalatedCases}</p>
              </div>
              <div className="border border-border rounded-lg px-3 py-2 bg-background">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Urgent</p>
                <p className="text-lg font-semibold mt-1.5">{assignmentQueue.urgentCases}</p>
              </div>
              <div className="border border-border rounded-lg px-3 py-2 bg-background">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Breached</p>
                <p className="text-lg font-semibold mt-1.5">{assignmentQueue.breachedCases}</p>
              </div>
            </div>

            <div className="space-y-3">
              {assignmentQueue.items.slice(0, 5).map((item) => (
                <div key={item.caseId} className="rounded-lg border border-border bg-muted/20 p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        priorityColors[item.priority] || priorityColors.MEDIUM
                      )}>
                        {item.priority}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground">
                        {item.queueReason.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.caseNumber} · {item.companyName || "No company linked"} · Suggested owner: {item.suggestedOwnerName || "None"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.suggestedReason || "No routing reason available"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Response: {item.responseSlaStatus || "ON_TRACK"}</p>
                    <p>Resolution: {item.resolutionSlaStatus || "ON_TRACK"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="border border-border rounded-lg bg-card p-10 text-center text-muted-foreground">
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={<Icons.Cases size={36} />}
            title="No cases yet"
            description="Create your first support case to start tracking SLA commitments and customer issues."
            action={{
              label: "Create Case",
              onClick: () => {
                setSelectedCase(null);
                setIsFormOpen(true);
              },
            }}
          />
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Case</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SLA</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cases.map((supportCase) => (
                  <tr key={supportCase.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{supportCase.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {supportCase.caseNumber} - {supportCase.customerImpact || "No impact summary"}
                        </p>
                        <div className="mt-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            tierColors[supportCase.customerTier] || tierColors.STANDARD
                          )}>
                            {supportCase.customerTier}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        statusColors[supportCase.status] || statusColors.OPEN
                      )}>
                        {supportCase.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        priorityColors[supportCase.priority] || priorityColors.MEDIUM
                      )}>
                        {supportCase.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-sm">{supportCase.source.replaceAll("_", " ")}</td>
                    <td className="px-3 py-3.5 text-sm space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Response</span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            slaColors[supportCase.responseSlaStatus || "ON_TRACK"] || slaColors.ON_TRACK
                          )}>
                            {(supportCase.responseSlaStatus || "ON_TRACK").replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className={cn(
                          "font-medium mt-1",
                          supportCase.overdueResponse ? "text-red-600" : "text-foreground"
                        )}>
                          {formatDateTime(supportCase.responseDueAt)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Resolution</span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            slaColors[supportCase.resolutionSlaStatus || "ON_TRACK"] || slaColors.ON_TRACK
                          )}>
                            {(supportCase.resolutionSlaStatus || "ON_TRACK").replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className={cn(
                          "font-medium mt-1",
                          supportCase.overdueResolution ? "text-red-600" : "text-foreground"
                        )}>
                          {formatDateTime(supportCase.resolutionDueAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCase(supportCase);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCase(supportCase);
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
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min(currentPage * pageSize + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} cases
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

      <SupportCaseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCase(null);
        }}
        onSubmit={(payload) => {
          if (selectedCase?.id) {
            updateMutation.mutate({ id: selectedCase.id, payload });
            return;
          }
          createMutation.mutate(payload);
        }}
        initialData={selectedCase ? {
          title: selectedCase.title,
          status: selectedCase.status,
          priority: selectedCase.priority,
          customerTier: selectedCase.customerTier,
          source: selectedCase.source,
          responseDueAt: selectedCase.responseDueAt ? selectedCase.responseDueAt.slice(0, 16) : "",
          resolutionDueAt: selectedCase.resolutionDueAt ? selectedCase.resolutionDueAt.slice(0, 16) : "",
          customerImpact: selectedCase.customerImpact || "",
          description: selectedCase.description || "",
          resolutionSummary: selectedCase.resolutionSummary || "",
        } : undefined}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedCase(null);
        }}
        onConfirm={() => {
          if (selectedCase?.id) {
            deleteMutation.mutate(selectedCase.id);
          }
        }}
        title="Archive Case"
        message={`Are you sure you want to archive "${selectedCase?.title}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
