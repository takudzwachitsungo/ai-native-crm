import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { AIDegradedNotice } from '../components/AIDegradedNotice';
import { forecastingApi } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { exportToCSV } from '../lib/helpers';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';
import type { ForecastSubmissionSummary } from '../lib/types';

type ForecastCategory = 'COMMIT' | 'BEST_CASE' | 'UPSIDE';

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

const formatPercent = (value: number | null | undefined) => `${Math.round(value ?? 0)}%`;

const formatVariance = (value: number | null | undefined) => {
  const amount = value ?? 0;
  return `${amount >= 0 ? '+' : ''}${formatCompactCurrency(amount)}`;
};

const categoryCardClasses = (isSelected: boolean) =>
  cn(
    'rounded-xl border px-3 py-2.5 transition-colors',
    isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
  );

export default function Forecasting() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [forecastCategory, setForecastCategory] = useState<ForecastCategory>('COMMIT');
  const [managerAdjustmentPercent, setManagerAdjustmentPercent] = useState(0);
  const [submissionTitle, setSubmissionTitle] = useState('Weekly forecast submission');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionReviewNotes, setSubmissionReviewNotes] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<ForecastSubmissionSummary[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionReviewingId, setSubmissionReviewingId] = useState<string | null>(null);

  const syncForecastState = (data: any) => {
    setForecastData(data);
    setCacheAge(data.cache_age_seconds || 0);
    setLastUpdate(data.generated_at || null);
    setForecastCategory((data.selected_forecast_category as ForecastCategory) || 'COMMIT');
    setManagerAdjustmentPercent(data.manager_adjustment_percent || 0);
    setError(null);
  };

  const loadCachedForecast = async () => {
    try {
      const data = await forecastingApi.getLatest();
      if (data.success) {
        syncForecastState(data);
      } else {
        setError(data.error || 'No cached forecast available');
      }
    } catch (err) {
      console.error('Error loading cached forecast:', err);
      await loadForecast();
    }
  };

  const loadSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const response = await forecastingApi.listSubmissions();
      if (response.success) {
        setSubmissions(response.submissions || []);
      }
    } catch (err) {
      console.error('Error loading forecast submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const loadForecast = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await forecastingApi.generate({
        forecastMonths: 6,
        forecastCategory,
        managerAdjustmentPercent,
        snapshotLabel: `${forecastCategory} refresh`,
      });
      if (data.success) {
        syncForecastState({ ...data, cache_age_seconds: 0, generated_at: new Date().toISOString() });
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
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadCachedForecast(), loadSubmissions()]);
      setIsLoading(false);
    };
    init();

    const interval = setInterval(() => {
      loadCachedForecast();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmitForecast = async () => {
    try {
      setSubmissionSaving(true);
      const created = await forecastingApi.submitForReview({
        title: submissionTitle.trim() || `${forecastCategory} forecast submission`,
        forecastMonths: 6,
        forecastCategory,
        managerAdjustmentPercent,
        snapshotLabel: `${forecastCategory} submission`,
        notes: submissionNotes.trim() || undefined,
      });
      setSubmissions((prev) => [created, ...prev]);
      setSubmissionNotes('');
      showToast('Forecast submitted for review', 'success');
    } catch (err) {
      console.error('Error submitting forecast for review:', err);
      showToast('Failed to submit forecast for review', 'error');
    } finally {
      setSubmissionSaving(false);
    }
  };

  const handleReviewSubmission = async (
    submissionId: string,
    status: 'APPROVED' | 'CHANGES_REQUESTED'
  ) => {
    try {
      setSubmissionReviewingId(submissionId);
      const updated = await forecastingApi.reviewSubmission(submissionId, {
        status,
        reviewNotes: submissionReviewNotes[submissionId]?.trim() || undefined,
      });
      setSubmissions((prev) => prev.map((item) => (item.id === submissionId ? updated : item)));
      showToast(
        status === 'APPROVED' ? 'Forecast approved' : 'Forecast sent back for changes',
        'success'
      );
    } catch (err) {
      console.error('Error reviewing forecast submission:', err);
      showToast('Failed to review forecast submission', 'error');
    } finally {
      setSubmissionReviewingId(null);
    }
  };

  const monthlyForecasts = forecastData?.monthly_forecasts || [];
  const teamForecasts = forecastData?.team_forecasts || [];
  const rollupHierarchy = forecastData?.rollup_hierarchy || [];
  const categoryBreakdown = forecastData?.forecast_categories || [];
  const totalQuota = forecastData?.total_quota ?? 0;
  const finalForecast = forecastData?.final_forecast ?? 0;
  const baseForecast = forecastData?.base_forecast ?? 0;
  const weightedPipeline = forecastData?.weighted_pipeline ?? 0;
  const totalClosed = forecastData?.closed_revenue ?? teamForecasts.reduce((sum: number, member: any) => sum + (member.closed ?? 0), 0);
  const avgAttainment = teamForecasts.length > 0
    ? teamForecasts.reduce((sum: number, member: any) => sum + (member.attainment ?? 0), 0) / teamForecasts.length
    : 0;
  const priorVariance = forecastData?.variance_to_prior;
  const snapshotHistory = forecastData?.snapshot_history || [];

  const forecastSummary = useMemo(() => ({
    quotaAttainment: totalQuota > 0 ? (finalForecast / totalQuota) * 100 : 0,
    closedAttainment: totalQuota > 0 ? (totalClosed / totalQuota) * 100 : 0,
  }), [finalForecast, totalClosed, totalQuota]);

  if (isLoading) {
    return (
      <PageLayout
        title="Forecasting"
        subtitle="Forecast categories, snapshots, and rollup hierarchy"
        icon={<Icons.TrendingUp size={20} />}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-5 lg:px-6">
          <LoadingSkeleton count={6} height={64} />
        </div>
      </PageLayout>
    );
  }

  if (error || !forecastData) {
    return (
      <PageLayout
        title="Forecasting"
        subtitle="Forecast categories, snapshots, and rollup hierarchy"
        icon={<Icons.TrendingUp size={20} />}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-5 lg:px-6">
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

  return (
    <PageLayout
      title="Forecasting"
      subtitle="Forecast categories, snapshots, and rollup hierarchy"
      icon={<Icons.TrendingUp size={20} />}
      actions={(
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {cacheAge !== null && cacheAge < 60 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              ) : (
                <span>Updated {cacheAge ? Math.floor(cacheAge / 60) : 0}m ago</span>
              )}
            </div>
          )}
          <button
            onClick={loadForecast}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:opacity-50"
          >
            <Icons.RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              if (monthlyForecasts.length > 0) {
                exportToCSV(
                  monthlyForecasts,
                  [
                    { header: 'Month', accessor: 'month' },
                    { header: 'Month Date', accessor: 'month_date' },
                    { header: 'Pipeline', accessor: 'pipeline' },
                    { header: 'Base Forecast', accessor: 'base_forecast' },
                    { header: 'Scenario Forecast', accessor: 'forecast' },
                    { header: 'Actual', accessor: 'actual' },
                    { header: 'Quota', accessor: 'quota' },
                  ],
                  'forecast-outlook-v2'
                );
              }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Icons.Download size={14} />
            Export Forecast
          </button>
        </div>
      )}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-4 sm:px-5 lg:px-6">
        {forecastData.degraded_mode && (
          <AIDegradedNotice reason={forecastData.degraded_reason} />
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Forecast Controls</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a forecast scenario and apply a manager adjustment before refreshing the model.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['COMMIT', 'BEST_CASE', 'UPSIDE'] as ForecastCategory[]).map((category) => {
                const categoryData = categoryBreakdown.find((item: any) => item.category === category);
                return (
                  <button
                    key={category}
                    onClick={() => setForecastCategory(category)}
                    className={categoryCardClasses(forecastCategory === category)}
                  >
                    <div className="text-xs text-muted-foreground">{category.replace('_', ' ')}</div>
                    <div className="text-xl font-semibold mt-1">
                      {formatCompactCurrency(categoryData?.forecast)}
                    </div>
                    <div className="text-xs mt-2 text-muted-foreground">
                      {formatVariance(categoryData?.variance_to_quota)} vs quota
                    </div>
                  </button>
                );
              })}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Manager Adjustment</label>
                <span className="text-sm text-muted-foreground">{managerAdjustmentPercent}%</span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={managerAdjustmentPercent}
                onChange={(event) => setManagerAdjustmentPercent(Number(event.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Snapshot Variance</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Compare the current forecast against the previous saved run.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground">Current Forecast</div>
                <div className="text-lg font-bold mt-1">{formatCompactCurrency(finalForecast)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Base {formatCompactCurrency(baseForecast)} with {managerAdjustmentPercent}% adjustment
                </div>
              </div>
              <div className="px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground">Prior Snapshot</div>
                {priorVariance ? (
                  <>
                    <div className={cn(
                      'text-lg font-bold mt-1',
                      (priorVariance.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatVariance(priorVariance.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {priorVariance.percent >= 0 ? '+' : ''}{priorVariance.percent}% vs {priorVariance.prior_snapshot_label || 'prior snapshot'}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1">No prior snapshot yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Forecast Review Workflow</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Submit a scenario snapshot for manager review, then track approval or change requests against the saved forecast state.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Submission Title</label>
                <input
                  type="text"
                  value={submissionTitle}
                  onChange={(event) => setSubmissionTitle(event.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Scenario Summary</label>
                <div className="px-3 py-2 border border-border rounded-full bg-muted/30 text-sm text-muted-foreground">
                  {forecastCategory.replace('_', ' ')} with {managerAdjustmentPercent}% adjustment
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                rows={4}
                value={submissionNotes}
                onChange={(event) => setSubmissionNotes(event.target.value)}
                placeholder="Capture assumptions, risks, or manager context for this submission."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">
                The submitted snapshot stores the selected forecast, quota variance, prior variance, and current hierarchy rollup.
              </div>
              <button
                onClick={handleSubmitForecast}
                disabled={submissionSaving}
                className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {submissionSaving ? 'Submitting...' : 'Submit For Review'}
              </button>
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Submission Queue</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Review saved forecast submissions and keep an audit trail for approval decisions.
                </p>
              </div>
              <button
                onClick={() => void loadSubmissions()}
                className="inline-flex h-8 items-center rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
              >
                Refresh Queue
              </button>
            </div>
            {submissionsLoading ? (
              <LoadingSkeleton count={3} height={88} />
            ) : submissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No forecast submissions yet. Submit the current scenario to start the review cycle.
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-auto pr-1">
                {submissions.map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{submission.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {submission.forecast_category.replace('_', ' ')} • {submission.manager_adjustment_percent}% adjustment • {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          submission.status === 'APPROVED'
                            ? 'bg-green-500/10 text-green-700'
                            : submission.status === 'CHANGES_REQUESTED'
                              ? 'bg-amber-500/10 text-amber-700'
                              : 'bg-blue-500/10 text-blue-700'
                        )}
                      >
                        {submission.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">Submitted Forecast</div>
                        <div className="font-semibold mt-1">{formatCompactCurrency(submission.forecast_snapshot?.final_forecast)}</div>
                      </div>
                      <div className="rounded-xl bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">Quota Variance</div>
                        <div className="font-semibold mt-1">{formatVariance(submission.forecast_snapshot?.forecast_vs_quota)}</div>
                      </div>
                    </div>
                    {submission.notes && (
                      <div className="text-sm text-muted-foreground">{submission.notes}</div>
                    )}
                    <textarea
                      rows={2}
                      value={submissionReviewNotes[submission.id] ?? submission.review_notes ?? ''}
                      onChange={(event) =>
                        setSubmissionReviewNotes((prev) => ({
                          ...prev,
                          [submission.id]: event.target.value,
                        }))
                      }
                      placeholder="Add review notes for approval or requested changes"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => void handleReviewSubmission(submission.id, 'CHANGES_REQUESTED')}
                        disabled={submissionReviewingId === submission.id}
                        className="inline-flex h-8 items-center rounded-full border border-amber-500/30 px-3 text-xs font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-60 transition-colors"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => void handleReviewSubmission(submission.id, 'APPROVED')}
                        disabled={submissionReviewingId === submission.id}
                        className="inline-flex h-8 items-center rounded-full bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="px-3 py-2 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Quota</p>
            <p className="text-lg font-bold">{formatCompactCurrency(totalQuota)}</p>
          </div>
          <div className="px-3 py-2 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Selected Forecast</p>
            <p className="text-lg font-bold text-blue-600">{formatCompactCurrency(finalForecast)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(forecastSummary.quotaAttainment)} of quota</p>
          </div>
          <div className="px-3 py-2 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Weighted Pipeline</p>
            <p className="text-lg font-bold">{formatCompactCurrency(weightedPipeline)}</p>
          </div>
          <div className="px-3 py-2 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Closed Revenue</p>
            <p className="text-lg font-bold text-green-600">{formatCompactCurrency(totalClosed)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(forecastSummary.closedAttainment)} of quota</p>
          </div>
          <div className="px-3 py-2 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Avg Attainment</p>
            <p className="text-lg font-bold">{formatPercent(avgAttainment)}</p>
          </div>
        </div>

        <div className="border border-border rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Forecast Trend</h3>
              <p className="text-sm text-muted-foreground">
                Scenario-adjusted forecast, actuals, and quota pacing across the next six months.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {monthlyForecasts.length} month{monthlyForecasts.length === 1 ? '' : 's'}
            </span>
          </div>

          {monthlyForecasts.length > 0 ? (
            <>
              <div className="space-y-4">
                {monthlyForecasts.map((data: any) => {
                  const maxValue = Math.max(data.pipeline || 0, data.quota || 0, data.forecast || 0, data.actual || 0, 1);
                  return (
                    <div key={data.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{data.month}</span>
                        <span className="text-muted-foreground">
                          Scenario {formatCompactCurrency(data.forecast)} / Base {formatCompactCurrency(data.base_forecast)} / Quota {formatCompactCurrency(data.quota)}
                        </span>
                      </div>
                      <div className="relative h-8 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-purple-500/20"
                          style={{ width: `${((data.pipeline || 0) / maxValue) * 100}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-400/40"
                          style={{ width: `${((data.base_forecast || 0) / maxValue) * 100}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500/45"
                          style={{ width: `${((data.forecast || 0) / maxValue) * 100}%` }}
                        />
                        {data.actual > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 bg-green-500"
                            style={{ width: `${((data.actual || 0) / maxValue) * 100}%` }}
                          />
                        )}
                        <div
                          className="absolute inset-y-0 border-r-2 border-dashed border-gray-500"
                          style={{ left: `${((data.quota || 0) / maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-6 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500/20 rounded" />
                  <span>Pipeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-400/40 rounded" />
                  <span>Base Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500/45 rounded" />
                  <span>Scenario Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 border-t-2 border-dashed border-gray-500" />
                  <span>Quota</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">No monthly forecast data available.</p>
          )}
        </div>

        {(forecastData.insights?.length > 0 || forecastData.recommendations?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {forecastData.insights?.length > 0 && (
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icons.Sparkles size={20} className="text-blue-600" />
                  Forecast Insights
                </h3>
                <div className="space-y-3">
                  {forecastData.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <Icons.TrendingUp size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{renderMarkdownText(insight)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {forecastData.recommendations?.length > 0 && (
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icons.CheckCircle size={20} className="text-green-600" />
                  Recommended Actions
                </h3>
                <div className="space-y-3">
                  {forecastData.recommendations.map((recommendation: string, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <Icons.ArrowRight size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{renderMarkdownText(recommendation)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(forecastData.risks?.length > 0 || forecastData.opportunities?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {forecastData.risks?.length > 0 && (
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">At-Risk Deals</h3>
                <div className="space-y-3">
                  {forecastData.risks.map((risk: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{risk.title}</span>
                        <span className="text-sm font-bold text-red-600">{formatCompactCurrency(risk.value)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{risk.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {forecastData.opportunities?.length > 0 && (
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-600">Top Opportunities</h3>
                <div className="space-y-3">
                  {forecastData.opportunities.map((opp: any, idx: number) => (
                    <div key={idx} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{opp.title}</span>
                        <span className="text-sm font-bold text-green-600">{formatCompactCurrency(opp.value)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{opp.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold">Forecast Rollup Hierarchy</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Workspace, manager, and owner forecast rollups for the active scenario.
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold">Level</th>
                <th className="text-left p-3 text-xs font-semibold">Quota</th>
                <th className="text-left p-3 text-xs font-semibold">Forecast</th>
                <th className="text-left p-3 text-xs font-semibold">Closed</th>
                <th className="text-left p-3 text-xs font-semibold">Pipeline</th>
                <th className="text-left p-3 text-xs font-semibold">Attainment</th>
              </tr>
            </thead>
            <tbody>
              {rollupHierarchy.length > 0 ? rollupHierarchy.map((node: any) => {
                const indent = node.level === 'MANAGER' ? 'pl-6' : node.level === 'OWNER' ? 'pl-12' : '';
                return (
                  <tr key={node.id} className="border-t border-border hover:bg-muted/20">
                    <td className={cn('p-3 text-sm font-medium', indent)}>
                      <div className="flex items-center gap-2">
                        {node.level === 'TEAM' && <Icons.Building2 size={16} className="text-primary" />}
                        {node.level === 'MANAGER' && <Icons.Users size={16} className="text-blue-600" />}
                        {node.level === 'OWNER' && <Icons.User size={16} className="text-muted-foreground" />}
                        <span>{node.label}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{formatCompactCurrency(node.quota)}</td>
                    <td className="p-3 text-sm text-blue-600">{formatCompactCurrency(node.forecast)}</td>
                    <td className="p-3 text-sm text-green-600">{formatCompactCurrency(node.closed)}</td>
                    <td className="p-3 text-sm">{formatCompactCurrency(node.pipeline)}</td>
                    <td className="p-3 text-sm">{formatPercent(node.attainment)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No forecast hierarchy available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold">Snapshot History</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recent forecast runs for this workspace and user scope.
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold">Generated</th>
                <th className="text-left p-3 text-xs font-semibold">Label</th>
                <th className="text-left p-3 text-xs font-semibold">Category</th>
                <th className="text-left p-3 text-xs font-semibold">Adjustment</th>
                <th className="text-left p-3 text-xs font-semibold">Forecast</th>
                <th className="text-left p-3 text-xs font-semibold">Quota</th>
              </tr>
            </thead>
            <tbody>
              {snapshotHistory.length > 0 ? [...snapshotHistory].reverse().map((snapshot: any, idx: number) => (
                <tr key={`${snapshot.generated_at}-${idx}`} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 text-sm">{new Date(snapshot.generated_at).toLocaleString()}</td>
                  <td className="p-3 text-sm">{snapshot.snapshot_label}</td>
                  <td className="p-3 text-sm">{snapshot.forecast_category.replace('_', ' ')}</td>
                  <td className="p-3 text-sm">{snapshot.manager_adjustment_percent}%</td>
                  <td className="p-3 text-sm text-blue-600">{formatCompactCurrency(snapshot.final_forecast)}</td>
                  <td className="p-3 text-sm">{formatCompactCurrency(snapshot.quota)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No snapshot history available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
