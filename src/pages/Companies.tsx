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
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Companies</h1>
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Add Company
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total Accounts</p>
              <p className="text-xl font-semibold text-foreground">{totalElements}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Prospects</p>
              <p className="text-xl font-semibold text-foreground">{statusCounts.prospect}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Top-Level Accounts</p>
              <p className="text-xl font-semibold text-foreground">{companies.filter((company) => !company.parentCompanyId).length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Subsidiaries</p>
              <p className="text-xl font-semibold text-foreground">{companies.filter((company) => company.parentCompanyId).length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 rounded border",
                  viewMode === "table" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Table view"
              >
                <Icons.List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded border",
                  viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Grid view"
              >
                <Icons.Kanban size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-b border-border -mb-px">
            {(["all", "active", "prospect", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
                  filter === status ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {status === "all" ? "All Companies" : status}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {canManageTerritories && (
          <div className="mb-6 rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Account Territory Governance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review account owner mismatches and realign workspace coverage before they distort pipeline execution.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                  {governanceQueue?.mismatchCount ?? 0} mismatched
                </div>
                <button
                  onClick={() => reassignGovernanceMutation.mutate(undefined)}
                  disabled={!governanceQueue?.companies?.length || reassignGovernanceMutation.isPending}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Icons.ArrowRight size={16} />
                  Auto-Reassign Accounts
                </button>
              </div>
            </div>

            {isGovernanceLoading ? (
              <p className="text-sm text-muted-foreground">Loading governance queue...</p>
            ) : governanceQueue?.companies?.length ? (
              <div className="space-y-3">
                {governanceQueue.companies.slice(0, 5).map((item) => (
                  <div key={item.companyId} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{item.companyName}</p>
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
                          className="mt-3 px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Territory</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contacts</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Hierarchy</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                          <Icons.Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.parentCompanyName ? `Child of ${company.parentCompanyName}` : "Top-level account"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{company.industry || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
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
                    <td className="px-4 py-3 text-sm">{company.contactCount || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{company.dealCount || 0} deals</div>
                      <div className="text-xs text-muted-foreground">{company.childCompanyCount || 0} subsidiaries</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                          statusColors[(company.status || "ACTIVE").toLowerCase() as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200"
                        )}
                      >
                        {company.status ? `${company.status.charAt(0)}${company.status.slice(1).toLowerCase()}` : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                          className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                          title="Sync to QuickBooks"
                        >
                          QB
                        </button>
                        <button
                          onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "xero" })}
                          disabled={!company.id || erpSyncMutation.isPending}
                          className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <Icons.Building2 size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{company.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {company.parentCompanyName ? `Child of ${company.parentCompanyName}` : company.industry || "Top-level account"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                      statusColors[(company.status || "ACTIVE").toLowerCase() as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200"
                    )}
                  >
                    {company.status ? `${company.status.charAt(0)}${company.status.slice(1).toLowerCase()}` : "N/A"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Phone size={14} />
                    <span>{company.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Mail size={14} />
                    <span>{company.email || company.website || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Building2 size={14} />
                    <span>{company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Target size={14} />
                    <span>{company.territory || company.country || "No territory set"}</span>
                  </div>
                  {company.territoryMismatch && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
                      Account territory does not match the current owner coverage.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-semibold">{company.revenue ? `$${Number(company.revenue).toLocaleString()}` : "N/A"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Contacts</p>
                    <p className="text-sm font-semibold">{company.contactCount || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Subsidiaries</p>
                    <p className="text-sm font-semibold">{company.childCompanyCount || 0}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCompany(company);
                    setIsInsightsOpen(true);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Icons.Activity size={16} />
                  View Account Intelligence
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "quickbooks" })}
                    disabled={!company.id || erpSyncMutation.isPending}
                    className="rounded border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Sync QuickBooks
                  </button>
                  <button
                    onClick={() => erpSyncMutation.mutate({ id: company.id!, providerKey: "xero" })}
                    disabled={!company.id || erpSyncMutation.isPending}
                    className="rounded border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Sync Xero
                  </button>
                </div>
              </div>
            ))}
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

      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} companies
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
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
                  "px-3 py-1.5 text-sm rounded transition-colors",
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
              "px-3 py-1.5 text-sm border border-border rounded transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
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
