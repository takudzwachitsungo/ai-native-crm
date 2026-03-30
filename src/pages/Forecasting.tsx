import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { AIDegradedNotice } from '../components/AIDegradedNotice';
import { cn } from '../lib/utils';
import { dashboardApi, forecastingApi } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { exportToCSV } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

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

const formatCompactCurrency = (value: number | null | undefined) =>
  `$${(((value ?? 0) as number) / 1000).toFixed(0)}K`;

const formatCoverage = (ratio: number | null | undefined) => `${(ratio ?? 0).toFixed(2)}x`;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Not yet created';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const pacingBadgeClasses = (status?: string) =>
  cn(
    "text-xs px-2 py-1 border rounded-full",
    status === 'ON_TRACK'
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : status === 'WATCH'
        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
        : status === 'AT_RISK'
          ? "bg-red-500/10 text-red-600 border-red-500/20"
          : "bg-muted text-muted-foreground border-border"
  );

const pacingLabel = (status?: string) => {
  switch (status) {
    case 'ON_TRACK':
      return 'On Track';
    case 'WATCH':
      return 'Watch';
    case 'AT_RISK':
      return 'At Risk';
    default:
      return 'No Quota';
  }
};

const escalationBadgeClasses = (level?: string) =>
  cn(
    "text-xs px-2 py-1 border rounded-full",
    level === 'CRITICAL'
      ? "bg-red-500/10 text-red-600 border-red-500/20"
      : level === 'HIGH'
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-blue-500/10 text-blue-700 border-blue-500/20"
  );

const governanceReviewBadgeClasses = (status?: string) =>
  cn(
    "text-xs px-2 py-1 border rounded-full",
    status === 'CRITICAL'
      ? "bg-red-500/10 text-red-600 border-red-500/20"
      : status === 'HIGH'
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : status === 'WATCH'
          ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
          : "bg-green-500/10 text-green-700 border-green-500/20"
  );

export default function Forecasting() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const canManageQuotaRisk = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: revenueOpsSummary } = useQuery({
    queryKey: ['revenue-ops-summary'],
    queryFn: () => dashboardApi.getRevenueOpsSummary(),
    staleTime: 30000,
  });
  const { data: quotaRiskAlerts } = useQuery({
    queryKey: ['quota-risk-alerts'],
    queryFn: () => dashboardApi.getQuotaRiskAlerts(),
    enabled: canManageQuotaRisk,
    staleTime: 30000,
  });
  const { data: territoryExceptions } = useQuery({
    queryKey: ['territory-exceptions'],
    queryFn: () => dashboardApi.getTerritoryExceptions(),
    enabled: canManageQuotaRisk,
    staleTime: 30000,
  });
  const { data: territoryEscalations } = useQuery({
    queryKey: ['territory-escalations'],
    queryFn: () => dashboardApi.getTerritoryEscalations(),
    enabled: canManageQuotaRisk,
    staleTime: 30000,
  });
  const { data: governanceInbox } = useQuery({
    queryKey: ['governance-inbox'],
    queryFn: () => dashboardApi.getGovernanceInbox(),
    enabled: canManageQuotaRisk,
    staleTime: 30000,
  });
  const { data: automationRuns } = useQuery({
    queryKey: ['automation-runs'],
    queryFn: () => dashboardApi.getAutomationRuns(6),
    enabled: canManageQuotaRisk,
    staleTime: 30000,
  });
  const createQuotaRiskTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runQuotaRiskAlertAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['quota-risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      showToast(
        `Created ${result.tasksCreated} follow-up task${result.tasksCreated === 1 ? '' : 's'} for quota-risk reps.`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create quota risk tasks', 'error');
    },
  });
  const createTerritoryExceptionTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryExceptionAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['territory-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
      showToast(
        `Created ${result.tasksCreated} territory review task${result.tasksCreated === 1 ? '' : 's'}.`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create territory exception tasks', 'error');
    },
  });
  const createTerritoryEscalationTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryEscalationAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      showToast(
        `Created ${result.tasksCreated} territory escalation alert${result.tasksCreated === 1 ? '' : 's'}.`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create territory escalation alerts', 'error');
    },
  });
  const autoRemediateTerritoryExceptionsMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryAutoRemediation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['territory-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['quota-risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-ops-summary'] });
      showToast(
        `Reassigned ${result.leadsReassigned} lead${result.leadsReassigned === 1 ? '' : 's'}, ${result.companiesReassigned} account${result.companiesReassigned === 1 ? '' : 's'}, and ${result.dealsReassigned} deal${result.dealsReassigned === 1 ? '' : 's'}.`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to auto-remediate territory exceptions', 'error');
    },
  });
  const createGovernanceDigestMutation = useMutation({
    mutationFn: () => dashboardApi.runGovernanceDigestAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      showToast(
        result.digestsCreated > 0
          ? `Created ${result.digestsCreated} governance digest task.`
          : 'Governance digest already exists for today.',
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create governance digest', 'error');
    },
  });
  const runGovernanceAutomationMutation = useMutation({
    mutationFn: () => dashboardApi.runGovernanceAutomation(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['quota-risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
      showToast(
        `Governance automation created ${result.digestsCreated} digest(s), escalated ${result.overdueTasksEscalated} overdue review task(s), and created ${result.escalationTasksCreated} escalation task(s).`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to run governance automation', 'error');
    },
  });
  const acknowledgeGovernanceTaskMutation = useMutation({
    mutationFn: (taskId: string) => dashboardApi.acknowledgeGovernanceTask(taskId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['quota-risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
      showToast(
        result.acknowledged
          ? `Marked governance task ${result.taskId} as reviewed.`
          : 'Governance task was already acknowledged.',
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to acknowledge governance task', 'error');
    },
  });
  
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
  const totalQuota = revenueOpsSummary?.totalQuarterlyQuota ?? forecastData.total_quota ?? 0;
  const totalForecast = forecastData.weighted_pipeline || 0;
  const totalClosed = teamForecasts.reduce((sum: number, member: any) => sum + member.closed, 0);
  const totalPipeline = teamForecasts.reduce((sum: number, member: any) => sum + member.pipeline, 0);
  const avgAttainment = teamForecasts.length > 0 
    ? Math.round(teamForecasts.reduce((sum: number, member: any) => sum + member.attainment, 0) / teamForecasts.length)
    : 0;
  const revenueOpsTeam = revenueOpsSummary?.teamProgress || [];
  const territorySummaries = revenueOpsSummary?.territorySummaries || [];
  const atRiskReps = quotaRiskAlerts?.alerts || revenueOpsTeam.filter((member: any) => member.pacingStatus === 'AT_RISK' || member.pacingStatus === 'WATCH');
  const governanceDigestStatusLabel = governanceInbox?.digestDue
    ? 'Digest due today'
    : governanceInbox?.lastDigestCreatedAt
      ? 'Digest up to date'
      : 'No digest yet';
  const showGovernanceInbox = canManageQuotaRisk
    && !!governanceInbox
    && ((governanceInbox.totalItems ?? 0) > 0 || (governanceInbox.recentDigests?.length ?? 0) > 0);
  const showAutomationRuns = canManageQuotaRisk && !!automationRuns && automationRuns.length > 0;

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
        {forecastData.degraded_mode && (
          <AIDegradedNotice
            className="mb-4"
            reason={forecastData.degraded_reason}
          />
        )}
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
            <p className="text-2xl font-bold">{Math.round(revenueOpsSummary?.attainmentPercent ?? avgAttainment)}%</p>
          </div>
        </div>
        {revenueOpsSummary && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Active Revenue Owners</p>
                <p className="text-xl font-semibold">{revenueOpsSummary.activeRepCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Governed Territories</p>
                <p className="text-xl font-semibold">
                  {revenueOpsSummary.governedTerritoryCount} / {revenueOpsSummary.territoryCatalogCount}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Quarter Progress</p>
                <p className="text-xl font-semibold">{Math.round(revenueOpsSummary.quarterProgressPercent)}%</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-green-500/5">
                <p className="text-sm text-muted-foreground mb-1">On Track</p>
                <p className="text-xl font-semibold text-green-600">{revenueOpsSummary.onTrackRepCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-yellow-500/5">
                <p className="text-sm text-muted-foreground mb-1">Watch</p>
                <p className="text-xl font-semibold text-yellow-600">{revenueOpsSummary.watchRepCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-red-500/5">
                <p className="text-sm text-muted-foreground mb-1">At Risk</p>
                <p className="text-xl font-semibold text-red-600">{revenueOpsSummary.atRiskRepCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Closed vs Expected Pace</p>
                <p className="text-xl font-semibold">
                  {formatCompactCurrency(revenueOpsSummary.closedWonValue)} / {formatCompactCurrency(revenueOpsSummary.expectedClosedValueToDate)}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Projected Attainment</p>
                <p className="text-xl font-semibold">{Math.round(revenueOpsSummary.projectedAttainmentPercent)}%</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Pipeline Coverage</p>
                <p className="text-xl font-semibold">{formatCoverage(revenueOpsSummary.pipelineCoverageRatio)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Target pipeline {formatCompactCurrency(revenueOpsSummary.requiredPipelineValue)}
                </p>
              </div>
            </div>

            {(revenueOpsSummary.repsWithoutTerritory > 0 || revenueOpsSummary.outOfCatalogTerritoryCount > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-medium">Territory governance needs attention</p>
                <p className="mt-1">
                  {revenueOpsSummary.repsWithoutTerritory > 0
                    ? `${revenueOpsSummary.repsWithoutTerritory} rep${revenueOpsSummary.repsWithoutTerritory === 1 ? '' : 's'} still have no governed territory. `
                    : ''}
                  {revenueOpsSummary.outOfCatalogTerritoryCount > 0
                    ? `${revenueOpsSummary.outOfCatalogTerritoryCount} live territory label${revenueOpsSummary.outOfCatalogTerritoryCount === 1 ? '' : 's'} are outside the workspace catalog.`
                    : ''}
                </p>
              </div>
            )}
          </div>
        )}
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

      {showGovernanceInbox && governanceInbox && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Governance Inbox</h3>
              <p className="text-sm text-muted-foreground">
                A manager view of unresolved territory drift, quota risk, and SLA breaches that still need action.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {governanceInbox.slaBreachedItems} SLA breached • {governanceInbox.openActionItems} without an open task
              </div>
              <button
                onClick={() => runGovernanceAutomationMutation.mutate()}
                disabled={runGovernanceAutomationMutation.isPending}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icons.RefreshCw size={16} className={runGovernanceAutomationMutation.isPending ? 'animate-spin' : ''} />
                Run Automation Sweep
              </button>
              <button
                onClick={() => createGovernanceDigestMutation.mutate()}
                disabled={createGovernanceDigestMutation.isPending || !governanceInbox.totalItems}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icons.FileText size={16} />
                {governanceInbox.digestDue ? "Create Today's Digest" : 'Create Digest'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-9 gap-4 mb-4">
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Inbox Items</p>
              <p className="text-xl font-semibold">{governanceInbox.totalItems}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-red-500/5">
              <p className="text-sm text-muted-foreground mb-1">SLA Breached</p>
              <p className="text-xl font-semibold text-red-600">{governanceInbox.slaBreachedItems}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Territory Drift</p>
              <p className="text-xl font-semibold">{governanceInbox.territoryEscalationItems}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Quota Risk</p>
              <p className="text-xl font-semibold">{governanceInbox.quotaRiskItems}</p>
            </div>
            <div className={cn(
              "p-4 border rounded-lg",
              governanceInbox.digestDue ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Digest Cadence</p>
              <p className="text-xl font-semibold">{governanceDigestStatusLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {governanceInbox.daysSinceLastDigest != null
                  ? `Last digest ${governanceInbox.daysSinceLastDigest} day${governanceInbox.daysSinceLastDigest === 1 ? '' : 's'} ago`
                  : 'No digest has been generated yet'}
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Open Digests</p>
              <p className="text-xl font-semibold">{governanceInbox.openDigestCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {governanceInbox.lastDigestStatus ? `Latest status: ${governanceInbox.lastDigestStatus}` : 'No digest status yet'}
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Open Reviews</p>
              <p className="text-xl font-semibold">{governanceInbox.openReviewTaskCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Governance tasks still waiting for acknowledgement
              </p>
            </div>
            <div className={cn(
              "p-4 border rounded-lg",
              governanceInbox.reviewSlaStatus === 'CRITICAL'
                ? "border-red-200 bg-red-50"
                : governanceInbox.reviewSlaStatus === 'HIGH'
                  ? "border-amber-200 bg-amber-50"
                  : governanceInbox.reviewSlaStatus === 'WATCH'
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-green-200 bg-green-50"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Review SLA</p>
              <p className="text-xl font-semibold">{governanceInbox.reviewSlaStatus || 'ON_TRACK'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {governanceInbox.oldestOverdueReviewDays != null
                  ? `Oldest overdue review: ${governanceInbox.oldestOverdueReviewDays} day${governanceInbox.oldestOverdueReviewDays === 1 ? '' : 's'}`
                  : 'No overdue governance reviews'}
              </p>
            </div>
            <div className={cn(
              "p-4 border rounded-lg",
              governanceInbox.overdueReviewTaskCount > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/20"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Overdue Reviews</p>
              <p className={cn(
                "text-xl font-semibold",
                governanceInbox.overdueReviewTaskCount > 0 ? "text-red-600" : ""
              )}>
                {governanceInbox.overdueReviewTaskCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Review tasks past due and ready for escalation
              </p>
            </div>
          </div>

          {governanceInbox.overdueReviewTaskCount > 0 && (
            <div className={cn(
              "border rounded-lg p-4 mb-4",
              governanceInbox.reviewSlaStatus === 'CRITICAL'
                ? "border-red-200 bg-red-50/80"
                : governanceInbox.reviewSlaStatus === 'HIGH'
                  ? "border-amber-200 bg-amber-50/80"
                  : "border-yellow-200 bg-yellow-50/80"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium">Governance Review SLA Aging</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Overdue reviews are grouped by age so managers can spot persistent operational drift before it becomes forecast damage.
                  </p>
                </div>
                <span className={governanceReviewBadgeClasses(governanceInbox.reviewSlaStatus || undefined)}>
                  {governanceInbox.reviewSlaStatus || 'ON_TRACK'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="border border-border rounded-lg p-3 bg-card/70">
                  <p className="text-xs text-muted-foreground">Watch Reviews</p>
                  <p className="text-lg font-semibold">{governanceInbox.watchReviewCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">1-2 days overdue</p>
                </div>
                <div className="border border-border rounded-lg p-3 bg-card/70">
                  <p className="text-xs text-muted-foreground">High Reviews</p>
                  <p className="text-lg font-semibold">{governanceInbox.highReviewCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">3-4 days overdue</p>
                </div>
                <div className="border border-border rounded-lg p-3 bg-card/70">
                  <p className="text-xs text-muted-foreground">Critical Reviews</p>
                  <p className="text-lg font-semibold">{governanceInbox.criticalReviewCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">5+ days overdue</p>
                </div>
              </div>
            </div>
          )}

          {(governanceInbox.recentDigests?.length ?? 0) > 0 && (
            <div className="border border-border rounded-lg p-4 bg-muted/10 mb-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-medium">Recent Governance Digests</h4>
                  <p className="text-sm text-muted-foreground">
                    Latest digest: {formatDateTime(governanceInbox.lastDigestCreatedAt)}
                  </p>
                </div>
                {governanceInbox.digestDue ? (
                  <span className="text-xs rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    Due today
                  </span>
                ) : (
                  <span className="text-xs rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
                    Up to date
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {governanceInbox.recentDigests.map((digest) => (
                  <div key={digest.taskId} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{digest.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {digest.assignedToName || 'Unassigned'} / {formatDateTime(digest.createdAt)}
                        </p>
                      </div>
                      <span className={pacingBadgeClasses(
                        digest.status === 'COMPLETED'
                          ? 'ON_TRACK'
                          : digest.status === 'IN_PROGRESS'
                            ? 'WATCH'
                            : 'AT_RISK'
                      )}>
                        {digest.status || 'TODO'}
                      </span>
                    </div>
                    {digest.taskId && digest.status !== 'COMPLETED' ? (
                      <div className="mt-3">
                        <button
                          onClick={() => acknowledgeGovernanceTaskMutation.mutate(digest.taskId)}
                          disabled={acknowledgeGovernanceTaskMutation.isPending}
                          className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Acknowledge Digest
                        </button>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Priority</p>
                        <p className="font-medium">{digest.priority || 'MEDIUM'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Due</p>
                        <p className="font-medium">{digest.dueDate || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {governanceInbox.items.slice(0, 6).map((item) => (
              <div key={`${item.itemType}-${item.title}`} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className={item.itemType === 'TERRITORY_ESCALATION' ? escalationBadgeClasses(item.severity) : pacingBadgeClasses(item.severity)}>
                        {item.severity}
                      </span>
                      {item.slaBreached ? (
                        <span className="text-xs rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
                          SLA breached
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.itemType === 'TERRITORY_ESCALATION' ? 'Territory escalation' : 'Quota risk'} • {item.territory || 'Unassigned'} • owner {item.ownerName || 'Unknown'}
                    </p>
                  </div>
                  {item.openTaskExists ? (
                    <span className="text-xs rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
                      Task open
                    </span>
                  ) : (
                    <span className="text-xs rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                      Needs action
                    </span>
                  )}
                </div>

                {item.openTaskExists && item.openTaskId ? (
                  <div className="mt-3">
                    <button
                      onClick={() => acknowledgeGovernanceTaskMutation.mutate(item.openTaskId!)}
                      disabled={acknowledgeGovernanceTaskMutation.isPending}
                      className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Acknowledge Review
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-medium">{item.ageDays ?? 0} day{(item.ageDays ?? 0) === 1 ? '' : 's'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Summary</p>
                    <p className="font-medium">{item.summary || 'No summary'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {atRiskReps.length > 0 && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Quota Risk Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Reps who need manager attention based on quarter pace, weighted forecast, and current coverage.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {quotaRiskAlerts?.atRiskCount ?? revenueOpsSummary?.atRiskRepCount ?? 0} at risk • {quotaRiskAlerts?.watchCount ?? revenueOpsSummary?.watchRepCount ?? 0} watch
              </div>
              {canManageQuotaRisk && (
                <button
                  onClick={() => createQuotaRiskTasksMutation.mutate()}
                  disabled={createQuotaRiskTasksMutation.isPending || !(quotaRiskAlerts?.alerts?.length ?? atRiskReps.length)}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Icons.CheckSquare size={16} />
                  Create Follow-Up Tasks
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {atRiskReps.slice(0, 6).map((member: any) => (
              <div key={member.userId || member.name} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.territory || 'Unassigned'} • {member.role}
                    </p>
                  </div>
                  <span className={pacingBadgeClasses(member.pacingStatus)}>
                    {pacingLabel(member.pacingStatus)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Quarterly quota</p>
                    <p className="font-medium">{formatCompactCurrency(member.quarterlyQuota)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected by now</p>
                    <p className="font-medium">{formatCompactCurrency(member.expectedClosedValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closed won</p>
                    <p className="font-medium text-green-600">{formatCompactCurrency(member.closedWonValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                    <p className="font-medium">{formatCoverage(member.pipelineCoverageRatio)}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Projected attainment {Math.round(member.projectedAttainmentPercent ?? member.quarterlyAttainmentPercent ?? 0)}% • Required pipeline {formatCompactCurrency(member.requiredPipelineValue)}
                </div>
                {member.openTaskExists ? (
                  <div className="mt-3 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
                    Follow-up task already open
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAutomationRuns && automationRuns && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Recent Automation Runs</h3>
              <p className="text-sm text-muted-foreground">
                The latest tenant workflow executions across quota, governance, rescue, and territory operations.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {automationRuns.filter((run) => run.triggerSource === 'SCHEDULED').length} scheduled • {automationRuns.filter((run) => run.triggerSource === 'MANUAL').length} manual
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {automationRuns.map((run) => (
              <div key={run.id} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{run.automationName}</p>
                      <span className={governanceReviewBadgeClasses(run.runStatus === 'SUCCESS' ? 'ON_TRACK' : run.runStatus === 'SKIPPED' ? 'WATCH' : 'CRITICAL')}>
                        {run.runStatus}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground">
                        {run.triggerSource}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {run.summary || 'No summary recorded'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {formatDateTime(run.createdAt)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewed</p>
                    <p className="font-medium">{run.reviewedCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actions</p>
                    <p className="font-medium">{run.actionCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Covered</p>
                    <p className="font-medium">{run.alreadyCoveredCount ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManageQuotaRisk && territoryExceptions && territoryExceptions.totalExceptions > 0 && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Territory Exceptions</h3>
              <p className="text-sm text-muted-foreground">
                Cross-record territory mismatches across leads, accounts, and deals that need manager review before they create routing drift.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {territoryExceptions.totalExceptions} total • {territoryExceptions.highSeverityCount} high severity
              </div>
              <button
                onClick={() => createTerritoryExceptionTasksMutation.mutate()}
                disabled={createTerritoryExceptionTasksMutation.isPending || !territoryExceptions.totalExceptions}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icons.AlertCircle size={16} />
                Create Review Tasks
              </button>
              <button
                onClick={() => autoRemediateTerritoryExceptionsMutation.mutate()}
                disabled={autoRemediateTerritoryExceptionsMutation.isPending || !territoryExceptions.totalExceptions}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icons.CheckSquare size={16} />
                Auto-Remediate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Lead Exceptions</p>
              <p className="text-xl font-semibold">{territoryExceptions.leadExceptions}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Account Exceptions</p>
              <p className="text-xl font-semibold">{territoryExceptions.companyExceptions}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Deal Exceptions</p>
              <p className="text-xl font-semibold">{territoryExceptions.dealExceptions}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-red-500/5">
              <p className="text-sm text-muted-foreground mb-1">High Severity</p>
              <p className="text-xl font-semibold text-red-600">{territoryExceptions.highSeverityCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {territoryExceptions.exceptions.slice(0, 6).map((item) => (
              <div key={`${item.entityType}-${item.entityId}`} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className={pacingBadgeClasses(item.severity === 'HIGH' ? 'AT_RISK' : 'WATCH')}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.entityType} • {item.territory || 'No territory'} • owner {item.ownerName || 'Unassigned'}
                    </p>
                  </div>
                  {item.openTaskExists ? (
                    <span className="text-xs rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
                      Task open
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Owner territory</p>
                    <p className="font-medium">{item.ownerTerritory || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Suggested owner</p>
                    <p className="font-medium">{item.suggestedOwnerName || 'No better match yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Suggested territory</p>
                    <p className="font-medium">{item.suggestedOwnerTerritory || 'No governed match'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Impact</p>
                    <p className="font-medium">{formatCompactCurrency(item.impactValue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManageQuotaRisk && territoryEscalations && territoryEscalations.totalEscalations > 0 && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Territory Escalations</h3>
              <p className="text-sm text-muted-foreground">
                Grouped mismatch clusters that need manager attention before drift spreads into coverage and forecast problems.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {territoryEscalations.criticalCount} critical • {territoryEscalations.highCount} high • {territoryEscalations.watchCount} watch
              </div>
              <button
                onClick={() => createTerritoryEscalationTasksMutation.mutate()}
                disabled={createTerritoryEscalationTasksMutation.isPending || !territoryEscalations.totalEscalations}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icons.Bell size={16} />
                Create Manager Alerts
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 border border-border rounded-lg bg-red-500/5">
              <p className="text-sm text-muted-foreground mb-1">Critical</p>
              <p className="text-xl font-semibold text-red-600">{territoryEscalations.criticalCount}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-amber-500/5">
              <p className="text-sm text-muted-foreground mb-1">High</p>
              <p className="text-xl font-semibold text-amber-700">{territoryEscalations.highCount}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-blue-500/5">
              <p className="text-sm text-muted-foreground mb-1">Watch</p>
              <p className="text-xl font-semibold text-blue-700">{territoryEscalations.watchCount}</p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-1">Exposure</p>
              <p className="text-xl font-semibold">{formatCompactCurrency(territoryEscalations.totalPipelineExposure)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {territoryEscalations.escalations.slice(0, 6).map((item) => (
              <div key={`${item.territory}-${item.suggestedOwnerId || 'none'}`} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.territory || 'Unassigned territory'}</p>
                      <span className={escalationBadgeClasses(item.escalationLevel)}>
                        {item.escalationLevel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Suggested owner {item.suggestedOwnerName || 'Not resolved yet'} • {item.totalExceptions} exception{item.totalExceptions === 1 ? '' : 's'}
                    </p>
                  </div>
                  {item.openAlertExists ? (
                    <span className="text-xs rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
                      Alert open
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Leads / Accounts / Deals</p>
                    <p className="font-medium">{item.leadExceptions} / {item.companyExceptions} / {item.dealExceptions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">High severity</p>
                    <p className="font-medium">{item.highSeverityCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Repeated mismatches</p>
                    <p className="font-medium">{item.repeatedMismatchCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pipeline exposure</p>
                    <p className="font-medium">{formatCompactCurrency(item.pipelineExposure)}</p>
                  </div>
                </div>
              </div>
            ))}
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
                <th className="text-left p-3 text-xs font-semibold">Territory</th>
                <th className="text-left p-3 text-xs font-semibold">Quarterly Quota</th>
                <th className="text-left p-3 text-xs font-semibold">Weighted Pipeline</th>
                <th className="text-left p-3 text-xs font-semibold">Closed</th>
                <th className="text-left p-3 text-xs font-semibold">Coverage</th>
                <th className="text-left p-3 text-xs font-semibold">Projected</th>
                <th className="text-left p-3 text-xs font-semibold">Pace</th>
              </tr>
            </thead>
            <tbody>
              {(revenueOpsTeam.length > 0 ? revenueOpsTeam : teamForecasts).map((member: any) => (
                <tr key={member.userId || member.name} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{member.name}</td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{member.territory || 'Unassigned'}</span>
                      {member.governedTerritory === false ? (
                        <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                          Legacy
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-sm">{formatCompactCurrency(member.quarterlyQuota ?? member.quota)}</td>
                  <td className="p-3 text-sm text-blue-600">{formatCompactCurrency(member.weightedPipelineValue ?? member.forecast)}</td>
                  <td className="p-3 text-sm text-green-600">{formatCompactCurrency(member.closedWonValue ?? member.closed)}</td>
                  <td className="p-3">
                    <span className={cn(
                      "text-xs px-2 py-1 border rounded-full",
                      (member.pipelineCoverageRatio ?? 0) >= 1 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      (member.pipelineCoverageRatio ?? 0) >= 0.7 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                      "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      {formatCoverage(member.pipelineCoverageRatio)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">
                        {Math.round(member.projectedAttainmentPercent ?? member.quarterlyAttainmentPercent ?? member.attainment ?? 0)}%
                      </span>
                      {member.expectedClosedValue != null ? (
                        <p className="text-xs text-muted-foreground">
                          Expected by now {formatCompactCurrency(member.expectedClosedValue)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={pacingBadgeClasses(member.pacingStatus)}>
                      {pacingLabel(member.pacingStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {territorySummaries.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Territory Coverage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {territorySummaries.map((territory) => (
                <div key={territory.territory} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{territory.territory}</h4>
                    <div className="flex items-center gap-2">
                      {!territory.governed ? (
                        <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                          Out of Catalog
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{territory.repCount} rep{territory.repCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Quota</span>
                      <span>{formatCompactCurrency(territory.quarterlyQuota)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Weighted pipeline</span>
                      <span>{formatCompactCurrency(territory.weightedPipelineValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Closed</span>
                      <span>{formatCompactCurrency(territory.closedWonValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Coverage</span>
                      <span>{formatCoverage(territory.pipelineCoverageRatio)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Projected</span>
                      <span>{Math.round(territory.projectedAttainmentPercent)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pace</span>
                      <span className={pacingBadgeClasses(territory.pacingStatus)}>
                        {pacingLabel(territory.pacingStatus)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>On track {territory.onTrackRepCount}</span>
                      <span>Watch {territory.watchRepCount}</span>
                      <span>At risk {territory.atRiskRepCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
