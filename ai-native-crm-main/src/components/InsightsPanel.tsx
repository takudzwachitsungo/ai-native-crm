import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, Clock, X, RefreshCw } from 'lucide-react';
import { getInsights, type Insight } from '../lib/ai-api';
import { cn } from '../lib/utils';

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadInsights = async () => {
    setLoading(true);
    try {
      console.log('Loading insights...');
      const data = await getInsights('dashboard');
      console.log('Insights loaded:', data);
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
      // Show error state instead of hiding completely
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
    
    // Refresh insights every 5 minutes
    const interval = setInterval(loadInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (index: number) => {
    setDismissed(prev => new Set(prev).add(index.toString()));
  };

  const visibleInsights = insights.filter((_, idx) => !dismissed.has(idx.toString()));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 dark:bg-red-950/20';
      case 'medium':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-950/20';
      case 'low':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="size-5 text-red-600 dark:text-red-400" />;
      case 'medium':
        return <Clock className="size-5 text-orange-600 dark:text-orange-400" />;
      case 'low':
        return <TrendingUp className="size-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertCircle className="size-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stuck_deal':
        return '⏸️';
      case 'closing_soon':
        return '🎯';
      case 'inactive_contact':
        return '👤';
      case 'overdue_task':
        return '⚠️';
      case 'hot_opportunity':
        return '🔥';
      default:
        return '📌';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="size-4" />
          AI Insights
        </h3>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && insights.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <RefreshCw className="size-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Loading insights...</p>
        </div>
      ) : visibleInsights.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <TrendingUp className="size-6 mx-auto mb-2" />
          <p className="text-sm font-medium">No insights available</p>
          <p className="text-xs mt-1">Check back later or click refresh</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleInsights.slice(0, 5).map((insight, idx) => (
            <div
              key={idx}
              className={cn(
                'relative border rounded-lg p-3 transition-all',
                getSeverityColor(insight.severity)
              )}
            >
              <button
                onClick={() => handleDismiss(idx)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>

              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(insight.severity)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-sm">{getTypeIcon(insight.type)}</span>
                    <p className="text-sm font-semibold">{insight.message}</p>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    Type: {insight.type} | Entity: {insight.entity_type}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {insight.context?.join(' • ') || 'No additional context'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {visibleInsights.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{visibleInsights.length - 5} more insights
            </p>
          )}
        </div>
      )}
    </div>
  );
}
