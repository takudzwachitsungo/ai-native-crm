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
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Products</h1>
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
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Add Product
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search products..."
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
            {(["all", "active", "draft", "discontinued"] as const).map((status) => (
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
                {status === "all" ? "All Products" : status}
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
                  <SortableTableHeader
                    label="Product"
                    field="name"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <SortableTableHeader
                    label="SKU"
                    field="sku"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <SortableTableHeader
                    label="Category"
                    field="category"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <SortableTableHeader
                    label="Price"
                    field="price"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Margin</th>
                  <SortableTableHeader
                    label="Stock"
                    field="stock"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <SortableTableHeader
                    label="Status"
                    field="status"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-4 text-sm">{product.category}</td>
                    <td className="px-4 py-4 text-sm font-semibold">{formatPrice(product.unitPrice)}</td>
                    <td className="px-4 py-4 text-sm text-green-600">{calculateMargin(product.unitPrice, product.cost)}</td>
                    <td className="px-4 py-4 text-sm">{product.stockQuantity ?? 0} {product.unit || 'unit'}s</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        getStatusColor(product.status)
                      )}>
                        {product.status?.toLowerCase() || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                    getStatusColor(product.status)
                  )}>
                    {product.status?.toLowerCase() || 'draft'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="font-mono">{product.sku}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{product.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock:</span>
                    <span>{product.stockQuantity ?? 0} {product.unit || 'unit'}s</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <p className="text-lg font-semibold text-primary">{formatPrice(product.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Margin</p>
                    <p className="text-lg font-semibold text-green-600">{calculateMargin(product.unitPrice, product.cost)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Pagination */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} products
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
