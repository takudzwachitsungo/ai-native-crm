import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { dashboardApi } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';

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
    'text-xs px-2 py-1 border rounded-full',
    status === 'ON_TRACK'
      ? 'bg-green-500/10 text-green-600 border-green-500/20'
      : status === 'WATCH'
        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
        : status === 'AT_RISK'
          ? 'bg-red-500/10 text-red-600 border-red-500/20'
          : 'bg-muted text-muted-foreground border-border'
  );

const escalationBadgeClasses = (level?: string) =>
  cn(
    'text-xs px-2 py-1 border rounded-full',
    level === 'CRITICAL'
      ? 'bg-red-500/10 text-red-600 border-red-500/20'
      : level === 'HIGH'
        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
        : 'bg-blue-500/10 text-blue-700 border-blue-500/20'
  );

export default function RevenueOps() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const revenueOpsSummaryQuery = useQuery({
    queryKey: ['revenue-ops-summary'],
    queryFn: () => dashboardApi.getRevenueOpsSummary(),
    staleTime: 30000,
    enabled: canManage,
  });

  const quotaRiskAlertsQuery = useQuery({
    queryKey: ['quota-risk-alerts'],
    queryFn: () => dashboardApi.getQuotaRiskAlerts(),
    staleTime: 30000,
    enabled: canManage,
  });

  const territoryExceptionsQuery = useQuery({
    queryKey: ['territory-exceptions'],
    queryFn: () => dashboardApi.getTerritoryExceptions(),
    staleTime: 30000,
    enabled: canManage,
  });

  const territoryEscalationsQuery = useQuery({
    queryKey: ['territory-escalations'],
    queryFn: () => dashboardApi.getTerritoryEscalations(),
    staleTime: 30000,
    enabled: canManage,
  });

  const governanceInboxQuery = useQuery({
    queryKey: ['governance-inbox'],
    queryFn: () => dashboardApi.getGovernanceInbox(),
    staleTime: 30000,
    enabled: canManage,
  });

  const automationRunsQuery = useQuery({
    queryKey: ['automation-runs'],
    queryFn: () => dashboardApi.getAutomationRuns(8),
    staleTime: 30000,
    enabled: canManage,
  });

  const refreshOpsData = () => {
    queryClient.invalidateQueries({ queryKey: ['revenue-ops-summary'] });
    queryClient.invalidateQueries({ queryKey: ['quota-risk-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['territory-exceptions'] });
    queryClient.invalidateQueries({ queryKey: ['territory-escalations'] });
    queryClient.invalidateQueries({ queryKey: ['governance-inbox'] });
    queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
  };

  const createQuotaRiskTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runQuotaRiskAlertAutomation(),
    onSuccess: (result) => {
      refreshOpsData();
      showToast(`Created ${result.tasksCreated} quota-risk follow-up task${result.tasksCreated === 1 ? '' : 's'}.`, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create quota risk tasks', 'error');
    },
  });

  const createTerritoryExceptionTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryExceptionAutomation(),
    onSuccess: (result) => {
      refreshOpsData();
      showToast(`Created ${result.tasksCreated} territory review task${result.tasksCreated === 1 ? '' : 's'}.`, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create territory review tasks', 'error');
    },
  });

  const autoRemediateTerritoryExceptionsMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryAutoRemediation(),
    onSuccess: (result) => {
      refreshOpsData();
      showToast(
        `Reassigned ${result.leadsReassigned} lead${result.leadsReassigned === 1 ? '' : 's'}, ${result.companiesReassigned} account${result.companiesReassigned === 1 ? '' : 's'}, and ${result.dealsReassigned} deal${result.dealsReassigned === 1 ? '' : 's'}.`,
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to auto-remediate territory exceptions', 'error');
    },
  });

  const createTerritoryEscalationTasksMutation = useMutation({
    mutationFn: () => dashboardApi.runTerritoryEscalationAutomation(),
    onSuccess: (result) => {
      refreshOpsData();
      showToast(`Created ${result.tasksCreated} territory escalation alert${result.tasksCreated === 1 ? '' : 's'}.`, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create territory escalation alerts', 'error');
    },
  });

  const createGovernanceDigestMutation = useMutation({
    mutationFn: () => dashboardApi.runGovernanceDigestAutomation(),
    onSuccess: (result) => {
      refreshOpsData();
      showToast(
        result.digestsCreated > 0 ? `Created ${result.digestsCreated} governance digest task.` : 'Governance digest already exists for today.',
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
      refreshOpsData();
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
    onSuccess: () => {
      refreshOpsData();
      showToast('Governance task acknowledged.', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to acknowledge governance task', 'error');
    },
  });

  if (!canManage) {
    return (
      <PageLayout
        title="Revenue Ops"
        subtitle="Quota, territory, and governance operations"
        icon={<Icons.Gauge size={20} />}
      >
        <div className="p-6">
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold">Manager access required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Revenue operations and governance controls are available to managers and workspace admins.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isLoading =
    revenueOpsSummaryQuery.isLoading
    || quotaRiskAlertsQuery.isLoading
    || territoryExceptionsQuery.isLoading
    || territoryEscalationsQuery.isLoading
    || governanceInboxQuery.isLoading;

  if (isLoading) {
    return (
      <PageLayout
        title="Revenue Ops"
        subtitle="Quota, territory, and governance operations"
        icon={<Icons.Gauge size={20} />}
      >
        <div className="p-6">
          <LoadingSkeleton count={8} height={72} />
        </div>
      </PageLayout>
    );
  }

  const revenueOpsSummary = revenueOpsSummaryQuery.data;
  const quotaRiskAlerts = quotaRiskAlertsQuery.data;
  const territoryExceptions = territoryExceptionsQuery.data;
  const territoryEscalations = territoryEscalationsQuery.data;
  const governanceInbox = governanceInboxQuery.data;
  const automationRuns = automationRunsQuery.data ?? [];

  return (
    <PageLayout
      title="Revenue Ops"
      subtitle="Quota, territory, and governance operations"
      icon={<Icons.Gauge size={20} />}
      actions={(
        <button
          onClick={refreshOpsData}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
        >
          <Icons.RefreshCw size={16} />
          Refresh Ops View
        </button>
      )}
    >
      <div className="p-6 space-y-6">
        {revenueOpsSummary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Active Owners</p>
                <p className="text-xl font-semibold">{revenueOpsSummary.activeRepCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Governed Territories</p>
                <p className="text-xl font-semibold">{revenueOpsSummary.governedTerritoryCount} / {revenueOpsSummary.territoryCatalogCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Quarterly Quota</p>
                <p className="text-xl font-semibold">{formatCompactCurrency(revenueOpsSummary.totalQuarterlyQuota)}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Closed vs Expected</p>
                <p className="text-xl font-semibold">
                  {formatCompactCurrency(revenueOpsSummary.closedWonValue)} / {formatCompactCurrency(revenueOpsSummary.expectedClosedValueToDate)}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Projected Attainment</p>
                <p className="text-xl font-semibold">{Math.round(revenueOpsSummary.projectedAttainmentPercent)}%</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground mb-1">Pipeline Coverage</p>
                <p className="text-xl font-semibold">{formatCoverage(revenueOpsSummary.pipelineCoverageRatio)}</p>
              </div>
            </div>
          </>
        )}

        {revenueOpsSummary?.territorySummaries?.length ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Territory Coverage</h3>
                <p className="text-sm text-muted-foreground">Governed territory performance and pipeline health.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {revenueOpsSummary.territorySummaries.slice(0, 6).map((territory) => (
                <div key={territory.territory} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{territory.territory || 'Unassigned'}</p>
                      <p className="text-sm text-muted-foreground mt-1">{territory.repCount} owner{territory.repCount === 1 ? '' : 's'}</p>
                    </div>
                    <span className={pacingBadgeClasses(territory.pacingStatus)}>{territory.pacingStatus}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Quota</p>
                      <p className="font-medium">{formatCompactCurrency(territory.quarterlyQuota)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline</p>
                      <p className="font-medium">{formatCompactCurrency(territory.pipelineValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Closed</p>
                      <p className="font-medium">{formatCompactCurrency(territory.closedWonValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="font-medium">{formatCoverage(territory.pipelineCoverageRatio)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {quotaRiskAlerts?.alerts?.length ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Quota Risk Alerts</h3>
                <p className="text-sm text-muted-foreground">Owners who need manager attention based on pace and coverage.</p>
              </div>
              <button
                onClick={() => createQuotaRiskTasksMutation.mutate()}
                disabled={createQuotaRiskTasksMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Icons.CheckSquare size={16} />
                Create Follow-Up Tasks
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quotaRiskAlerts.alerts.slice(0, 6).map((member) => (
                <div key={member.userId} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{member.territory || 'Unassigned'} · {member.role}</p>
                    </div>
                    <span className={pacingBadgeClasses(member.pacingStatus)}>{member.pacingStatus}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Quota</p>
                      <p className="font-medium">{formatCompactCurrency(member.quarterlyQuota)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="font-medium">{formatCoverage(member.pipelineCoverageRatio)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {territoryExceptions?.totalExceptions ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Territory Exceptions</h3>
                <p className="text-sm text-muted-foreground">Cross-record mismatches that need review before they affect routing quality.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createTerritoryExceptionTasksMutation.mutate()}
                  disabled={createTerritoryExceptionTasksMutation.isPending}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Create Review Tasks
                </button>
                <button
                  onClick={() => autoRemediateTerritoryExceptionsMutation.mutate()}
                  disabled={autoRemediateTerritoryExceptionsMutation.isPending}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  Auto-Remediate
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {territoryExceptions.exceptions.slice(0, 6).map((item) => (
                <div key={`${item.entityType}-${item.entityId}`} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.entityType} · {item.territory || 'No territory'}</p>
                    </div>
                    <span className={pacingBadgeClasses(item.severity === 'HIGH' ? 'AT_RISK' : 'WATCH')}>{item.severity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-medium">{item.ownerName || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Suggested</p>
                      <p className="font-medium">{item.suggestedOwnerName || 'No governed match'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {territoryEscalations?.totalEscalations ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Territory Escalations</h3>
                <p className="text-sm text-muted-foreground">Grouped mismatch clusters that need manager intervention.</p>
              </div>
              <button
                onClick={() => createTerritoryEscalationTasksMutation.mutate()}
                disabled={createTerritoryEscalationTasksMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create Manager Alerts
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {territoryEscalations.escalations.slice(0, 6).map((item) => (
                <div key={`${item.territory}-${item.suggestedOwnerId || 'none'}`} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.territory || 'Unassigned territory'}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.totalExceptions} exception{item.totalExceptions === 1 ? '' : 's'}</p>
                    </div>
                    <span className={escalationBadgeClasses(item.escalationLevel)}>{item.escalationLevel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Suggested owner</p>
                      <p className="font-medium">{item.suggestedOwnerName || 'Not resolved yet'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exposure</p>
                      <p className="font-medium">{formatCompactCurrency(item.pipelineExposure)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {governanceInbox ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Governance Inbox</h3>
                <p className="text-sm text-muted-foreground">Digest cadence, unresolved items, and overdue reviews.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runGovernanceAutomationMutation.mutate()}
                  disabled={runGovernanceAutomationMutation.isPending}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  Run Automation Sweep
                </button>
                <button
                  onClick={() => createGovernanceDigestMutation.mutate()}
                  disabled={createGovernanceDigestMutation.isPending}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {governanceInbox.digestDue ? "Create Today's Digest" : 'Create Digest'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Inbox Items</p>
                <p className="text-xl font-semibold">{governanceInbox.totalItems}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-red-500/5">
                <p className="text-sm text-muted-foreground mb-1">SLA Breached</p>
                <p className="text-xl font-semibold text-red-600">{governanceInbox.slaBreachedItems}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Open Reviews</p>
                <p className="text-xl font-semibold">{governanceInbox.openReviewTaskCount}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-1">Last Digest</p>
                <p className="text-sm font-medium">{formatDateTime(governanceInbox.lastDigestCreatedAt)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {governanceInbox.items.slice(0, 6).map((item) => (
                <div key={`${item.itemType}-${item.title}`} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.summary || 'No summary available'}</p>
                    </div>
                    <span className={item.itemType === 'TERRITORY_ESCALATION' ? escalationBadgeClasses(item.severity) : pacingBadgeClasses(item.severity)}>
                      {item.severity}
                    </span>
                  </div>
                  {item.openTaskExists && item.openTaskId ? (
                    <button
                      onClick={() => acknowledgeGovernanceTaskMutation.mutate(item.openTaskId!)}
                      disabled={acknowledgeGovernanceTaskMutation.isPending}
                      className="mt-3 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      Acknowledge Review
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {automationRuns.length ? (
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Recent Automation Runs</h3>
                <p className="text-sm text-muted-foreground">Latest tenant workflow executions across revenue and governance operations.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {automationRuns.map((run) => (
                <div key={run.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{run.automationName}</p>
                        <span className={pacingBadgeClasses(run.runStatus === 'SUCCESS' ? 'ON_TRACK' : run.runStatus === 'SKIPPED' ? 'WATCH' : 'AT_RISK')}>
                          {run.runStatus}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{run.summary || 'No summary recorded'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(run.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
