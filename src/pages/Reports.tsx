import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { reportsApi } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AIDegradedNotice } from '../components/AIDegradedNotice';
import { SimpleChart } from '../components/SimpleChart';
import { exportToCSV } from '../lib/helpers';
import { useToast } from '../components/Toast';

type ReportMode = 'TABULAR' | 'SUMMARY' | 'MATRIX';

interface ReportTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  data_requirements: string[];
  metrics: string[];
  display_modes: ReportMode[];
  default_mode: ReportMode;
}

interface SavedReportDefinition {
  id: string;
  name: string;
  report_type: string;
  report_mode: ReportMode;
  custom_query?: string;
  date_range?: { start: string; end: string };
  filters?: Record<string, any>;
  schedule?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface GeneratedReport {
  success: boolean;
  report_type: string;
  report_mode?: ReportMode;
  title: string;
  summary: string;
  date_range: { start: string; end: string };
  metrics: Record<string, any>;
  charts: Array<any>;
  insights: string[];
  recommendations: string[];
  sections: Array<{ title: string; type: string; content: any }>;
  generated_at: string;
  definition_id?: string;
  error?: string;
  degraded_mode?: boolean;
  degraded_reason?: string | null;
}

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

const modeLabel: Record<ReportMode, string> = {
  TABULAR: 'Tabular',
  SUMMARY: 'Summary',
  MATRIX: 'Matrix',
};

function renderValue(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000) return value.toLocaleString();
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [definitions, setDefinitions] = useState<SavedReportDefinition[]>([]);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [savedReportName, setSavedReportName] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReportMode>('SUMMARY');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCadence, setScheduleCadence] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [scheduleHour, setScheduleHour] = useState('08');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleWeekday, setScheduleWeekday] = useState('MONDAY');
  const [scheduleEmail, setScheduleEmail] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [templatesResponse, definitionsResponse] = await Promise.all([
          reportsApi.getTemplates(),
          reportsApi.listDefinitions(),
        ]);
        if (templatesResponse.success) setTemplates(templatesResponse.templates);
        if (definitionsResponse.success) setDefinitions(definitionsResponse.definitions);
      } catch (err) {
        console.error(err);
        setError('Failed to load reporting workspace');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, ReportTemplate[]>();
    templates.forEach((template) => {
      const bucket = groups.get(template.category) || [];
      bucket.push(template);
      groups.set(template.category, bucket);
    });
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [templates]);

  const refreshDefinitions = async () => {
    const response = await reportsApi.listDefinitions();
    if (response.success) setDefinitions(response.definitions);
  };

  const generateReport = async (reportType: string, reportMode: ReportMode, query?: string, definitionId?: string) => {
    try {
      setIsGenerating(true);
      setShowReportView(true);
      setError(null);
      const response = definitionId
        ? await reportsApi.runDefinition(definitionId)
        : await reportsApi.generate({
            report_type: reportType,
            report_mode: reportMode,
            custom_query: query,
            date_range: dateRange,
            filters: {},
          });
      if (response.success) setGeneratedReport(response);
      else setError(response.error || 'Failed to generate report');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedMode(template.default_mode);
    generateReport(template.id, template.default_mode);
  };

  const handleSaveDefinition = async () => {
    const reportType = selectedTemplateId || (customQuery.trim() ? 'custom' : null);
    if (!reportType) {
      showToast('Select or generate a report first.', 'error');
      return;
    }
    if (reportType !== 'custom') {
      showToast('Saved definitions are currently for custom AI reports only. Standard templates now run from the Java backend.', 'error');
      return;
    }
    await reportsApi.saveDefinition({
      name: savedReportName.trim() || activeTemplate?.title || 'Saved Report',
      report_type: reportType,
      report_mode: selectedMode,
      custom_query: reportType === 'custom' ? customQuery.trim() : undefined,
      date_range: dateRange,
      filters: {},
      schedule: scheduleEnabled
        ? {
            enabled: true,
            cadence: scheduleCadence,
            hour: Number(scheduleHour),
            minute: Number(scheduleMinute),
            weekday: scheduleWeekday,
            delivery_email: scheduleEmail.trim(),
          }
        : null,
    });
    await refreshDefinitions();
    setSavedReportName('');
    showToast('Report definition saved', 'success');
  };

  const renderSection = (section: { title: string; type: string; content: any }) => {
    if (section.type === 'metrics') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(section.content || {}).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
              <div className="text-lg font-semibold">{renderValue(value)}</div>
            </div>
          ))}
        </div>
      );
    }
    if (section.type === 'charts') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(section.content || []).map((chart: any, idx: number) => (
            <SimpleChart key={`${chart.title}-${idx}`} type={chart.type} title={chart.title} data={chart.data} xAxis={chart.xAxis} yAxis={chart.yAxis} />
          ))}
        </div>
      );
    }
    if (section.type === 'summary' || section.type === 'table') {
      const rows = Array.isArray(section.content) ? section.content : [];
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {headers.map((header) => (
                  <th key={header} className="text-left py-2 px-3 font-medium text-muted-foreground">{header.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: Record<string, any>, idx: number) => (
                <tr key={idx} className="border-b border-border/60">
                  {headers.map((header) => (
                    <td key={header} className="py-2 px-3">{renderValue(row[header])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (section.type === 'matrix') {
      const matrix = section.content || {};
      const columns = matrix.columns || [];
      const rows = matrix.rows || [];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Row</th>
                {columns.map((column: string) => (
                  <th key={column} className="text-left py-2 px-3 font-medium text-muted-foreground">{column}</th>
                ))}
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.label} className="border-b border-border/60">
                  <td className="py-2 px-3 font-medium">{row.label}</td>
                  {columns.map((column: string) => (
                    <td key={column} className="py-2 px-3">{renderValue(row.values?.[column])}</td>
                  ))}
                  <td className="py-2 px-3">{renderValue(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (section.type === 'insights' || section.type === 'recommendations') {
      return (
        <div className="space-y-3">
          {(section.content || []).map((item: string, idx: number) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 px-4 py-3">{item}</div>
          ))}
        </div>
      );
    }
    return <pre className="text-xs overflow-auto">{JSON.stringify(section.content, null, 2)}</pre>;
  };

  const exportCurrentReport = () => {
    const rows =
      generatedReport?.sections.find((section) => section.type === 'table')?.content ||
      generatedReport?.sections.find((section) => section.type === 'summary')?.content ||
      [];
    if (!Array.isArray(rows) || rows.length === 0) {
      showToast('No tabular data available to export for this report.', 'error');
      return;
    }
    const headers = Object.keys(rows[0]);
    exportToCSV(
      rows,
      headers.map((header) => ({ header, accessor: header as keyof typeof rows[number] })),
      `report_${generatedReport?.report_type || 'export'}`
    );
  };

  if (isLoading) return <PageLayout><div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-5 lg:px-6"><LoadingSkeleton count={6} height={80} /></div></PageLayout>;

  if (showReportView && generatedReport) {
    return (
      <PageLayout>
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button onClick={() => { setShowReportView(false); setGeneratedReport(null); }} className="p-2 hover:bg-secondary rounded transition-colors"><Icons.ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-[26px] leading-none font-semibold">{generatedReport.title}</h1>
                <p className="text-[13px] text-muted-foreground mt-1">{generatedReport.summary}</p>
                <p className="text-xs text-muted-foreground mt-2">Mode: {modeLabel[generatedReport.report_mode || 'SUMMARY']} | Generated: {new Date(generatedReport.generated_at).toLocaleString()} | Range: {generatedReport.date_range.start} to {generatedReport.date_range.end}</p>
              </div>
            </div>
            <button onClick={exportCurrentReport} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"><Icons.Download size={14} />Export CSV</button>
          </div>
        </div>
        </div>
        <div className="space-y-4">
          {generatedReport.degraded_mode && <AIDegradedNotice reason={generatedReport.degraded_reason} />}
          {generatedReport.sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-semibold mb-3">{section.title}</h2>
              {renderSection(section)}
            </div>
          ))}
        </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
        <h1 className="text-[26px] leading-none font-semibold">Reports</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Standard CRM reports, saved definitions, scheduling, and custom AI reporting in one workspace.</p>
      </div>
      </div>
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-600">{error}</div>}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange((current) => ({ ...current, start: e.target.value }))} className="h-9 rounded-full border border-border bg-background px-3 text-sm" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange((current) => ({ ...current, end: e.target.value }))} className="h-9 rounded-full border border-border bg-background px-3 text-sm" />
            <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value as ReportMode)} className="h-9 rounded-full border border-border bg-background px-3 text-xs font-medium">
              {(['SUMMARY', 'TABULAR', 'MATRIX'] as ReportMode[]).map((mode) => <option key={mode} value={mode}>{modeLabel[mode]}</option>)}
            </select>
            <input type="text" placeholder="Saved report name" value={savedReportName} onChange={(e) => setSavedReportName(e.target.value)} className="h-9 rounded-full border border-border bg-background px-3 text-sm" />
          </div>

          <div className="flex gap-3">
            <input type="text" placeholder="Ask a custom reporting question..." value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
            <button onClick={() => generateReport('custom', selectedMode, customQuery)} disabled={!customQuery.trim() || isGenerating} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{isGenerating ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Sparkles size={14} />}Generate</button>
            <button onClick={handleSaveDefinition} className="inline-flex h-10 items-center rounded-full border border-border/70 bg-background px-4 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60">Save Definition</button>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Standard CRM templates now run from the Java backend. Saved definitions below are for custom AI reports only.
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />Schedule report delivery</label>
            {scheduleEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input type="email" placeholder="Delivery email" value={scheduleEmail} onChange={(e) => setScheduleEmail(e.target.value)} className="px-3 py-2 border border-border rounded bg-background text-sm md:col-span-2" />
                <select value={scheduleCadence} onChange={(e) => setScheduleCadence(e.target.value as 'DAILY' | 'WEEKLY')} className="px-3 py-2 border border-border rounded bg-background text-sm"><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option></select>
                <input type="number" min="0" max="23" value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)} className="px-3 py-2 border border-border rounded bg-background text-sm" />
                <input type="number" min="0" max="59" value={scheduleMinute} onChange={(e) => setScheduleMinute(e.target.value)} className="px-3 py-2 border border-border rounded bg-background text-sm" />
                {scheduleCadence === 'WEEKLY' && <select value={scheduleWeekday} onChange={(e) => setScheduleWeekday(e.target.value)} className="px-3 py-2 border border-border rounded bg-background text-sm md:col-span-2">{['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((weekday) => <option key={weekday} value={weekday}>{weekday}</option>)}</select>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Saved Custom AI Definitions</h2>
            <span className="text-xs text-muted-foreground">{definitions.length} saved</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {definitions.map((definition) => (
              <div key={definition.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{definition.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{definition.report_type.replace(/_/g, ' ')} | {modeLabel[definition.report_mode]}</div>
                    {definition.schedule?.enabled && <div className="text-xs text-muted-foreground mt-2">{definition.schedule.cadence} to {definition.schedule.delivery_email || 'email not set'}</div>}
                  </div>
                  <button onClick={async () => { await reportsApi.deleteDefinition(definition.id); await refreshDefinitions(); }} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"><Icons.Trash size={14} /></button>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => generateReport(definition.report_type, definition.report_mode, definition.custom_query, definition.id)} className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Run</button>
                  <div className="inline-flex h-8 items-center rounded-full bg-muted/30 px-3 text-[11px] text-muted-foreground">Updated {new Date(definition.updated_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {groupedTemplates.map((group) => (
            <div key={group.category}>
              <h2 className="text-lg font-semibold mb-4">{group.category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((template) => (
                  <button key={template.id} onClick={() => handleTemplateSelect(template)} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2 rounded bg-primary/10"><Icons.FileText size={18} className="text-primary" /></div>
                      <div className="text-xs text-muted-foreground">{template.display_modes.map((mode) => modeLabel[mode]).join(' / ')}</div>
                    </div>
                    <div className="font-semibold mb-2">{template.title}</div>
                    <div className="text-sm text-muted-foreground mb-4">{template.description}</div>
                    <div className="flex flex-wrap gap-2">
                      {template.data_requirements.slice(0, 4).map((item) => (
                        <span key={item} className="px-2 py-1 rounded-full bg-muted/30 text-xs text-muted-foreground">{item}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
