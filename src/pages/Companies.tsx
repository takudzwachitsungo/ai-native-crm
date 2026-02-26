import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { CompanyForm } from "../components/forms";
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

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies from backend
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies', searchQuery, currentPage, pageSize],
    queryFn: () => companiesApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
  });

  const companies = companiesData?.content || [];
  const totalElements = companiesData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsFormOpen(false);
      showToast('Company created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create company', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => 
      companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsFormOpen(false);
      showToast('Company updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update company', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsDeleteModalOpen(false);
      showToast('Company deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete company', 'error');
    },
  });

  const filteredCompanies = companies.filter((company) => {
    const matchesFilter = filter === "all" || (company as any).status === filter;
    return matchesFilter;
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filter]);

  const statusCounts = {
    all: totalElements,
    active: companies.filter((c: any) => c.status === "active").length,
    prospect: companies.filter((c: any) => c.status === "prospect").length,
    inactive: companies.filter((c: any) => c.status === "inactive").length,
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Companies</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  exportToCSV(filteredCompanies, [
                    { header: 'Name', accessor: 'name' },
                    { header: 'Industry', accessor: 'industry' },
                    { header: 'Website', accessor: 'website' },
                    { header: 'Phone', accessor: 'phone' },
                    { header: 'City', accessor: 'city' },
                    { header: 'Country', accessor: 'country' },
                    { header: 'Employees', accessor: (c: any) => c.employees || '' },
                    { header: 'Revenue', accessor: (c: any) => c.annualRevenue || c.revenue || '' },
                    { header: 'Created At', accessor: (c: any) => c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '' },
                  ], 'companies');
                  showToast(`Exported ${filteredCompanies.length} companies to CSV`, 'success');
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

          {/* Search and Filters */}
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

          {/* Status Tabs */}
          <div className="flex gap-1 border-b border-border -mb-px">
            {(["all", "active", "prospect", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
                  filter === status
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
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

      {/* Content */}
      <div className="p-6">
        {viewMode === "table" ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contacts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Deals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                          <Icons.Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.website}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">{company.industry}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm">{(company as any).contactCount || 0}</td>
                    <td className="px-4 py-4 text-sm">{(company as any).dealCount || 0}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        statusColors[(company as any).status as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200"
                      )}>
                        {(company as any).status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      <p className="text-xs text-muted-foreground mt-0.5">{company.industry}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                    statusColors[(company as any).status as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200"
                  )}>
                    {(company as any).status || 'N/A'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Phone size={14} />
                    <span>{company.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Mail size={14} />
                    <span>{company.website || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.Building2 size={14} />
                    <span>{company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-semibold">{(company as any).revenue || 'N/A'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Contacts</p>
                    <p className="text-sm font-semibold">{(company as any).contacts || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Deals</p>
                    <p className="text-sm font-semibold">{(company as any).deals || 0}</p>
                  </div>
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

      {/* Footer Pagination */}
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
                  currentPage === pageNum
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-secondary"
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

      {/* Create/Edit Company Form Modal */}
      <CompanyForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCompany(null);
        }}
        onSubmit={(data) => {
          if (selectedCompany?.id) {
            updateMutation.mutate({ id: selectedCompany.id, data: data as any });
          } else {
            createMutation.mutate(data as any);
          }
        }}
        initialData={selectedCompany ? { ...selectedCompany, revenue: selectedCompany.revenue?.toString() } as any : undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCompany(null);
        }}
        onConfirm={() => {
          if (selectedCompany?.id) {
            deleteMutation.mutate(selectedCompany.id, {
              onSuccess: () => {
                showToast(`Company "${selectedCompany.name}" deleted successfully`, "success");
                setIsDeleteModalOpen(false);
                setSelectedCompany(null);
              },
              onError: () => {
                showToast("Failed to delete company", "error");
              }
            });
          }
        }}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.name}"? This action cannot be undone.`}
        variant="danger"
      />
    </PageLayout>
  );
}
