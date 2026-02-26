import { cn } from "../lib/utils";

interface ChartProps {
  type: string;
  title: string;
  data: Record<string, number>;
  xAxis?: string;
  yAxis?: string;
}

export function SimpleChart({ type, data }: ChartProps) {
  const entries = Object.entries(data);
  const maxValue = Math.max(...entries.map(([, value]) => value));

  if (type === "bar") {
    return (
      <div className="space-y-3">
        {entries.map(([label, value]) => {
          const percentage = (value / maxValue) * 100;
          const displayValue = value > 1000000 
            ? `$${(value / 1000000).toFixed(1)}M`
            : value > 1000
            ? `${(value / 1000).toFixed(0)}K`
            : value.toString();

          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground capitalize">
                  {label.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span className="text-muted-foreground">{displayValue}</span>
              </div>
              <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                    "bg-gradient-to-r from-primary to-blue-500"
                  )}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    {percentage > 15 && (
                      <span className="text-xs font-semibold text-primary-foreground">
                        {Math.round(percentage)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "pie") {
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-orange-500",
    ];

    return (
      <div className="space-y-2">
        {entries.map(([label, value], idx) => {
          const percentage = (value / total) * 100;
          const displayValue = value > 1000000 
            ? `$${(value / 1000000).toFixed(1)}M`
            : value > 1000
            ? `${(value / 1000).toFixed(0)}K`
            : value.toString();

          return (
            <div key={label} className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", colors[idx % colors.length])} />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {label.replace(/_/g, ' ').toLowerCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{displayValue}</span>
                  <span className="text-xs text-muted-foreground">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "funnel") {
    const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
    
    return (
      <div className="space-y-2">
        {sortedEntries.map(([label, value], idx) => {
          const widthPercent = 100 - (idx * 15);
          const displayValue = value > 1000000 
            ? `$${(value / 1000000).toFixed(1)}M`
            : value > 1000
            ? `${(value / 1000).toFixed(0)}K`
            : value.toString();

          return (
            <div key={label} className="flex flex-col items-center">
              <div
                className="relative h-12 bg-gradient-to-r from-primary/80 to-blue-500/80 rounded flex items-center justify-center transition-all duration-500"
                style={{ width: `${widthPercent}%` }}
              >
                <span className="text-sm font-semibold text-primary-foreground">
                  {label.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">{displayValue}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: show data table
  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between p-2 bg-muted/30 rounded">
          <span className="text-sm font-medium capitalize">
            {label.replace(/_/g, ' ').toLowerCase()}
          </span>
          <span className="text-sm text-muted-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}
