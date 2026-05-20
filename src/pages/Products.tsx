import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { ProductForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { SortableTableHeader, useSortableData } from "../components/SortableTable";
import { productsApi } from "../lib/api";
import type { Product } from "../lib/types";
import { exportToCSV } from "../lib/helpers";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  DISCONTINUED: "bg-red-50 text-red-700 border-red-200",
  DRAFT: "bg-gray-50 text-gray-700 border-gray-200",
};

const getStatusColor = (status: string | undefined) => {
  return statusColors[status?.toUpperCase() || 'DRAFT'] || statusColors.DRAFT;
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products from backend
  const { data: productsData } = useQuery({
    queryKey: ['products', searchQuery, currentPage, pageSize],
    queryFn: () => productsApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
  });

  const products = productsData?.content || [];
  const totalElements = productsData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Product>) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsFormOpen(false);
      showToast('Product created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create product', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsFormOpen(false);
      showToast('Product updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update product', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleteModalOpen(false);
      showToast('Product deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete product', 'error');
    },
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesFilter = filter === "all" || product.status?.toUpperCase() === filter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const { sortedData: sortedProducts, sortConfig, requestSort } = useSortableData(filteredProducts);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filter]);

  const statusCounts = {
    all: totalElements,
    active: products.filter((p: any) => p.status?.toUpperCase() === "ACTIVE").length,
    draft: products.filter((p: any) => p.status?.toUpperCase() === "DRAFT").length,
    discontinued: products.filter((p: any) => p.status?.toUpperCase() === "DISCONTINUED").length,
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price == null) return '$0.00';
    return `$${price.toLocaleString()}`;
  };
  const calculateMargin = (price: number | undefined | null, cost: number | undefined | null) => {
    if (price == null || cost == null || price === 0) return '0%';
    const margin = ((price - cost) / price) * 100;
    return `${margin.toFixed(1)}%`;
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[26px] leading-none font-semibold text-foreground">Products</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  exportToCSV(filteredProducts, [
                    { header: 'Name', accessor: 'name' },
                    { header: 'SKU', accessor: 'sku' },
                    { header: 'Category', accessor: 'category' },
                    { header: 'Price', accessor: (p: any) => p.price || p.unitPrice || '' },
                    { header: 'Cost', accessor: 'cost' },
                    { header: 'Margin %', accessor: (p: any) => { const price = p.price || p.unitPrice; return price && p.cost ? (((price - p.cost) / price) * 100).toFixed(1) : '0'; } },
                    { header: 'Stock', accessor: 'stockQuantity' },
                    { header: 'Status', accessor: (p: any) => p.status || 'ACTIVE' },
                    { header: 'Description', accessor: 'description' },
                  ], 'products');
                  showToast(`Exported ${filteredProducts.length} products to CSV`, 'success');
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
                Add Product
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search products..."
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
                <Icons.Kanban size={16} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="rounded-2xl border border-border bg-background p-2.5 mt-1 shadow-sm">
            <div className="flex flex-wrap gap-1.5">
            {(["all", "active", "draft", "discontinued"] as const).map((status) => (
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
                <span>{status === "all" ? "All Products" : status}</span>
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

      {/* Content */}
      <div className="space-y-4">
        {viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <SortableTableHeader
                    label="Product"
                    field="name"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <SortableTableHeader
                    label="SKU"
                    field="sku"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <SortableTableHeader
                    label="Category"
                    field="category"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <SortableTableHeader
                    label="Price"
                    field="price"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Margin</th>
                  <SortableTableHeader
                    label="Stock"
                    field="stock"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <SortableTableHeader
                    label="Status"
                    field="status"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-[11px]"
                  />
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                  >
                    <td className="px-3 py-2.5">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-mono text-muted-foreground">{product.sku}</td>
                    <td className="px-3 py-2.5 text-sm">{product.category}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold">{formatPrice(product.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-sm text-green-600">{calculateMargin(product.unitPrice, product.cost)}</td>
                    <td className="px-3 py-2.5 text-sm">{product.stockQuantity ?? 0} {product.unit || 'unit'}s</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        getStatusColor(product.status)
                      )}>
                        {product.status?.toLowerCase() || 'draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedItem(product);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(product);
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 rounded-[1.35rem] border border-border/70 bg-card/70 p-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const statusTone = cn(
                "border",
                product.status === "ACTIVE" && "border-emerald-200/80 bg-emerald-50 text-emerald-700",
                product.status === "INACTIVE" && "border-amber-200/80 bg-amber-50 text-amber-700",
                product.status === "DISCONTINUED" && "border-rose-200/80 bg-rose-50 text-rose-700",
                (!product.status || product.status === "DRAFT") && "border-slate-200/80 bg-slate-100 text-slate-700"
              );
              const metricTone =
                product.unitPrice >= 1000
                  ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                  : product.unitPrice >= 250
                    ? "border-amber-200/80 bg-amber-50 text-amber-700"
                    : "border-slate-200/80 bg-slate-100 text-slate-700";
              const initials = product.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase() || "?";
              const stockLabel = `${product.stockQuantity ?? 0} ${product.unit || "unit"}${(product.stockQuantity ?? 0) === 1 ? "" : "s"}`;

              return (
                <div
                  key={product.id}
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
                              {product.name}
                            </h3>
                            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]", statusTone)}>
                              {product.status || "DRAFT"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                            {product.category || "Uncategorized"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {product.sku && (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75 font-mono">
                                {product.sku}
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground/75">
                              {stockLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={cn("inline-flex min-w-[3.35rem] flex-col items-center rounded-[0.95rem] border px-1.5 py-1 text-center shadow-sm", metricTone)}>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-80">Price</span>
                        <span className="mt-0.5 text-[0.9rem] font-semibold leading-none">
                          {formatPrice(product.unitPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-3 overflow-hidden rounded-[1rem] border border-border/60 bg-white/75 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Margin</p>
                          <p className="mt-0.5 text-[0.95rem] font-semibold leading-none text-foreground">
                            {calculateMargin(product.unitPrice, product.cost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">Cost</p>
                          <p className="mt-0.5 truncate text-[12px] font-medium text-foreground/80">
                            {formatPrice(product.cost)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.FileText size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{product.sku || "No SKU assigned"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Package size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{stockLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-[0.9rem] border border-border/60 bg-background/70 px-2.5 py-1.5">
                        <Icons.Filter size={14} className="shrink-0 text-primary/80" />
                        <span className="truncate text-[11px]">{product.category || "No category set"}</span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[0.95rem] border border-border/60 bg-background/60 px-2.5 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">Description</div>
                      <div className="mt-1.5 text-[11px] text-foreground/80 line-clamp-2">
                        {product.description || "No product description available."}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border/60 pt-2.5">
                      <button
                        onClick={() => {
                          setSelectedItem(product);
                          setIsFormOpen(true);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                        aria-label="Edit product"
                      >
                        <Icons.Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(product);
                          setIsDeleteModalOpen(true);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white/80 text-muted-foreground transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete product"
                      >
                        <Icons.Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} products
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
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
      </div>
      </div>

      {/* Form Modal */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          // ProductForm already transforms data to match backend DTO format
          // Just pass it through
          if (selectedItem?.id) {
            updateMutation.mutate({ id: selectedItem.id, data: data as any });
          } else {
            createMutation.mutate(data as any);
          }
        }}
        initialData={selectedItem ? {
          ...selectedItem,
          price: selectedItem.unitPrice?.toString() || '0',
          cost: selectedItem.cost?.toString() || '0',
          stock: selectedItem.stockQuantity?.toString() || '0',
          status: selectedItem.status || 'ACTIVE',
        } as any : undefined}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={() => {
          if (selectedItem?.id) {
            deleteMutation.mutate(selectedItem.id, {
              onSuccess: () => {
                showToast(`"${selectedItem.name}" deleted successfully`, "success");
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
              },
              onError: () => {
                showToast("Failed to delete product", "error");
              }
            });
          }
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
