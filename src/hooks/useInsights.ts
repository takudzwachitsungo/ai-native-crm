import { useState, useEffect } from 'react';
import { getInsights } from '../lib/ai-api';

export type InsightBadgeType = 'overdue' | 'hot' | 'stuck' | 'inactive' | 'closing_soon' | 'at_risk';

export interface Insight {
  id?: string;
  type: string;
  label?: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  entity_type: string;
  entity_id: string;
  context: string[];
  source?: string;
  confidence?: number;
  reason?: string;
  recommended_action?: string;
  generated_by?: string;
  lifecycle?: {
    status: 'active' | 'dismissed' | 'snoozed' | 'assigned';
    assigned_to?: string | null;
    snoozed_until?: string | null;
    note?: string | null;
    updated_at?: string | null;
  };
}

export interface InsightBadgeView {
  type: InsightBadgeType;
  label?: string;
  title?: string;
  source?: string;
  confidence?: number;
}

const badgeTypeMap: Record<string, InsightBadgeType> = {
  at_risk: 'at_risk',
  closing_soon: 'closing_soon',
  due_soon: 'closing_soon',
  high_value: 'hot',
  hot: 'hot',
  inactive: 'inactive',
  overdue: 'overdue',
  stage_stuck: 'stuck',
  stuck: 'stuck',
};

export function insightToBadge(insight: Insight): InsightBadgeView | null {
  const type = badgeTypeMap[insight.type];
  if (!type) {
    return null;
  }

  return {
    type,
    label: insight.label,
    title: insight.reason || insight.message,
    source: insight.source,
    confidence: insight.confidence,
  };
}

export function getInsightBadgesForEntity(
  insights: Insight[],
  entityType: string,
  entityId?: string | null
): InsightBadgeView[] {
  if (!entityId) {
    return [];
  }

  return insights
    .filter((insight) => insight.entity_type === entityType && insight.entity_id === entityId)
    .map(insightToBadge)
    .filter((badge): badge is InsightBadgeView => Boolean(badge));
}

/**
 * Hook to fetch live AI-powered insights
 * Auto-refreshes every 60 seconds
 */
export function useInsights(context: string = 'dashboard', refreshInterval: number = 60000) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInsights = async () => {
      try {
        const data = await getInsights(context);
        if (isMounted) {
          setInsights(data.insights || []);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to fetch insights:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchInsights();

    // Set up interval for live updates
    const intervalId = setInterval(fetchInsights, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [context, refreshInterval]);

  return { insights, loading, error };
}

/**
 * Get insights for a specific entity
 */
export function useEntityInsights(
  entityType: string,
  entityId: string,
  context: string = 'dashboard'
) {
  const { insights, loading, error } = useInsights(context);

  const entityInsights = insights.filter(
    insight => insight.entity_type === entityType && insight.entity_id === entityId
  );

  return { insights: entityInsights, loading, error };
}
