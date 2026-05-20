import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { CompanyForm } from "../components/forms";
import { AccountInsightsModal } from "../components/AccountInsightsModal";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { companiesApi } from "../lib/api";
import type { Company } from "../lib/types";
import { exportToCSV } from "../lib/helpers";

const statusColors = {
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-gray-50 text-gray-700 border-gray-200",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
};

function mapCompanyFormData(data: any): Partial<Company> {
  return {
    name: data.name,
    email: data.email,
    industry: data.industry || null,
    website: data.website || null,
    phone: data.phone || null,
    revenue: data.revenue ? Number(data.revenue) : undefined,
    employeeCount: data.employeeCount ? Number(data.employeeCount) : undefined,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    postalCode: data.zip || null,
    country: data.country || null,
    territory: data.territory || null,
    notes: data.notes || null,
    status: data.status,
    parentCompanyId: data.parentCompanyId || undefined,
  };
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canManageTerritories = user?.role === "ADMIN" || user?.role === "MANAGER";

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedCompany(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ["companies", searchQuery, currentPage, pageSize],
    queryFn: () => companiesApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
  });

  const { data: governanceQueue, isLoading: isGovernanceLoading } = useQuery({
    queryKey: ["company-territory-governance-queue"],
    queryFn: () => companiesApi.getTerritoryGovernanceQueue(),
    enabled: canManageTerritories,
  });

  const companies = companiesData?.content || [];
  const totalElements = companiesData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsFormOpen(false);
      showToast("Company created successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to create company", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsFormOpen(false);
      showToast("Company updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to update company", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsDeleteModalOpen(false);
      showToast("Company deleted successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to delete company", "error");
    },
  });

  const reassignGovernanceMutation = useMutation({
    mutationFn: (companyIds?: string[]) => companiesApi.reassignTerritoryMismatches(companyIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-territory-governance-queue"] });
      showToast(
        `Reassigned ${result.reassignedCompanies} account${result.reassignedCompanies === 1 ? "" : "s"} and aligned ${result.alignedDeals} deal${result.alignedDeals === 1 ? "" : "s"}.`,
        "success"
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to reassign accounts", "error");
    },
  });

  const erpSyncMutation = useMutation({
    mutationFn: ({ id, providerKey }: { id: string; providerKey: "quickbooks" | "xero" }) =>
      companiesApi.syncToErp(id, providerKey),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showToast(result.summary || `Synced account to ${variables.providerKey}`, "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to sync account to ERP", "error");
    },
  });

  const filteredCompanies = companies.filter((company) => {
    return filter === "all" || company.status?.toLowerCase() === filter;
  });

  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filter]);

  const statusCounts = {
    all: totalElements,
    active: companies.filter((company) => company.status === "ACTIVE").length,
    prospect: companies.filter((company) => company.status === "PROSPECT").length,
    inactive: companies.filter((company) => company.status === "INACTIVE").length,
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[26px] leading-none font-semibold text-foreground">Companies</h1>
          </div>

          <div className="mt-4 mb-3 w-full overflow-hidden rounded-[1.05rem] border border-border/60 bg-background/55 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icons.Building2 size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Total Accounts</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{totalElements}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Accounts in workspace</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.TrendingUp size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Prospects</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{statusCounts.prospect}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Open expansion targets</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2 2xl:border-r 2xl:border-border/60">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/60">
                    <Icons.Users size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Top-Level Accounts</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{companies.filter((company) => !company.parentCompanyId).length}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Independent parent records</p>
                  </div>
                </div>
              </div>
              <div className="group relative min-w-0 px-2.5 py-2">
                <div className="relative flex items-start gap-2.5">
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50/80">
                    <Icons.Kanban size={14} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-foreground/46">Subsidiaries</p>
                    <p className="mt-0.5 text-[1.22rem] font-semibold leading-none tracking-[-0.05em] text-foreground">{companies.filter((company) => company.parentCompanyId).length}</p>
                    <p className="mt-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">Child account records</p>
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
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8.5 pr-3.5 text-[13px] border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              <button
                onClick={() => {
                  exportToCSV(
                    filteredCompanies,
                    [
                      { header: "Name", accessor: "name" },
                      { header: "Parent Account", accessor: (company: Company) => company.parentCompanyName || "" },
                      { header: "Industry", accessor: "industry" },
                      { header: "Website", accessor: "website" },
                      { header: "Phone", accessor: "phone" },
                      { header: "City", accessor: "city" },
                      { header: "Country", accessor: "country" },
                      { header: "Territory", accessor: (company: Company) => company.territory || "" },
                      { header: "Owner Territory", accessor: (company: Company) => company.ownerTerritory || "" },
                      { header: "Contacts", accessor: (company: Company) => company.contactCount || 0 },
                      { header: "Subsidiaries", accessor: (company: Company) => company.childCompanyCount || 0 },
                      { header: "Created At", accessor: (company: Company) => company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "" },
                    ],
                    "companies"
                  );
                  showToast(`Exported ${filteredCompanies.length} companies to CSV`, "success");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors shadow-[0_3px_12px_rgba(15,23,42,0.035)] hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={13} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors shadow-[0_3px_12px_rgba(37,99,235,0.18)] hover:bg-primary/90"
              >
                <Icons.Plus size={13} />
                Add Company
              </button>
              <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-background p-0.5 shadow-[0_3px_12px_rgba(15,23,42,0.035)]">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-colors",
                  viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
                aria-label="Table view"
              >
                <Icons.List size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-colors",
                  viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
                aria-label="Grid view"
              >
                <Icons.Kanban size={15} />
              </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-2.5 mt-1 shadow-sm">
            <div className="flex flex-wrap gap-1.5">
            {(["all", "active", "prospect", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium capitalize transition-colors",
                  filter === status
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/70"
                )}
              >
                <span>{status === "all" ? "All Companies" : status}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums",
                  filter === status ? "bg-primary-foreground/16 text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {canManageTerritories && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Account Territory Governance</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Review account owner mismatches and realign workspace coverage before they distort pipeline execution.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {governanceQueue?.mismatchCount ?? 0} mismatched
                </div>
                <button
                  onClick={() => reassignGovernanceMutation.mutate(undefined)}
                  disabled={!governanceQueue?.companies?.length || reassignGovernanceMutation.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/90"
                >
                  <Icons.ArrowRight size={14} />
                  Auto-Reassign Accounts
                </button>
              </div>
            </div>

            {isGovernanceLoading ? (
              <p className="text-sm text-muted-foreground">Loading governance queue...</p>
            ) : governanceQueue?.companies?.length ? (
              <div className="space-y-2.5">
                {governanceQueue.companies.slice(0, 5).map((item) => (
                  <div key={item.companyId} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className=" text-sm font-medium text-foreground">{item.companyName}</p>
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            Needs reassignment
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.territory || "No territory"} · owner {item.currentOwnerName || "Unassigned"} ({item.currentOwnerTerritory || "No owner territory"})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.activeDealCount} active deals · {item.territoryMismatchDealCount} mismatched deals · {item.overdueTaskCount} overdue tasks
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          Suggested: {item.suggestedOwnerName || "No better owner found"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.suggestedOwnerTerritory || "No governed match"}
                        </p>
                        <button
                          onClick={() => reassignGovernanceMutation.mutate([item.companyId])}
                          disabled={!item.suggestedOwnerId || reassignGovernanceMutation.isPending}
                          className="mt-3 h-8 rounded-full border border-border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-secondary"
                        >
                          Reassign Account
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Account coverage is aligned with the current territory model.
              </div>
            )}
          </div>
        )}

        {viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Territory</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contacts</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hierarchy</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                          <Icons.Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.parentCompanyName ? `Child of ${company.parentCompanyName}` : "Top-level account"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">{company.industry || "N/A"}</td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      {company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state || "N/A"}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="text-foreground">{company.territory || company.country || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">
                        {company.ownerTerritory ? `Owner ${company.ownerTerritory}` : "Owner territory unavailable"}
                      </div>
                      {company.territoryMismatch && (
                        <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Needs reassignment
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm">{company.contactCount || 0}</td>
                    <td className="px-3 py-2.5 text-sm">
                      <div>{company.dealCount || 0} deals</div>
                      <div className="text-xs text-muted-foreground">{company.childCompanyCount || 0} subsidiaries</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                          statusColors[(company.status || "ACTIVE").toLowerCase() as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200"
                        )}
                      >
                        {company.status ? `${company.status.charAt(0)}${company.status.slice(1).toLowerCase()}` : "N/A"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsInsightsOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Account intelligence"
                        >
                          <Icons.Activity size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "quickbooks" })}
                          disabled={!company.id || erpSyncMutation.isPending}
                          className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors disabled:opacity-50 hover:bg-secondary"
                          title="Sync to QuickBooks"
                        >
                          QB
                        </button>
                        <button
                          onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "xero" })}
                          disabled={!company.id || erpSyncMutation.isPending}
                          className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors disabled:opacity-50 hover:bg-secondary"
                          title="Sync to Xero"
                        >
                          Xero
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
          <div className="grid grid-cols-1 gap-3 rounded-[1.35rem] border border-border/70 bg-card/70 p-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredCompanies.map((company) => {
              const statusTone = cn(
                "border",
                company.status === "ACTIVE" && "border-emerald-200/80 bg-emerald-50 text-emerald-700",
                company.status === "PROSPECT" && "border-sky-200/80 bg-sky-50 text-sky-700",
                company.status === "INACTIVE" && "border-slate-200/80 bg-slate-100 text-slate-700"
              );
              const metricTone =
                (company.revenue ?? 0) >= 1000000
                  ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                  : (company.revenue ?? 0) >= 250000
                    ? "border-amber-200/80 bg-amber-50 text-amber-700"
                    : "border-slate-200/80 bg-slate-100 text-slate-700";
              const location = company.city && company.state
                ? `${company.city}, ${company.state}`
                : company.city || company.state || company.country || "No location set";
              const initials = company.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase() || "?";

              return (
                <div
                  key={company.id}
                  className="group relative overflow-hidden rounded-[1.1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_50px_-34px_rgba(37,99,235,0.35)]"
                >
                  <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_60%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_52%)]" />
                  <div className="absolute right-3 top-3 h-12 w-12 rounded-full bg-primary/6 blur-2xl transition-transform duration-300 group-hover:scale-125" />

                  <div className="relative flex h-full flex-col p-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/70 bg-white/80 text-[11px] font-semibold text-primary shadow-[0_10px_24px_-18px_rgba(37,99,235,0.55)] backdrop-blur">
                          {initials}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-[14px] font-semibold leading-tight text-foreground">
                              {company.name}
                            </h3>
                            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]", statusTone)}>
                              {company.status || "ACTIVE"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                            {company.parentCompanyName ? `Child of ${company.parentCompanyName}` : company.industry || "Top-level account"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {company.ownerName && (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75">
                                Owner {company.ownerName}
                              </span>
                            )}
                            {(company.territory || company.country) && (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75">
                                {company.territory || company.country}
                              </span>
                            )}
                            {company.territoryMismatch && (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                                Territory mismatch
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={cn("inline-flex min-w-[3.35rem] flex-col items-center rounded-[0.95rem] border px-1.5 py-1 text-center shadow-sm", metricTone)}>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-80">Revenue</span>
                        <span className="mt-0.5 text-[0.9rem] font-semibold leading-none">
                          {company.revenue ? `$${Math.round(Number(company.revenue) / 1000)}k` : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-3 overflow-hidden rounded-[1rem] border border-border/60 bg-white/75 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Contacts</p>
                          <p className="mt-0.5 text-[0.95rem] font-semibold leading-none text-foreground">
                            {company.contactCount || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Hierarchy</p>
                          <p className="mt-0.5 truncate text-[12px] font-medium text-foreground/80">
                            {company.childCompanyCount || 0} subsidiaries
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Phone size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{company.phone || "No phone provided"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Mail size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{company.email || company.website || "No email or website"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Target size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{location}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                      <button
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsInsightsOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <Icons.Activity size={13} />
                        View profile
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsFormOpen(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          aria-label="Edit company"
                        >
                          <Icons.Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsDeleteModalOpen(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete company"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "quickbooks" })}
                        disabled={!company.id || erpSyncMutation.isPending}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-border/70 bg-white/80 px-3 text-[10px] font-medium text-foreground transition-colors disabled:opacity-50 hover:border-primary/30 hover:bg-primary/5"
                      >
                        Sync QuickBooks
                      </button>
                      <button
                        onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "xero" })}
                        disabled={!company.id || erpSyncMutation.isPending}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-border/70 bg-white/80 px-3 text-[10px] font-medium text-foreground transition-colors disabled:opacity-50 hover:border-primary/30 hover:bg-primary/5"
                      >
                        Sync Xero
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        )}

        {!isLoading && companies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No companies found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} companies
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
      </div>

      <CompanyForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCompany(null);
        }}
        onSubmit={(data) => {
          const payload = mapCompanyFormData(data);
          if (selectedCompany?.id) {
            updateMutation.mutate({ id: selectedCompany.id, data: payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
        initialData={selectedCompany ? ({ ...selectedCompany, zip: selectedCompany.postalCode } as any) : undefined}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCompany(null);
        }}
        onConfirm={() => {
          if (selectedCompany?.id) {
            deleteMutation.mutate(selectedCompany.id);
          }
        }}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.name}"? This action cannot be undone.`}
        variant="danger"
      />

      <AccountInsightsModal
        company={isInsightsOpen ? selectedCompany : null}
        isOpen={isInsightsOpen}
        onClose={() => {
          setIsInsightsOpen(false);
          setSelectedCompany(null);
        }}
      />
    </PageLayout>
  );
}
