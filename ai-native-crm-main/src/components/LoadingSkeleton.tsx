export interface LoadingSkeletonProps {
  type?: "table" | "grid" | "list";
  rows?: number;
  count?: number; // Alias for rows
  height?: number; // For custom row height
}

export function LoadingSkeleton({ type = "table", rows = 5, count, height }: LoadingSkeletonProps) {
  const numRows = count || rows;
  const rowHeight = height ? `${height}px` : undefined;
  if (type === "table") {
    return (
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex gap-4 px-6 py-3 border-b border-border bg-secondary/50">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-secondary rounded flex-1" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(numRows)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-6 py-4 border-b border-border" style={rowHeight ? { minHeight: rowHeight } : undefined}>
            {[...Array(6)].map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <div className="h-4 bg-secondary rounded w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 animate-pulse">
        {[...Array(numRows)].map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-lg bg-card" style={rowHeight ? { minHeight: rowHeight } : undefined}>
            <div className="h-5 bg-secondary rounded w-3/4 mb-3" />
            <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
            <div className="h-4 bg-secondary rounded w-full mb-2" />
            <div className="h-4 bg-secondary rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  // List type
  return (
    <div className="divide-y divide-border animate-pulse">
      {[...Array(numRows)].map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4" style={rowHeight ? { minHeight: rowHeight } : undefined}>
          <div className="w-10 h-10 rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-secondary rounded w-1/3" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
