import { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { forecastingApi } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { exportToCSV } from '../lib/helpers';

// Helper function to render markdown bold syntax
const renderMarkdownText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function Forecasting() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  const loadCachedForecast = async () => {
    try {
      const data = await forecastingApi.getLatest();
      if (data.success) {
        setForecastData(data);
        setCacheAge(data.cache_age_seconds || 0);
        setLastUpdate(data.generated_at || null);
      } else {
        setError(data.error || 'No cached forecast available');
      }
    } catch (err) {
      console.error('Error loading cached forecast:', err);
      // If cached forecast fails, generate fresh one
      await loadForecast();
    }
  };
  
  const loadForecast = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await forecastingApi.generate(6);
      if (data.success) {
        setForecastData(data);
        setCacheAge(0);
        setLastUpdate(new Date().toISOString());
      } else {
        setError(data.error || 'Failed to generate forecast');
      }
    } catch (err) {
      console.error('Error loading forecast:', err);
      setError('Failed to load forecast data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    // Initial load: try cached first
    const init = async () => {
      setIsLoading(true);
      await loadCachedForecast();
      setIsLoading(false);
    };
    init();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadCachedForecast();
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <PageLayout
        title="Forecasting"
        subtitle="Sales forecasting and projections"
        icon={<Icons.TrendingUp size={20} />}
      >
        <div className="p-6">
          <LoadingSkeleton count={8} height={60} />
        </div>
      </PageLayout>
    );
  }
  
  if (error || !forecastData) {
    return (
      <PageLayout
        title="Forecasting"
        subtitle="Sales forecasting and projections"
        icon={<Icons.TrendingUp size={20} />}
      >
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg">
            <p className="font-semibold">Error loading forecast</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={loadForecast}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  const monthlyForecasts = forecastData.monthly_forecasts || [];
  const teamForecasts = forecastData.team_forecasts || [];
  const totalQuota = forecastData.total_quota || 0;
  const totalForecast = forecastData.weighted_pipeline || 0;
  const totalClosed = teamForecasts.reduce((sum: number, member: any) => sum + member.closed, 0);
  const totalPipeline = teamForecasts.reduce((sum: number, member: any) => sum + member.pipeline, 0);
  const avgAttainment = teamForecasts.length > 0 
    ? Math.round(teamForecasts.reduce((sum: number, member: any) => sum + member.attainment, 0) / teamForecasts.length)
    : 0;

  return (
    <PageLayout
      title="Forecasting"
      subtitle="Sales forecasting and projections"
      icon={<Icons.TrendingUp size={20} />}
      actions={
        <div className="flex items-center gap-4">
          {/* Cache Status */}
          {lastUpdate && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              {cacheAge && cacheAge < 60 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              ) : (
                <span>
                  Updated {cacheAge ? Math.floor(cacheAge / 60) : 0}m ago
                </span>
              )}
            </div>
          )}
          
          <button 
            onClick={loadForecast}
            disabled={isRefreshing}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Icons.RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            onClick={() => {
              if (forecastData?.monthly_forecasts) {
                exportToCSV(forecastData.monthly_forecasts, [
                  { header: 'Month', accessor: 'month' },
                  { header: 'Predicted Revenue', accessor: 'predicted_revenue' },
                  { header: 'Lower Bound', accessor: 'lower_bound' },
                  { header: 'Upper Bound', accessor: 'upper_bound' },
                  { header: 'Confidence', accessor: 'confidence' },
                ], 'forecast_report');
              }
            }}
            disabled={!forecastData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Icons.Download size={16} />
            Export Report
          </button>
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Quota</p>
            <p className="text-2xl font-bold">${(totalQuota / 1000).toFixed(0)}K</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Forecast</p>
            <p className="text-2xl font-bold text-blue-600">${(totalForecast / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalQuota > 0 ? Math.round((totalForecast / totalQuota) * 100) : 0}% of quota
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Closed</p>
            <p className="text-2xl font-bold text-green-600">${(totalClosed / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0}% of quota
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pipeline</p>
            <p className="text-2xl font-bold">${(totalPipeline / 1000).toFixed(0)}K</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Avg Attainment</p>
            <p className="text-2xl font-bold">{avgAttainment}%</p>
          </div>
        </div>
      </div>

      {/* Monthly Forecast Chart */}
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold mb-4">6-Month Forecast Trend</h3>
        {monthlyForecasts.length > 0 ? (
          <>
            <div className="space-y-4">
              {monthlyForecasts.map((data: any) => (
            <div key={data.month} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium w-12">{data.month}</span>
                <div className="flex-1 mx-4">
                  <div className="relative h-8 bg-muted/30 rounded-full overflow-hidden">
                    {/* Quota line */}
                    <div 
                      className="absolute top-0 h-full border-r-2 border-dashed border-gray-400"
                      style={{ left: `${data.pipeline > 0 ? (data.quota / data.pipeline) * 100 : 0}%` }}
                    />
                    {/* Actual */}
                    {data.actual > 0 && (
                      <div 
                        className="absolute top-0 h-full bg-green-500"
                        style={{ width: `${data.pipeline > 0 ? (data.actual / data.pipeline) * 100 : 0}%` }}
                      />
                    )}
                    {/* Forecast */}
                    <div 
                      className="absolute top-0 h-full bg-blue-500/50"
                      style={{ width: `${data.pipeline > 0 ? (data.forecast / data.pipeline) * 100 : 0}%` }}
                    />
                    {/* Pipeline */}
                    <div 
                      className="absolute top-0 h-full bg-purple-500/20"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-muted-foreground w-16 text-right">
                    ${(data.pipeline / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500/20 rounded" />
            <span>Pipeline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/50 rounded" />
            <span>Forecast</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 border-t-2 border-dashed border-gray-400" />
            <span>Quota</span>
          </div>
        </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8">No forecast data available</p>
        )}
      </div>

      {/* AI Insights & Recommendations */}
      {(forecastData.insights?.length > 0 || forecastData.recommendations?.length > 0) && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Sparkles size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insights */}
            {forecastData.insights && forecastData.insights.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Key Insights</h4>
                {forecastData.insights.map((insight: string, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <Icons.TrendingUp size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{renderMarkdownText(insight)}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Recommendations */}
            {forecastData.recommendations && forecastData.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Recommendations</h4>
                {forecastData.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <Icons.CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{renderMarkdownText(rec)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risks & Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Risks */}
            {forecastData.risks && forecastData.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-3">⚠️ At-Risk Deals</h4>
                <div className="space-y-2">
                  {forecastData.risks.map((risk: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{risk.title}</span>
                        <span className="text-sm font-bold text-red-600">${(risk.value / 1000).toFixed(0)}K</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{risk.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Opportunities */}
            {forecastData.opportunities && forecastData.opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-3">🎯 Top Opportunities</h4>
                <div className="space-y-2">
                  {forecastData.opportunities.map((opp: any, idx: number) => (
                    <div key={idx} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{opp.title}</span>
                        <span className="text-sm font-bold text-green-600">${(opp.value / 1000).toFixed(0)}K</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opp.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Performance */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold">Sales Rep</th>
                <th className="text-left p-3 text-xs font-semibold">Quota</th>
                <th className="text-left p-3 text-xs font-semibold">Forecast</th>
                <th className="text-left p-3 text-xs font-semibold">Closed</th>
                <th className="text-left p-3 text-xs font-semibold">Pipeline</th>
                <th className="text-left p-3 text-xs font-semibold">Attainment</th>
                <th className="text-left p-3 text-xs font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {teamForecasts.map((member: any) => (
                <tr key={member.name} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{member.name}</td>
                  <td className="p-3 text-sm">${(member.quota / 1000).toFixed(0)}K</td>
                  <td className="p-3 text-sm text-blue-600">${(member.forecast / 1000).toFixed(0)}K</td>
                  <td className="p-3 text-sm text-green-600">${(member.closed / 1000).toFixed(0)}K</td>
                  <td className="p-3 text-sm">${(member.pipeline / 1000).toFixed(0)}K</td>
                  <td className="p-3">
                    <span className={cn(
                      "text-xs px-2 py-1 border rounded-full",
                      member.attainment >= 90 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      member.attainment >= 80 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                      "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      {member.attainment}%
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full",
                          member.attainment >= 90 ? "bg-green-500" :
                          member.attainment >= 80 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${member.attainment}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}