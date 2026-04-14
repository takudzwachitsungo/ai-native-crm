import { useState, useEffect } from 'react';
import { getInsights } from '../lib/ai-api';

interface Insight {
  type: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  entity_type: string;
  entity_id: string;
  context: string[];
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
