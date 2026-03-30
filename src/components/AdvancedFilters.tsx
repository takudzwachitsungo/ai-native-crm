import { useState } from "react";
import { Modal } from "./Modal";

export interface FilterValues {
  dateRange?: {
    from: string;
    to: string;
  };
  status?: string[];
  owner?: string;
  tags?: string[];
  minValue?: number;
  maxValue?: number;
  customFields?: Record<string, string>;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  onReset?: () => void;
  initialFilters?: FilterValues;
  statusOptions?: string[];
}

export function AdvancedFilters({
  isOpen,
  onClose,
  onApply,
  onReset,
  initialFilters = {},
  statusOptions = [],
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    if (onReset) {
      onReset();
    }
  };

  const toggleStatus = (value: string) => {
    const currentStatuses = filters.status || [];
    if (currentStatuses.includes(value)) {
      setFilters({
        ...filters,
        status: currentStatuses.filter((s) => s !== value),
      });
    } else {
      setFilters({
        ...filters,
        status: [...currentStatuses, value],
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Filters"
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset All
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                From
              </label>
              <input
                type="date"
                value={filters.dateRange?.from || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange!, from: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                To
              </label>
              <input
                type="date"
                value={filters.dateRange?.to || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange!, to: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  filters.status?.includes(status)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Owner
          </label>
          <select
            value={filters.owner || ""}
            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Owners</option>
            <option value="john">John Doe</option>
            <option value="jane">Jane Smith</option>
            <option value="mike">Mike Johnson</option>
            <option value="sarah">Sarah Lee</option>
          </select>
        </div>

        {/* Value Range */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Value Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Min
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.minValue || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minValue: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Max
              </label>
              <input
                type="number"
                placeholder="∞"
                value={filters.maxValue || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxValue: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Tags
          </label>
          <input
            type="text"
            placeholder="Comma-separated tags"
            value={filters.tags?.join(", ") || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Active Filters Summary */}
        {Object.keys(filters).length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {filters.dateRange?.from && (
                <span className="px-2 py-1 text-xs bg-secondary rounded">
                  Date: {filters.dateRange.from} - {filters.dateRange.to || "now"}
                </span>
              )}
              {filters.status?.map((s) => (
                <span key={s} className="px-2 py-1 text-xs bg-secondary rounded">
                  Status: {s}
                </span>
              ))}
              {filters.owner && (
                <span className="px-2 py-1 text-xs bg-secondary rounded">
                  Owner: {filters.owner}
                </span>
              )}
              {(filters.minValue || filters.maxValue) && (
                <span className="px-2 py-1 text-xs bg-secondary rounded">
                  Value: {filters.minValue || 0} - {filters.maxValue || "∞"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
