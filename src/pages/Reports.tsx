import { useState, useEffect } from "react";
import { Icons } from "../components/icons";
import { PageLayout } from "../components/PageLayout";
import { reportsApi } from "../lib/api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SimpleChart } from "../components/SimpleChart";
import { exportToCSV } from "../lib/helpers";

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

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  data_requirements: string[];
  metrics: string[];
}

interface GeneratedReport {
  success: boolean;
  report_type: string;
  title: string;
  summary: string;
  date_range: { start: string; end: string };
  metrics: Record<string, any>;
  charts: Array<any>;
  insights: string[];
  recommendations: string[];
  sections: Array<any>;
  generated_at: string;
  error?: string;
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [showReportView, setShowReportView] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const data = await reportsApi.getTemplates();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load report templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const generateReport = async (reportType: string, query?: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      setShowReportView(true);
      
      const data = await reportsApi.generate({
        report_type: reportType,
        custom_query: query,
      });
      
      if (data.success) {
        setGeneratedReport(data);
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    generateReport(templateId);
  };

  const handleCustomReport = () => {
    if (customQuery.trim()) {
      generateReport('custom', customQuery);
    }
  };

  if (isLoadingTemplates) {
    return (
      <PageLayout>
        <div className="p-6">
          <LoadingSkeleton count={6} height={80} />
        </div>
      </PageLayout>
    );
  }

  // Show generated report view
  if (showReportView && generatedReport) {
    return (
      <PageLayout>
        <div className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowReportView(false);
                    setGeneratedReport(null);
                  }}
                  className="p-2 hover:bg-secondary rounded transition-colors"
                >
                  <Icons.ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{generatedReport.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{generatedReport.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateReport(generatedReport.report_type)}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Icons.RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button 
                  onClick={() => {
                    // Export report data as CSV
                    if (generatedReport.metrics) {
                      const reportData = Object.entries(generatedReport.metrics).map(([key, value]) => ({
                        metric: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                      }));
                      exportToCSV(reportData, [
                        { header: 'Metric', accessor: 'metric' },
                        { header: 'Value', accessor: 'value' },
                      ], `report_${generatedReport.report_type}`);
                    }
                  }}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Icons.Download size={16} />
                  Export CSV
                </button>
                <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Icons.Mail size={16} />
                  Email Report
                </button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Generated: {new Date(generatedReport.generated_at).toLocaleString()} • 
              Date Range: {generatedReport.date_range.start} to {generatedReport.date_range.end}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icons.BarChart size={20} className="text-primary" />
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(generatedReport.metrics).map(([key, value]) => {
                if (typeof value === 'object') return null;
                return (
                  <div key={key} className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold">
                      {typeof value === 'number' 
                        ? value > 1000 
                          ? `${(value / 1000).toFixed(1)}K`
                          : value.toFixed(2)
                        : value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insights */}
            {generatedReport.insights.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icons.Sparkles size={20} className="text-blue-600" />
                  AI Insights
                </h2>
                <div className="space-y-3">
                  {generatedReport.insights.map((insight, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <Icons.TrendingUp size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{renderMarkdownText(insight)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {generatedReport.recommendations.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icons.CheckCircle size={20} className="text-green-600" />
                  Recommendations
                </h2>
                <div className="space-y-3">
                  {generatedReport.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <Icons.ArrowRight size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{renderMarkdownText(rec)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Charts Section */}
          {generatedReport.charts.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Icons.PieChart size={20} className="text-primary" />
                Visualizations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedReport.charts.map((chart, idx) => (
                  <div key={idx} className="p-4 bg-card border border-border rounded-lg">
                    <h3 className="text-sm font-semibold mb-4">{chart.title}</h3>
                    <SimpleChart
                      type={chart.type}
                      title={chart.title}
                      data={chart.data}
                      xAxis={chart.xAxis}
                      yAxis={chart.yAxis}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  // Templates selection view
  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">Generate AI-powered reports with insights and recommendations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Custom Report Section */}
        <div className="mb-8 bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Icons.Sparkles size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">AI-Powered Custom Report</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ask a question in natural language and get a custom report with AI insights
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Why are deals stuck in negotiation? Show me top performers this quarter..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomReport()}
                  className="flex-1 px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                />
                <button
                  onClick={handleCustomReport}
                  disabled={!customQuery.trim() || isGenerating}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Icons.RefreshCw size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles size={16} />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Standard Templates */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Standard Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-card border border-border rounded-lg p-5 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                    <Icons.FileText size={20} className="text-primary" />
                  </div>
                  <button
                    className="p-1.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template.id);
                    }}
                  >
                    <Icons.Activity size={16} className="text-primary" />
                  </button>
                </div>
                
                <h3 className="font-semibold text-foreground mb-2">{template.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {template.data_requirements.slice(0, 3).map((req) => (
                    <span
                      key={req}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                    >
                      {req}
                    </span>
                  ))}
                  {template.data_requirements.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                      +{template.data_requirements.length - 3}
                    </span>
                  )}
                </div>

                <button className="w-full px-4 py-2 text-sm bg-primary/10 text-primary rounded hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icons.Activity size={14} />
                  Generate Report
                </button>
              </div>
            ))}
          </div>
        </div>

        {templates.length === 0 && !isLoadingTemplates && (
          <div className="text-center py-12">
            <Icons.FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates available</h3>
            <p className="text-muted-foreground">Unable to load report templates</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
