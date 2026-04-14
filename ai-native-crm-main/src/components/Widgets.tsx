
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, dealsApi, tasksApi, eventsApi } from "../lib/api";
import { useInsights } from "../hooks/useInsights";
import { InsightBadge } from "./InsightBadge";
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, X, Plus, Search, Mic } from 'lucide-react';
import { useChatStore } from '../hooks/useChatStore';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function Customize({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <Icons.Settings size={14} />
      <span>Customize</span>
    </button>
  );
}

function MetricsFilter({ period, setPeriod }: { period: string; setPeriod: (p: string) => void }) {
  const options = [
    { value: "1y", label: "1 year" },
    { value: "6m", label: "6 months" },
    { value: "3m", label: "3 months" },
    { value: "1m", label: "1 month" },
  ];

  return (
    <div className="relative flex items-center">
      <Icons.Calendar size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
      <select 
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm border border-border bg-transparent hover:bg-secondary transition-colors cursor-pointer appearance-none rounded-md"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icons.ChevronDown size={14} className="absolute right-2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function WidgetsHeader({ 
  activeTab, 
  setActiveTab,
  period,
  setPeriod,
  isCustomizing,
  onCustomizeToggle
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  period: string;
  setPeriod: (p: string) => void;
  isCustomizing: boolean;
  onCustomizeToggle: () => void;
}) {
  const greeting = getGreeting();
  
  return (
    <div className="mb-6">
      <h1 className="text-[32px] font-medium mb-1 text-foreground">
        {greeting}<span className="text-muted-foreground">,</span>
      </h1>
      <p className="text-muted-foreground text-[14px]">
        {isCustomizing 
          ? "Drag and drop to arrange your dashboard."
          : "Here's your sales pipeline at a glance."}
      </p>
      
      <div className="flex items-center justify-end mt-6 mb-4">
        <div className="flex items-center gap-2" data-no-close>
          <div className="hidden md:block">
            <Customize onClick={onCustomizeToggle} />
          </div>
          <MetricsFilter period={period} setPeriod={setPeriod} />
          <div className="ml-2 relative flex items-stretch bg-secondary rounded-md w-fit">
            <div className="flex items-stretch h-auto p-0 bg-transparent">
              <button 
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "group relative flex items-center gap-1.5 px-3 py-1.5 text-[14px] transition-all whitespace-nowrap h-9 min-h-9 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  activeTab === "overview" && "text-foreground bg-background shadow-sm"
                )}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab("pipeline")}
                className={cn(
                  "group relative flex items-center gap-1.5 px-3 py-1.5 text-[14px] transition-all whitespace-nowrap h-9 min-h-9 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  activeTab === "pipeline" && "text-foreground bg-background shadow-sm"
                )}
              >
                Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// BaseWidget component for CRM metrics
interface BaseWidgetProps {
  title: string;
  description: React.ReactNode;
  onClick?: () => void;
  actions: React.ReactNode;
  icon: React.ReactNode;
  children?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

function BaseWidget({
  children,
  onClick,
  title,
  description,
  actions,
  icon,
  trend,
}: BaseWidgetProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border p-3 h-[175px] flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-primary/20 group cursor-pointer rounded-lg"
      )}
      onClick={onClick}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            <h3 className="text-xs text-muted-foreground font-medium">{title}</h3>
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.positive ? "text-[#34A853] bg-[#34A853]/10" : "text-[#D93025] bg-[#D93025]/10"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>

        {typeof description === "string" ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : (
          description
        )}
      </div>

      <div>
        {children}

        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors duration-300">
          {actions}
        </span>
      </div>
    </div>
  );
}

// Pipeline Analytics View
function PipelineAnalytics({ period }: { period: string }) {
  const navigate = useNavigate();

  // Fetch all deals for analytics
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['pipeline-analytics', period],
    queryFn: () => dealsApi.getAll({ page: 0, size: 500 }),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading pipeline analytics...</p>
      </div>
    );
  }

  const allDeals = dealsData?.content || [];
  
  // Filter deals based on period
  const filterByPeriod = (deals: any[], period: string) => {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '1m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
      default:
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
    }
    
    return deals.filter(deal => {
      // Filter by createdAt date if available, otherwise include all deals
      if (!deal.createdAt) return true;
      const dealDate = new Date(deal.createdAt);
      return dealDate >= cutoffDate;
    });
  };

  const deals = filterByPeriod(allDeals, period);
  
  // Calculate analytics
  const stageData: Record<string, { count: number; value: number }> = {
    PROSPECTING: { count: 0, value: 0 },
    QUALIFICATION: { count: 0, value: 0 },
    PROPOSAL: { count: 0, value: 0 },
    NEGOTIATION: { count: 0, value: 0 },
    CLOSED_WON: { count: 0, value: 0 },
    CLOSED_LOST: { count: 0, value: 0 },
  };

  deals.forEach((deal: any) => {
    if (stageData[deal.stage]) {
      stageData[deal.stage].count++;
      stageData[deal.stage].value += deal.value || 0;
    }
  });

  const totalPipelineValue = Object.values(stageData).reduce((sum, s) => sum + s.value, 0);
  const totalDeals = deals.length;
  const avgDealSize = totalDeals > 0 ? totalPipelineValue / totalDeals : 0;
  const wonDeals = stageData.CLOSED_WON.count;
  const lostDeals = stageData.CLOSED_LOST.count;
  const winRate = wonDeals + lostDeals > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icons.DollarSign size={16} className="text-primary" />
            <h3 className="text-xs font-medium text-muted-foreground">Total Pipeline</h3>
          </div>
          <p className="text-2xl font-semibold">${(totalPipelineValue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground mt-1">{totalDeals} deals</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp size={16} className="text-green-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Win Rate</h3>
          </div>
          <p className="text-2xl font-semibold">{winRate.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">{wonDeals} won / {lostDeals} lost</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icons.BarChart size={16} className="text-blue-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Avg Deal Size</h3>
          </div>
          <p className="text-2xl font-semibold">${(avgDealSize / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground mt-1">across all stages</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/pipeline')}>
          <div className="flex items-center gap-2 mb-2">
            <Icons.Activity size={16} className="text-purple-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Active Deals</h3>
          </div>
          <p className="text-2xl font-semibold">{totalDeals - wonDeals - lostDeals}</p>
          <p className="text-xs text-primary mt-1">View pipeline →</p>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Icons.Pipeline size={18} className="text-primary" />
          Deal Stage Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(stageData)
            .filter(([stage]) => !stage.includes('CLOSED'))
            .map(([stage, data]) => {
              const percentage = totalDeals > 0 ? (data.count / totalDeals) * 100 : 0;
              const stageLabel = stage.replace(/_/g, ' ');
              
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{stageLabel.toLowerCase()}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{data.count} deals</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-500 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 justify-between text-xs">
                      {data.value > 0 && (
                        <span className="font-semibold text-primary-foreground drop-shadow">
                          ${(data.value / 1000000).toFixed(1)}M
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Value by Stage & Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Value by Stage */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Icons.PieChart size={18} className="text-primary" />
            Pipeline Value by Stage
          </h3>
          <div className="space-y-3">
            {Object.entries(stageData)
              .filter(([stage]) => !stage.includes('CLOSED') && stageData[stage].value > 0)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([stage, data]) => {
                const percentage = totalPipelineValue > 0 ? (data.value / totalPipelineValue) * 100 : 0;
                const stageLabel = stage.replace(/_/g, ' ');
                
                return (
                  <div key={stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-sm capitalize">{stageLabel.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${(data.value / 1000000).toFixed(1)}M</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Icons.Target size={18} className="text-primary" />
            Conversion Metrics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Prospecting → Qualification</span>
                <span className="text-sm font-medium">
                  {stageData.PROSPECTING.count > 0 
                    ? ((stageData.QUALIFICATION.count / stageData.PROSPECTING.count) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ 
                    width: `${stageData.PROSPECTING.count > 0 ? (stageData.QUALIFICATION.count / stageData.PROSPECTING.count) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Qualification → Proposal</span>
                <span className="text-sm font-medium">
                  {stageData.QUALIFICATION.count > 0 
                    ? ((stageData.PROPOSAL.count / stageData.QUALIFICATION.count) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ 
                    width: `${stageData.QUALIFICATION.count > 0 ? (stageData.PROPOSAL.count / stageData.QUALIFICATION.count) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Proposal → Negotiation</span>
                <span className="text-sm font-medium">
                  {stageData.PROPOSAL.count > 0 
                    ? ((stageData.NEGOTIATION.count / stageData.PROPOSAL.count) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ 
                    width: `${stageData.PROPOSAL.count > 0 ? (stageData.NEGOTIATION.count / stageData.PROPOSAL.count) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Negotiation → Closed Won</span>
                <span className="text-sm font-medium">
                  {stageData.NEGOTIATION.count > 0 
                    ? ((wonDeals / stageData.NEGOTIATION.count) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ 
                    width: `${stageData.NEGOTIATION.count > 0 ? (wonDeals / stageData.NEGOTIATION.count) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WidgetsGrid({ period }: { period: string }) {
  const navigate = useNavigate();
  
  // Fetch live insights (auto-refreshes every 60s)
  const { insights } = useInsights('dashboard');
  
  // Fetch dashboard stats with auto-refresh every 30 seconds
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch tasks for tasks due widget
  const { data: tasksData } = useQuery({
    queryKey: ['dashboard-tasks', period],
    queryFn: () => tasksApi.getAll({ page: 0, size: 100 }),
    refetchInterval: 30000,
  });

  // Fetch top deal by value (filtered by period)
  const { data: allDealsData } = useQuery({
    queryKey: ['dashboard-all-deals', period],
    queryFn: async () => {
      const response = await dealsApi.getAll({ page: 0, size: 500, sort: 'value,desc' });
      return response;
    },
    refetchInterval: 30000,
  });

  // Fetch upcoming events this week
  const { data: eventsData } = useQuery({
    queryKey: ['dashboard-events', period],
    queryFn: () => eventsApi.getAll({ page: 0, size: 100 }),
    refetchInterval: 30000,
  });

  // Filter deals by period and get top deal
  const filterByPeriod = (deals: any[], period: string) => {
    if (!deals?.length) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '1m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
      default:
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
    }
    
    return deals.filter(deal => {
      if (!deal.createdAt) return true;
      const dealDate = new Date(deal.createdAt);
      return dealDate >= cutoffDate;
    });
  };

  const filteredDeals = filterByPeriod(allDealsData?.content || [], period);
  const topDeal = filteredDeals[0] || null;

  const totalLeads = stats?.totalLeads || 0;
  const totalDeals = stats?.totalDeals || 0;
  const activeDeals = stats?.activeDeals || totalDeals;
  const totalRevenue = stats?.totalRevenue || 0;
  const conversionRate = stats?.conversionRate || 0;
  const winRate = stats?.winRate || 0;
  const stalledDealCount = stats?.stalledDealCount || 0;
  const dealsNeedingAttention = stats?.dealsNeedingAttention || 0;

  // Calculate tasks due today
  const today = new Date().toISOString().split('T')[0];
  const tasksDueToday = tasksData?.content?.filter(
    (task: any) => task.dueDate?.startsWith(today)
  ).length || 0;

  // Get first upcoming meeting this week
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = eventsData?.content?.filter(
    (event: any) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= now && eventDate <= weekEnd;
    }
  ) || [];
  const nextMeeting = upcomingEvents.sort((a: any, b: any) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )[0];

  // Count insights by type for dashboard widgets
  const closingSoonCount = insights.filter(i => i.type === 'closing_soon').length;
  const stuckDealsCount = insights.filter(i => i.type === 'stuck' && i.entity_type === 'deal').length;
  const overdueTasksCount = insights.filter(i => i.type === 'overdue').length;
  const hotLeadsCount = insights.filter(i => i.type === 'hot' && i.entity_type === 'lead').length;
  const atRiskDealsCount = insights.filter(i => i.type === 'at_risk' && i.entity_type === 'deal').length;

  if (statsLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 gap-y-4 mb-4">
      {/* Total Leads Widget */}
      <BaseWidget
        title="Total Leads"
        icon={<Icons.Users size={16} />}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">New leads this month</p>
            {hotLeadsCount > 0 && (
              <InsightBadge type="hot" label={`${hotLeadsCount} hot`} />
            )}
          </div>
        }
        actions="View all leads"
        onClick={() => navigate('/leads')}
      >
        <h2 className="text-xl font-semibold mb-1">{totalLeads}</h2>
      </BaseWidget>

      {/* Active Deals Widget */}
      <BaseWidget
        title="Active Deals"
        icon={<Icons.ArrowLeftRight size={16} />}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">Deals in pipeline</p>
            {closingSoonCount > 0 && (
              <InsightBadge type="closing_soon" label={`${closingSoonCount} closing soon`} />
            )}
            {stuckDealsCount > 0 && (
              <InsightBadge type="stuck" label={`${stuckDealsCount} stuck`} />
            )}
            {atRiskDealsCount > 0 && (
              <InsightBadge type="at_risk" label={`${atRiskDealsCount} at risk`} />
            )}
            {dealsNeedingAttention > 0 && (
              <InsightBadge type="overdue" label={`${dealsNeedingAttention} need action`} />
            )}
          </div>
        }
        actions="View pipeline"
        onClick={() => navigate('/pipeline')}
      >
        <h2 className="text-xl font-semibold mb-1">{activeDeals}</h2>
      </BaseWidget>

      {/* Revenue Widget */}
      <BaseWidget
        title="Revenue"
        icon={<Icons.Amount size={16} />}
        description={<p className="text-xs text-muted-foreground">Closed this quarter</p>}
        actions="View revenue report"
        onClick={() => navigate('/reports')}
      >
        <h2 className="text-xl font-semibold mb-1">${totalRevenue.toLocaleString()}</h2>
      </BaseWidget>

      {/* Conversion Rate Widget */}
      <BaseWidget
        title="Conversion Rate"
        icon={<Icons.TrendingUp size={16} />}
        description={<p className="text-xs text-muted-foreground">Lead to customer</p>}
        actions="View funnel"
        onClick={() => navigate('/pipeline')}
      >
        <h2 className="text-xl font-semibold mb-1">{conversionRate.toFixed(1)}%</h2>
      </BaseWidget>

      {/* Tasks Due Widget */}
      <BaseWidget
        title="Tasks Due"
        icon={<Icons.Clock size={16} />}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">Due today</p>
            {overdueTasksCount > 0 && (
              <InsightBadge type="overdue" label={`${overdueTasksCount} overdue`} />
            )}
          </div>
        }
        actions="View all tasks"
        onClick={() => navigate('/tasks')}
      >
        <h2 className="text-xl font-semibold mb-1">{tasksDueToday}</h2>
      </BaseWidget>

      {/* Meetings Widget */}
      <BaseWidget
        title="Meetings"
        icon={<Icons.Calendar size={16} />}
        description={<p className="text-xs text-muted-foreground">Scheduled this week</p>}
        actions="View calendar"
        onClick={() => navigate('/calendar')}
      >
        {nextMeeting ? (
          <>
            <div className="text-sm font-semibold mb-0.5 line-clamp-1">{nextMeeting.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(nextMeeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </>
        ) : (
          <h2 className="text-xl font-semibold mb-1">-</h2>
        )}
      </BaseWidget>

      {/* Top Account Widget */}
      <BaseWidget
        title="Top Account"
        icon={<Icons.Star size={16} />}
        description={<p className="text-xs text-muted-foreground">Highest deal value</p>}
        actions="View account"
        onClick={() => navigate('/companies')}
      >
        {topDeal ? (
          <>
            <div className="text-sm font-semibold mb-0.5">{(topDeal as any).companyName || topDeal.name}</div>
            <div className="text-xs text-muted-foreground">${(topDeal.value / 1000000).toFixed(1)}M</div>
          </>
        ) : (
          <div className="text-xl font-semibold mb-1">-</div>
        )}
      </BaseWidget>

      {/* Win Rate Widget */}
      <BaseWidget
        title="Win Rate"
        icon={<Icons.PieChart size={16} />}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">Deals won vs lost</p>
            {stalledDealCount > 0 && (
              <InsightBadge type="stuck" label={`${stalledDealCount} stalled`} />
            )}
          </div>
        }
        actions="View analytics"
        onClick={() => navigate('/reports')}
      >
        <h2 className="text-xl font-semibold mb-1">{winRate.toFixed(0)}%</h2>
      </BaseWidget>
    </div>
  );
}

// Suggested actions - CRM-focused quick actions
function SuggestedActions({ onSuggestionClick }: { onSuggestionClick: (prompt: string) => void }) {
  const allActions = [
    { icon: Icons.Plus, title: "Add Lead", prompt: "Help me add a new lead" },
    { icon: Icons.Users, title: "View Contacts", prompt: "Show me my contacts" },
    { icon: Icons.TrendingUp, title: "Sales Report", prompt: "Show me my sales performance" },
    { icon: Icons.Clock, title: "Follow-ups", prompt: "What follow-ups do I have today?" },
    { icon: Icons.PieChart, title: "Pipeline Analysis", prompt: "Analyze my sales pipeline" },
    { icon: Icons.Star, title: "Top Deals", prompt: "Show me my top deals" },
    { icon: Icons.Calendar, title: "Upcoming Meetings", prompt: "What meetings do I have coming up?" },
    { icon: Icons.Target, title: "Sales Goals", prompt: "How am I tracking against my sales goals?" },
    { icon: Icons.DollarSign, title: "Revenue Forecast", prompt: "What's my revenue forecast for this quarter?" },
    { icon: Icons.Users, title: "Team Performance", prompt: "Show me my team's performance" },
    { icon: Icons.AlertCircle, title: "At-Risk Deals", prompt: "Show me deals that are at risk" },
    { icon: Icons.TrendingUp, title: "Best Performers", prompt: "Who are my best performing sales reps?" },
  ];

  // Randomly select 6 actions on each render
  const [actions] = useState(() => {
    const shuffled = [...allActions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  });

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {actions.map((action, i) => {
        const IconComponent = action.icon;
        return (
          <button
            key={i}
            onClick={() => onSuggestionClick(action.prompt)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors rounded-md"
          >
            <IconComponent size={16} className="text-primary" />
            <span>{action.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// Dashboard chat input - inline conversation
const DashboardChatInput = forwardRef<{ submitQuery: (query: string) => void }>((_props, ref) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const { messages, addMessage, clearMessages } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentTool, setCurrentTool] = useState('');
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processQuery = async (query: string) => {
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: query };
    addMessage(userMsg);
    setIsConversationOpen(true); // Auto-open when sending message
    setIsLoading(true);
    setStreamingMessage('');
    setCurrentTool('');

    try {
      const { streamAgenticResponse } = await import('../lib/ai-api');
      let accumulatedMessage = '';

      // Convert messages to API format
      const apiMessages = [...messages, userMsg].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      for await (const event of streamAgenticResponse(apiMessages)) {
        if (event.type === 'token') {
          accumulatedMessage += event.content;
          setStreamingMessage(accumulatedMessage);
        } else if (event.type === 'tool_start') {
          setCurrentTool(event.tool || '');
        } else if (event.type === 'tool_end') {
          setCurrentTool('');
        } else if (event.type === 'done') {
          const assistantMsg = { 
            id: Date.now().toString(), 
            role: 'assistant' as const, 
            content: accumulatedMessage || 'I apologize, but I encountered an issue processing your request.' 
          };
          addMessage(assistantMsg);
          setStreamingMessage('');
          setCurrentTool('');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = { 
        id: Date.now().toString(), 
        role: 'assistant' as const, 
        content: 'I apologize, but I encountered an error. Please try again.' 
      };
      addMessage(errorMsg);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submitQuery: (query: string) => {
      setInput(query);
      processQuery(query);
    }
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    await processQuery(userMessage);
  };

  const handleClearConversation = () => {
    clearMessages();
    setStreamingMessage('');
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isConversationOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage, isConversationOpen]);

  return (
    <div className="mt-12 max-w-[770px] mx-auto">
      {/* Unified Chat Card */}
      <div className="border rounded-2xl bg-gradient-to-br from-card to-card/50 shadow-lg overflow-hidden backdrop-blur-sm">
        {/* Header - Collapsible when there are messages */}
        {messages.length > 0 && (
          <div className="border-b bg-muted/20">
            <div
              onClick={() => setIsConversationOpen(!isConversationOpen)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium">Conversation</span>
                <span className="text-xs text-muted-foreground">
                  {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/chat');
                  }}
                  className="px-2.5 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Open full chat"
                >
                  Expand
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearConversation();
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  title="Clear conversation"
                >
                  <X size={14} />
                </button>
                <Icons.ChevronDown 
                  size={16} 
                  className={cn(
                    "text-muted-foreground transition-transform duration-200",
                    isConversationOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages Area - Slides down when open */}
        {messages.length > 0 && isConversationOpen && (
          <div className="max-h-[400px] overflow-y-auto p-5 space-y-3 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border rounded-tl-sm'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex gap-2.5 animate-in fade-in">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 bg-card border border-border text-sm shadow-sm">
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                      }}
                    >
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Tool indicator */}
            {currentTool && (
              <div className="flex gap-2 items-center text-xs text-muted-foreground px-2">
                <Loader2 className="animate-spin" size={12} />
                <span>Using {currentTool}...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className={cn("p-4", messages.length > 0 && "pt-0")}>
          <form
            onSubmit={handleSubmit}
            className={cn(
              "w-full overflow-hidden rounded-xl",
              "bg-secondary",
              "border border-border",
              "transition-all duration-300 ease-in-out"
            )}
          >
            <div className="flex flex-col">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your CRM assistant anything..."
                  disabled={isLoading}
                  className={cn(
                    "w-full resize-none border-none p-3 pt-4 shadow-none outline-none ring-0 text-sm",
                    "bg-transparent placeholder:text-muted-foreground/50",
                    "min-h-[55px] max-h-[120px]",
                    "focus-visible:ring-0",
                    "disabled:opacity-50"
                  )}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Add attachment"
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Web search"
                  >
                    <Search size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Voice input"
                  >
                    <Mic size={16} />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "size-6 flex items-center justify-center rounded transition-colors",
                      input.trim() && !isLoading
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground cursor-not-allowed"
                    )}
                    title="Send message"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

DashboardChatInput.displayName = 'DashboardChatInput';

export function Widgets() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("1y");
  const [isCustomizing, setIsCustomizing] = useState(false);
  const chatInputRef = useRef<{ submitQuery: (query: string) => void }>(null);
  
  const handleSuggestionClick = (prompt: string) => {
    chatInputRef.current?.submitQuery(prompt);
  };
  
  const handleCustomizeToggle = () => {
    setIsCustomizing(!isCustomizing);
  };
  
  return (
    <div className="w-full">
      <div className="flex flex-col mt-6">
        <WidgetsHeader 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          period={period}
          setPeriod={setPeriod}
          isCustomizing={isCustomizing}
          onCustomizeToggle={handleCustomizeToggle}
        />
        {activeTab === "overview" && (
          <div className="mt-0">
            <WidgetsGrid period={period} />
            <SuggestedActions onSuggestionClick={handleSuggestionClick} />
            <DashboardChatInput ref={chatInputRef} />
          </div>
        )}
        {activeTab === "pipeline" && (
          <div className="mt-0">
            <PipelineAnalytics period={period} />
          </div>
        )}
      </div>
    </div>
  );
}
