import { useEffect, useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { useToast } from '../components/Toast';
import {
  executeAIAction,
  createAIActionApproval,
  getAIActionApprovals,
  getAIAuditEvents,
  getAIGovernanceCapabilities,
  getAIGovernanceSummary,
  getInsightInbox,
  getInsights,
  getRagIndexStatus,
  getRagSchedulerStatus,
  proposeAIAction,
  runRagSchedulerNow,
  reviewAIActionApproval,
  updateInsightLifecycle,
  type AIActionApproval,
  type AIActionProposal,
  type AIAuditEvent,
  type AIGovernanceCapabilities,
  type AIGovernanceSummary,
  type Insight,
} from '../lib/ai-api';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function severityClass(severity: Insight['severity']) {
  switch (severity) {
    case 'error':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'success':
      return 'border-green-200 bg-green-50 text-green-700';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700';
  }
}

function approvalStatusClass(status: AIActionApproval['status']) {
  switch (status) {
    case 'approved':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

const EMAIL_DRAFT_ACTIONS = new Set([
  'draft_email',
  'draft_proposal_email',
  'draft_case_response_email',
  'draft_contract_renewal_email',
]);

export default function AIGovernance() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<AIGovernanceCapabilities | null>(null);
  const [summary, setSummary] = useState<AIGovernanceSummary | null>(null);
  const [auditEvents, setAuditEvents] = useState<AIAuditEvent[]>([]);
  const [approvals, setApprovals] = useState<AIActionApproval[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [inboxInsights, setInboxInsights] = useState<Insight[]>([]);
  const [inboxSummary, setInboxSummary] = useState<{
    total: number;
    active: number;
    assigned: number;
    snoozed: number;
    dismissed: number;
    by_severity: Record<string, number>;
    by_entity_type: Record<string, number>;
  } | null>(null);
  const [ragIndexStatus, setRagIndexStatus] = useState<{
    counts: Record<string, number>;
    total: number;
    domains: string[];
  } | null>(null);
  const [ragSchedulerStatus, setRagSchedulerStatus] = useState<{
    enabled: boolean;
    configured: boolean;
    running: boolean;
    last_run_at?: string | null;
    last_success_at?: string | null;
    last_failure_at?: string | null;
    last_result?: {
      total_indexed?: number;
      errors?: Record<string, string>;
    } | null;
    last_error?: string | Record<string, string> | null;
    run_count: number;
    failure_count: number;
    configured_domains: string[];
    configured_limit: number;
    interval_seconds: number;
    token_rotation?: {
      status: string;
      expires_at?: string | null;
      rotation_required: boolean;
      rotation_warning: boolean;
      warning_days: number;
      warning_at?: string | null;
    };
    total_indexed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditType, setAuditType] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [includeInactiveInsights, setIncludeInactiveInsights] = useState(false);
  const [inboxStatus, setInboxStatus] = useState('');
  const [actionType, setActionType] = useState('create_task');
  const [actionIntent, setActionIntent] = useState('');
  const [draftRecipient, setDraftRecipient] = useState('');
  const [actionPayloadJson, setActionPayloadJson] = useState('');
  const [pendingProposal, setPendingProposal] = useState<AIActionProposal | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);
  const [ragIndexing, setRagIndexing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [nextCapabilities, nextSummary, nextAuditEvents, nextApprovals, nextInsights, nextInbox, nextRagStatus, nextRagSchedulerStatus] = await Promise.all([
        getAIGovernanceCapabilities(),
        getAIGovernanceSummary(),
        getAIAuditEvents({ limit: 50, event_type: auditType || undefined }),
        getAIActionApprovals({ limit: 50, status: approvalStatus || undefined }),
        getInsights('dashboard', { includeInactive: includeInactiveInsights }),
        getInsightInbox({ limit: 100, status: inboxStatus || undefined }),
        getRagIndexStatus(),
        getRagSchedulerStatus(),
      ]);
      setCapabilities(nextCapabilities);
      setSummary(nextSummary);
      setAuditEvents(nextAuditEvents);
      setApprovals(nextApprovals.approvals || []);
      setInsights(nextInsights.insights || []);
      setInboxInsights(nextInbox.insights || []);
      setInboxSummary(nextInbox.summary || null);
      setRagIndexStatus(nextRagStatus);
      setRagSchedulerStatus(nextRagSchedulerStatus);
    } catch (error: any) {
      console.error('Failed to load AI governance workspace:', error);
      showToast(error.message || 'Failed to load AI governance workspace', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [auditType, approvalStatus, includeInactiveInsights, inboxStatus]);

  const handleInsightState = async (
    insight: Insight,
    status: 'dismissed' | 'snoozed' | 'assigned' | 'active'
  ) => {
    if (!insight.id) {
      showToast('This insight cannot be updated because it has no stable ID.', 'warning');
      return;
    }

    const snoozedUntil =
      status === 'snoozed'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    try {
      await updateInsightLifecycle(insight.id, {
        status,
        assigned_to: status === 'assigned' ? user?.email : undefined,
        snoozed_until: snoozedUntil,
        note:
          status === 'snoozed'
            ? 'Snoozed from AI Governance for 24 hours'
            : status === 'assigned'
              ? 'Assigned from AI Governance insight inbox'
              : undefined,
      });
      showToast(`Insight ${status.replace('_', ' ')}`, 'success');
      await load();
    } catch (error: any) {
      console.error('Failed to update insight lifecycle:', error);
      showToast(error.message || 'Failed to update insight', 'error');
    }
  };

  const handleProposeManualAction = async () => {
    if (!actionIntent.trim()) {
      showToast('Add an action intent first.', 'warning');
      return;
    }

    if (EMAIL_DRAFT_ACTIONS.has(actionType) && !draftRecipient.trim()) {
      showToast('Email draft proposals need a recipient.', 'warning');
      return;
    }

    let extraPayload: Record<string, any> = {};
    if (actionPayloadJson.trim()) {
      try {
        extraPayload = JSON.parse(actionPayloadJson);
      } catch {
        showToast('Advanced payload must be valid JSON.', 'warning');
        return;
      }
    }

    if (actionType === 'update_deal_stage' && !extraPayload.dealId && !extraPayload.entityId) {
      showToast('Deal stage updates need a dealId in the advanced payload.', 'warning');
      return;
    }

    setActionBusy(true);
    try {
      const basePayload =
        EMAIL_DRAFT_ACTIONS.has(actionType)
          ? {
              toEmail: draftRecipient.trim(),
              fromEmail: user?.email || 'noreply@example.com',
              subject: actionIntent.trim().slice(0, 120),
              body: `Hi,\n\n${actionIntent.trim()}\n\nBest,\n${user?.firstName || ''}`.trim(),
            }
          : actionType === 'create_followup_sequence'
            ? {
                description: `Created from AI Governance action composer:\n\n${actionIntent.trim()}`,
                steps: [
                  { title: actionIntent.trim().slice(0, 120), daysFromNow: 1, priority: 'MEDIUM' },
                  { title: 'Second follow-up', daysFromNow: 3, priority: 'MEDIUM' },
                  { title: 'Final follow-up before escalation', daysFromNow: 7, priority: 'HIGH' },
                ],
              }
            : actionType === 'update_deal_stage'
              ? {
                  stage: 'PROPOSAL',
                }
              : actionType === 'bulk_update_records'
                ? {
                    entityType: 'deal',
                    recordIds: [],
                    changes: {},
                    reason: actionIntent.trim(),
                  }
              : {
                  title: actionIntent.trim().slice(0, 120),
                  description: `Created from AI Governance action composer:\n\n${actionIntent.trim()}`,
                  priority: 'MEDIUM',
                  status: 'PENDING',
                };
      const proposal = await proposeAIAction({
        intent: actionIntent.trim(),
        action_type: actionType,
        payload: {
          ...basePayload,
          ...extraPayload,
        },
      });
      setPendingProposal(proposal);
      showToast('AI action proposal prepared for confirmation.', 'success');
      await load();
    } catch (error: any) {
      console.error('Failed to propose action:', error);
      showToast(error.message || 'Failed to propose action', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReviewApproval = async (approval: AIActionApproval, decision: 'approve' | 'reject') => {
    setApprovalBusyId(approval.id);
    try {
      await reviewAIActionApproval(approval.id, decision, {
        note:
          decision === 'approve'
            ? 'Reviewed and approved from AI Governance.'
            : 'Reviewed and rejected from AI Governance.',
      });
      showToast(`Approval ${decision === 'approve' ? 'approved' : 'rejected'}.`, 'success');
      await load();
    } catch (error: any) {
      console.error('Failed to review approval:', error);
      showToast(error.message || 'Failed to review approval', 'error');
    } finally {
      setApprovalBusyId(null);
    }
  };

  const handleProposeInsightTask = async (insight: Insight) => {
    setActionBusy(true);
    try {
      const proposal = await proposeAIAction({
        intent: `Create a follow-up task for this insight: ${insight.message}`,
        action_type: 'create_task',
        entity_type: insight.entity_type,
        entity_id: insight.entity_id,
        payload: {
          title: insight.recommended_action || insight.message.slice(0, 120),
          description: [
            `Insight: ${insight.message}`,
            insight.reason ? `Reason: ${insight.reason}` : null,
            insight.recommended_action ? `Recommended action: ${insight.recommended_action}` : null,
          ].filter(Boolean).join('\n\n'),
          priority: insight.severity === 'error' || insight.severity === 'warning' ? 'HIGH' : 'MEDIUM',
          status: 'PENDING',
        },
      });
      setPendingProposal(proposal);
      showToast('Insight task proposal ready for confirmation.', 'success');
    } catch (error: any) {
      console.error('Failed to convert insight to task:', error);
      showToast(error.message || 'Failed to convert insight to task', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmProposal = async () => {
    if (!pendingProposal) {
      return;
    }

    setActionBusy(true);
    try {
      await executeAIAction({
        proposal_id: pendingProposal.proposal_id,
        action_type: pendingProposal.action_type,
        payload: pendingProposal.payload,
        confirmed: true,
      });
      showToast('AI action completed and audit logged.', 'success');
      setPendingProposal(null);
      setActionIntent('');
      setDraftRecipient('');
      setActionPayloadJson('');
      await load();
    } catch (error: any) {
      console.error('Failed to confirm AI action:', error);
      showToast(error.message || 'Failed to confirm AI action', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!pendingProposal) return;
    setActionBusy(true);
    try {
      await createAIActionApproval({
        proposal: pendingProposal,
        reason: 'Requested from AI Governance safe action composer.',
      });
      showToast('Approval request created for review.', 'success');
      setPendingProposal(null);
      await load();
    } catch (error: any) {
      console.error('Failed to request approval:', error);
      showToast(error.message || 'Failed to request approval', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRunRagIndex = async () => {
    setRagIndexing(true);
    try {
      const { result } = await runRagSchedulerNow({
        domains: ['documents', 'emails', 'cases', 'tasks'],
        limit: 100,
      });
      showToast(`RAG index refreshed: ${result.total_indexed} records indexed.`, 'success');
      await load();
    } catch (error: any) {
      console.error('Failed to run RAG index:', error);
      showToast(error.message || 'Failed to run RAG index', 'error');
    } finally {
      setRagIndexing(false);
    }
  };

  const runtime = capabilities?.runtime;
  const topTools = Object.entries(summary?.tool_counts || {}).slice(0, 5);
  const toolDomains = capabilities?.tool_domains || [];
  const usageByModel = Object.entries(summary?.usage_by_model || {}).slice(0, 3);
  const healthStatus = summary?.health?.status || 'unknown';
  const healthClass =
    healthStatus === 'healthy'
      ? 'border-green-200 bg-green-50 text-green-700'
      : healthStatus === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-border bg-muted text-muted-foreground';

  return (
    <PageLayout
      title="AI Governance"
      subtitle="Monitor AI health, audit activity, review guardrails, manage insights, and refresh the CRM knowledge index."
      icon={<Icons.ShieldCheck size={24} />}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
        >
          <Icons.RefreshCw size={16} className={cn(refreshing && 'animate-spin')} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6 p-4 sm:p-5 lg:p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Audit Logging</p>
            <p className="mt-2 text-2xl font-semibold">
              {capabilities?.audit_logging ? 'Enabled' : loading ? 'Loading' : 'Unavailable'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Chat, insight, and action events are captured per user and tenant.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Safe Actions</p>
            <p className="mt-2 text-2xl font-semibold">
              {capabilities?.actions.supported_actions.length ?? 0}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirmed writeback is currently limited to low-risk actions.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Insights</p>
            <p className="mt-2 text-2xl font-semibold">{insights.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Dismissed and snoozed insights are hidden from regular insight feeds.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Runtime</p>
            <p className="mt-2 truncate text-2xl font-semibold">
              {runtime?.provider === 'groq' ? 'Groq' : runtime?.provider || 'Loading'}
            </p>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {runtime?.model || 'Model not reported'}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Events</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.total_events ?? 0}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Recent audit window: {summary?.window_event_limit ?? 500} events / {summary?.tool_call_count ?? 0} tool calls.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fallbacks</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.fallback_rate ?? 0}%</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary?.degraded_count ?? 0} degraded events in the current window.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">LLM Calls</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.token_usage?.llm_calls ?? 0}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(summary?.token_usage?.total_tokens ?? 0).toLocaleString()} tokens audited.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Safe Action Health</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary?.action_success_rate == null ? 'N/A' : `${summary.action_success_rate}%`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary?.action_failures ?? 0} failures from {summary?.action_executions ?? 0} executions.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latency</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary?.latency?.p95_ms == null ? 'N/A' : `${Math.round(summary.latency.p95_ms)}ms`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              P95 from {summary?.latency?.count ?? 0} audited AI operations.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Audit Storage</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary?.storage === 'postgres' ? 'Postgres' : summary?.storage ? 'Fallback' : 'Loading'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Last event: {formatDate(summary?.last_event_at)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr]">
          <div className={cn('rounded-xl border p-4 shadow-sm', healthClass)}>
            <p className="text-xs uppercase tracking-wide opacity-80">Ops Health</p>
            <p className="mt-2 text-2xl font-semibold capitalize">{healthStatus}</p>
            <p className="mt-2 text-sm opacity-80">
              Failure rate: {summary?.failure_rate ?? 0}% / fallback rate: {summary?.fallback_rate ?? 0}%.
            </p>
            {summary?.health?.reasons?.length ? (
              <div className="mt-3 space-y-1 text-sm">
                {summary.health.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tool Coverage</p>
                <p className="mt-2 text-2xl font-semibold">{toolDomains.length}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                {capabilities?.tools?.length ?? 0} tools
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {toolDomains.slice(0, 10).map((domain) => (
                <span key={domain} className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                  {domain.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Top AI Tools</p>
            <div className="mt-3 space-y-2">
              {topTools.length ? (
                topTools.map(([tool, count]) => (
                  <div key={tool} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{tool.replaceAll('_', ' ')}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tool usage has been audited yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider Errors</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.provider_errors?.total ?? 0}</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {Object.entries(summary?.provider_errors?.by_provider || {}).length ? (
                Object.entries(summary?.provider_errors?.by_provider || {}).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between gap-3">
                    <span className="truncate capitalize">{provider}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{count}</span>
                  </div>
                ))
              ) : (
                <p>No provider errors in the current audit window.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Model Usage</p>
            <div className="mt-3 space-y-2">
              {usageByModel.length ? (
                usageByModel.map(([model, usage]) => (
                  <div key={model} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{model}</span>
                      <span className="text-xs text-muted-foreground">{usage.llm_calls} calls</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {usage.total_tokens.toLocaleString()} tokens, {usage.input_tokens.toLocaleString()} in / {usage.output_tokens.toLocaleString()} out
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No model usage has been audited yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost Tracking</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary?.cost?.pricing_configured && summary.cost.estimated_usd != null
                ? `$${summary.cost.estimated_usd.toFixed(4)}`
                : 'Not priced'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {runtime?.cost_tracking?.enabled
                ? `Using configured ${runtime.cost_tracking.currency} token rates.`
                : 'Add token pricing env vars to enable cost estimates.'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Alert Thresholds</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Failure rate</span>
                <span className="font-medium text-foreground">{runtime?.alert_thresholds?.failure_rate_percent ?? 20}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Fallback rate</span>
                <span className="font-medium text-foreground">{runtime?.alert_thresholds?.fallback_rate_percent ?? 20}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>P95 latency</span>
                <span className="font-medium text-foreground">{runtime?.alert_thresholds?.latency_p95_ms ?? 15000}ms</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Provider errors</span>
                <span className="font-medium text-foreground">{runtime?.alert_thresholds?.provider_errors ?? 1}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">RAG Knowledge Index</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Semantic index coverage and scheduler state for documents, emails, support cases, tasks, and core CRM records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRunRagIndex()}
              disabled={ragIndexing}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
            >
              {ragIndexing && <Icons.RefreshCw size={14} className="animate-spin" />}
              Run refresh job
            </button>
          </div>
          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-5">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduler</p>
              <p className="mt-1 text-2xl font-semibold">
                {ragSchedulerStatus?.enabled ? 'Enabled' : 'Manual'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ragSchedulerStatus?.configured ? 'Service token configured' : 'No background token configured'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Run Count</p>
              <p className="mt-1 text-2xl font-semibold">{ragSchedulerStatus?.run_count ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ragSchedulerStatus?.failure_count ?? 0} failed run(s)
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Success</p>
              <p className="mt-1 text-sm font-medium">{formatDate(ragSchedulerStatus?.last_success_at)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Interval: {ragSchedulerStatus?.interval_seconds ?? capabilities?.rag_indexing?.scheduler?.interval_seconds ?? 3600}s
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Configured Scope</p>
              <p className="mt-1 text-sm font-medium">
                {(ragSchedulerStatus?.configured_domains || capabilities?.rag_indexing?.scheduler?.domains || []).join(', ') || 'Default CRM knowledge'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Limit: {ragSchedulerStatus?.configured_limit ?? 100} records/domain
              </p>
            </div>
            <div className={cn(
              'rounded-lg border bg-background p-3',
              ragSchedulerStatus?.token_rotation?.rotation_warning && 'border-amber-200 bg-amber-50'
            )}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Token Rotation</p>
              <p className="mt-1 text-sm font-medium capitalize">
                {(ragSchedulerStatus?.token_rotation?.status || capabilities?.rag_indexing?.scheduler?.token_rotation?.status || 'not configured').replaceAll('_', ' ')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expires: {formatDate(ragSchedulerStatus?.token_rotation?.expires_at || capabilities?.rag_indexing?.scheduler?.token_rotation?.expires_at)}
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Indexed Records</p>
              <p className="mt-1 text-2xl font-semibold">{ragSchedulerStatus?.total_indexed ?? ragIndexStatus?.total ?? 0}</p>
            </div>
            {Object.entries(ragIndexStatus?.counts || {}).slice(0, 7).map(([entityType, count]) => (
              <div key={entityType} className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{entityType.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-2xl font-semibold">{count}</p>
              </div>
            ))}
          </div>
        </section>

        {summary?.recent_failures?.length ? (
          <section className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Icons.AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <h2 className="font-semibold text-red-800">Recent AI Failures</h2>
                <div className="mt-3 space-y-2">
                  {summary.recent_failures.map((failure) => (
                    <div key={failure.id || `${failure.event_type}-${failure.created_at}`} className="text-sm text-red-800">
                      <span className="font-medium">{failure.event_type.replaceAll('_', ' ')}</span>
                      {failure.action ? ` / ${failure.action}` : ''}
                      {failure.error ? `: ${failure.error}` : ''}
                      <span className="text-red-700"> ({formatDate(failure.created_at)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">AI Guardrails</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These rules describe what the assistant can safely do today.
            </p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              {(capabilities?.actions.supported_actions || []).map((action) => (
                <div key={action.type} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{action.label}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {action.risk_level}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium">Operating Rules</p>
              <div className="mt-3 space-y-2">
                {(capabilities?.actions.guardrails || []).map((rule) => (
                  <div key={rule} className="flex gap-2 text-sm text-muted-foreground">
                    <Icons.CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
              {capabilities?.actions.approval_policy ? (
                <div className="mt-4 rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium">Approval Policy</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {Object.entries(capabilities.actions.approval_policy).map(([risk, policy]) => (
                      <p key={risk}>
                        <span className="font-medium capitalize text-foreground">{risk}</span>: {policy}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Safe Action Composer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepare a governed writeback action, review the proposal, then explicitly confirm it.
            </p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <select
                  value={actionType}
                  onChange={(event) => setActionType(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(capabilities?.actions.supported_actions || [
                    { type: 'create_task', label: 'Create task' },
                    { type: 'draft_email', label: 'Draft email' },
                  ]).map((action) => (
                    <option key={action.type} value={action.type}>
                      {action.label}
                    </option>
                  ))}
                </select>
                {EMAIL_DRAFT_ACTIONS.has(actionType) && (
                  <input
                    type="email"
                    value={draftRecipient}
                    onChange={(event) => setDraftRecipient(event.target.value)}
                    placeholder="Recipient email"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>
              <textarea
                value={actionIntent}
                onChange={(event) => setActionIntent(event.target.value)}
                rows={4}
                placeholder="Example: Create a task to follow up with Northwind tomorrow morning about the proposal."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <textarea
                value={actionPayloadJson}
                onChange={(event) => setActionPayloadJson(event.target.value)}
                rows={3}
                placeholder={
                  actionType === 'update_deal_stage'
                    ? 'Advanced JSON, e.g. {"dealId":"...", "stage":"NEGOTIATION"}'
                    : actionType === 'create_followup_sequence'
                      ? 'Optional JSON overrides, e.g. {"steps":[{"title":"Call buyer","daysFromNow":1}]}'
                      : 'Optional advanced JSON payload overrides'
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => void handleProposeManualAction()}
                disabled={actionBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {actionBusy && <Icons.RefreshCw size={14} className="animate-spin" />}
                Prepare proposal
              </button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              {!pendingProposal ? (
                <div className="text-sm text-muted-foreground">
                  No pending proposal. Proposed actions will appear here before execution.
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Pending confirmation</p>
                      <p className="mt-1 text-sm text-muted-foreground">{pendingProposal.preview}</p>
                    </div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {pendingProposal.risk_level}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg bg-background p-2 text-xs text-muted-foreground">
                    <p>Action: {pendingProposal.action_type.replaceAll('_', ' ')}</p>
                    {pendingProposal.approval_status && <p>Approval: {pendingProposal.approval_status.replaceAll('_', ' ')}</p>}
                    {pendingProposal.payload?.title && <p>Title: {pendingProposal.payload.title}</p>}
                    {pendingProposal.payload?.subject && <p>Subject: {pendingProposal.payload.subject}</p>}
                    {pendingProposal.payload?.toEmail && <p>To: {pendingProposal.payload.toEmail}</p>}
                    {pendingProposal.payload?.dealId && <p>Deal: {pendingProposal.payload.dealId}</p>}
                    {pendingProposal.payload?.stage && <p>Stage: {pendingProposal.payload.stage}</p>}
                    {Array.isArray(pendingProposal.payload?.steps) && (
                      <p>Steps: {pendingProposal.payload.steps.length}</p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleConfirmProposal()}
                      disabled={actionBusy || !pendingProposal.can_execute}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      Confirm action
                    </button>
                    {!pendingProposal.can_execute && (
                      <button
                        type="button"
                        onClick={() => void handleRequestApproval()}
                        disabled={actionBusy}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        Request approval
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingProposal(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">High-Risk Action Approvals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review AI-generated proposals that are intentionally blocked from direct execution.
              </p>
            </div>
            <select
              value={approvalStatus}
              onChange={(event) => setApprovalStatus(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All approvals</option>
            </select>
          </div>
          <div className="divide-y divide-border">
            {approvals.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No approval requests match this filter. Use the Safe Action Composer to request review for high-risk proposals.
              </p>
            ) : (
              approvals.map((approval) => {
                const proposal = (approval.proposal || {}) as Partial<AIActionProposal> & Record<string, any>;
                const payload = (proposal.payload || {}) as Record<string, any>;
                return (
                  <div key={approval.id} className="p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium capitalize', approvalStatusClass(approval.status))}>
                            {approval.status}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {(proposal.risk_level || 'unknown').replaceAll('_', ' ')} risk
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Requested {formatDate(approval.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium">
                          {(proposal.action_type || 'AI action').replaceAll('_', ' ')}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {proposal.preview || approval.reason || 'Review the proposal payload before enabling any writeback.'}
                        </p>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <p className="rounded-lg bg-muted/40 p-2">Requested by: {approval.requested_by || 'Unknown'}</p>
                          <p className="rounded-lg bg-muted/40 p-2">Reviewed by: {approval.reviewed_by || 'Not reviewed'}</p>
                          <p className="rounded-lg bg-muted/40 p-2">Entity: {payload.entityType || payload.entity_type || 'Not set'}</p>
                          <p className="rounded-lg bg-muted/40 p-2">
                            Records: {Array.isArray(payload.recordIds) ? payload.recordIds.length : 0}
                          </p>
                        </div>
                        {(approval.reason || approval.review_note) && (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                            {approval.reason && <p>Reason: {approval.reason}</p>}
                            {approval.review_note && <p className="mt-1">Review note: {approval.review_note}</p>}
                          </div>
                        )}
                      </div>
                      {approval.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => void handleReviewApproval(approval, 'approve')}
                            disabled={approvalBusyId === approval.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                          >
                            {approvalBusyId === approval.id && <Icons.RefreshCw size={12} className="animate-spin" />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReviewApproval(approval, 'reject')}
                            disabled={approvalBusyId === approval.id}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Recent AI Audit Events</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Latest authenticated AI events for this user and workspace.
                  </p>
                </div>
                <select
                  value={auditType}
                  onChange={(event) => setAuditType(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All events</option>
                  <option value="chat_stream_completion">Chat completions</option>
                  <option value="action_proposed">Action proposals</option>
                  <option value="action_executed">Action executions</option>
                  <option value="insights_generated">Insight generation</option>
                  <option value="insight_state_updated">Insight state updates</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-border">
              {auditEvents.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No AI audit events yet.</p>
              ) : (
                auditEvents.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{event.event_type.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.action || 'No action'} / {event.outcome}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                    {event.prompt && (
                      <p className="mt-3 line-clamp-2 rounded-lg bg-muted/40 p-2 text-sm text-muted-foreground">
                        {event.prompt}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Team Insight Inbox</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review persisted AI insights, assign ownership, and keep noisy items out of active feeds.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={inboxStatus}
                    onChange={(event) => setInboxStatus(event.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="assigned">Assigned</option>
                    <option value="snoozed">Snoozed</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={includeInactiveInsights}
                      onChange={(event) => setIncludeInactiveInsights(event.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Include hidden live feed
                  </label>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ['Total', inboxSummary?.total ?? 0],
                  ['Active', inboxSummary?.active ?? 0],
                  ['Assigned', inboxSummary?.assigned ?? 0],
                  ['Snoozed', inboxSummary?.snoozed ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border">
              {inboxInsights.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No persisted insights match this filter yet. Generate insights from dashboard or refresh this page.</p>
              ) : (
                inboxInsights.slice(0, 20).map((insight) => (
                  <div key={insight.id || `${insight.entity_type}-${insight.entity_id}-${insight.type}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', severityClass(insight.severity))}>
                          {insight.label || insight.type.replaceAll('_', ' ')}
                        </span>
                        <p className="mt-2 text-sm font-medium">{insight.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {insight.entity_type} / {insight.entity_id}
                          {insight.lifecycle?.status ? ` / ${insight.lifecycle.status}` : ''}
                          {insight.lifecycle?.assigned_to ? ` / assigned to ${insight.lifecycle.assigned_to}` : ''}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          First seen: {formatDate(insight.first_seen_at)} / Last seen: {formatDate(insight.last_seen_at)} / Seen {insight.seen_count || 1}x
                        </p>
                      </div>
                    </div>
                    {(insight.reason || insight.recommended_action) && (
                      <div className="mt-3 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                        {insight.reason && <p>{insight.reason}</p>}
                        {insight.recommended_action && <p className="mt-1">Recommended: {insight.recommended_action}</p>}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleInsightState(insight, 'dismissed')}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleInsightState(insight, 'snoozed')}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        Snooze 24h
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleInsightState(insight, 'assigned')}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        Mark Assigned
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleProposeInsightTask(insight)}
                        disabled={actionBusy}
                        className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        Convert to task
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
