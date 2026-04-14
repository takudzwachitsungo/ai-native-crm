import { useState } from "react";
import { Icons } from "./icons";

export type SortDirection = "asc" | "desc" | null;

interface SortableTableHeaderProps {
  label: string;
  field: any;
  currentSort: { field: any; direction: SortDirection };
  onSort: (field: any) => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  field,
  currentSort,
  onSort,
  className = "",
}: SortableTableHeaderProps) {
  const isActive = currentSort.field === field;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className={`text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-secondary/70 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2 select-none">
        <span>{label}</span>
        <div className="flex flex-col">
          {direction === "asc" ? (
            <Icons.ChevronUp size={14} className="text-primary" />
          ) : direction === "desc" ? (
            <Icons.ChevronDown size={14} className="text-primary" />
          ) : (
            <div className="opacity-30">
              <Icons.ChevronUp size={14} />
            </div>
          )}
        </div>
      </div>
    </th>
  );
}

export function useSortableData<T>(
  data: T[],
  defaultSort?: { field: keyof T; direction: SortDirection }
) {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof T;
    direction: SortDirection;
  }>({
    field: defaultSort?.field || ("id" as keyof T),
    direction: defaultSort?.direction || null,
  });

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.direction) return 0;

    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (aValue === bValue) return 0;

    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sortConfig.direction === "asc" ? comparison : -comparison;
  });

  const requestSort = (field: keyof T) => {
    let direction: SortDirection = "asc";

    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    setSortConfig({ field, direction });
  };

  return { sortedData, sortConfig, requestSort };
}
