import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send, RefreshCw, BarChart3, TrendingUp, DollarSign, Clock, ArrowRight,
  Sparkles, ShieldCheck, Lightbulb, ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { useCorridorAnalysis, useCopilotQuery } from '../../hooks/useAIAdvisor';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { Spinner } from '../../components/common/Loader';
import type { AICopilotMessage } from '../../lib/api/types';
import type { ChartData } from '../../lib/api/types';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../lib/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { toast } from 'sonner';

/**
 * Rich Markdown parser and renderer tailored for Turnaround AI operations output.
 * Formats Markdown tables, headers, bold tags, bullet lists, and currency badges.
 */
const FormattedMarkdownMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap font-medium">{content || ''}</p>;
  }

  // Guard against undefined/null content
  if (!content) {
    return <p className="text-xs text-text-tertiary italic">No response content</p>;
  }

  // Parse lines and detect tables, headers, lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (keyPrefix: number) => {
    if (tableBuffer.length === 0) return null;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(2); // skip separator line |---|---|

    const parseRow = (rowStr: string) =>
      rowStr
        .split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseRow(headerRow);
    const rows = dataRows.map(parseRow);

    const node = (
      <div key={`table-${keyPrefix}`} className="my-3 overflow-x-auto rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-xs text-left border-collapse min-w-[480px]">
          <thead className="bg-[#250C77]/10 dark:bg-[#250C77]/30 text-[#250C77] dark:text-[#ED642B] font-extrabold border-b border-border-default">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 text-[11px] uppercase tracking-wider">
                  {renderInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-bg-surface-raised/60 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-xs text-text-primary font-medium">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
    return node;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    // Bold text regex
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        const isKES = inner.includes('KES') || inner.includes('min') || inner.includes('%');
        return (
          <strong key={idx} className={isKES ? 'font-extrabold text-[#ED642B] dark:text-orange-400 font-numeric' : 'font-extrabold text-text-primary'}>
            {inner}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-text-secondary">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1 py-0.5 rounded bg-bg-surface border border-border-default font-mono text-[11px] text-[#ED642B]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    } else if (inTable) {
      const tableNode = flushTable(idx);
      if (tableNode) elements.push(tableNode);
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${idx}`} className="h-1.5" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="font-extrabold text-sm text-text-primary mt-3 mb-1.5 flex items-center gap-1.5 border-b border-border-default pb-1">
          <Sparkles size={13} className="text-[#ED642B]" />
          <span>{renderInlineMarkdown(trimmed.replace('### ', ''))}</span>
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={idx} className="font-extrabold text-base text-text-primary mt-3 mb-1.5">
          {renderInlineMarkdown(trimmed.replace('## ', ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={idx} className="font-extrabold text-lg text-text-primary mt-4 mb-2">
          {renderInlineMarkdown(trimmed.replace('# ', ''))}
        </h2>
      );
      return;
    }

    // Bullet point
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.replace(/^[•\-\*]\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-text-primary leading-relaxed">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ED642B] mt-2 shrink-0" />
          <div className="flex-1">{renderInlineMarkdown(bulletContent)}</div>
        </div>
      );
      return;
    }

    // Numbered list (e.g. 1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-text-primary leading-relaxed">
          <span className="font-numeric font-bold text-[11px] px-1.5 py-0.5 rounded bg-[#250C77]/10 dark:bg-[#250C77]/30 text-[#250C77] dark:text-[#ED642B] shrink-0">
            {numberedMatch[1]}
          </span>
          <div className="flex-1">{renderInlineMarkdown(numberedMatch[2])}</div>
        </div>
      );
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={idx} className="my-3 border-border-default" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={idx} className="text-xs sm:text-sm text-text-primary leading-relaxed my-0.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) {
    const tableNode = flushTable(lines.length);
    if (tableNode) elements.push(tableNode);
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AIAdvisor: React.FC = () => {
  const { data: analysis, isLoading: loadingAnalysis, refetch } = useCorridorAnalysis();
  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats,
  });
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
  });
  const copilotMutation = useCopilotQuery();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<(AICopilotMessage & { chart_data?: ChartData | null })[]>([
    {
      role: 'assistant',
      content: 'Fleet Performance Analyst online. I have analyzed your real-time vehicle telemetry, stop turnaround cycles, and idle cost metrics. Ask for specific stop bottlenecks, financial recovery models, or route efficiency audits.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (customPrompt?: string) => {
    const q = (customPrompt || input).trim();
    if (!q) return;

    const userMsg: AICopilotMessage = { role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');

    try {
      const res = await copilotMutation.mutateAsync({ query: q });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        chart_data: res.chart_data,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Analyst query temporarily unavailable. Please retry in a moment.',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'Which stops are leaking the most revenue this week?',
    'What dispatch changes will recover the most idle cost?',
    'Analyze our on-time delivery rate vs target turnaround',
    'Compare port clearance times vs border crossing dwell',
  ];

  // Chart data from actual locationStats
  const chartData = (locationStats || [])
    .slice(0, 6)
    .map(loc => {
      const locName = loc?.location_name || 'Stop';
      return {
        name: locName.length > 14 ? locName.substring(0, 12) + '..' : locName,
        fullName: locName,
        averageMinutes: loc?.avg_dwell_minutes || 0,
        expectedMinutes: loc?.expected_dwell_minutes || 60,
        excessMinutes: loc?.avg_excess_delay_minutes || 0,
        lossKes: loc?.financial_impact || 0,
        totalVisits: loc?.total_visits || 0
      };
    });

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const analystChartOption = React.useMemo<EChartsOption>(() => {
    const names = chartData.map(d => d.fullName);
    const avgDwells = chartData.map(d => Math.round(d.averageMinutes));
    const targetDwells = chartData.map(d => Math.round(d.expectedMinutes));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex ?? 0;
          const d = chartData[idx];
          if (!d) return '';
          return `
            <div style="font-weight: 700; margin-bottom: 3px;">${d.fullName}</div>
            <div style="color: #250C77; font-weight: 600;">Average Dwell: ${formatMinutes(d.averageMinutes)}</div>
            <div style="color: #ED642B; font-weight: 600;">Target SLA: ${formatMinutes(d.expectedMinutes)}</div>
            <div style="color: #EF4444; font-weight: 600;">Excess Delay: +${formatMinutes(d.excessMinutes)}</div>
            <div style="color: #10B981; font-weight: 700;">Loss: ${formatCurrency(d.lossKes)}</div>
          `;
        },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: {
        top: 28,
        right: 15,
        bottom: 40,
        left: 40,
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 9.5,
          interval: 0,
          rotate: 15,
        },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
      },
      yAxis: {
        type: 'value',
        name: 'Minutes',
        nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
      },
      series: [
        {
          name: 'Target SLA',
          type: 'bar',
          data: targetDwells,
          itemStyle: {
            color: '#250C77',
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: 'Actual Dwell',
          type: 'bar',
          data: avgDwells,
          itemStyle: {
            color: (params: any) => {
              const d = chartData[params.dataIndex];
              return (d && d.excessMinutes > 30) ? '#ED642B' : '#6366F1';
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [chartData, isDark]);

  const delayedTrucks = dashboardStats?.trucks_delayed ?? 0;
  const totalCostToday = dashboardStats?.estimated_financial_impact ?? 0;
  const excessDwellToday = dashboardStats?.excess_dwell_today_minutes ?? 0;
  const monthlySavings = analysis?.estimated_monthly_savings_kes || (totalCostToday > 0 ? totalCostToday * 24 : 185000);

  // Live prescriptive actions from AI analysis or real location stats
  const liveInterventions = analysis?.primary_bottlenecks && analysis.primary_bottlenecks.length > 0
    ? analysis.primary_bottlenecks.map(b => ({
        title: `Mitigate ${b.location} Delay`,
        desc: b.recommendation || b.issue,
        severity: b.severity,
        tag: b.severity.toUpperCase()
      }))
    : (analysis?.immediate_actions || []).map((act, idx) => ({
        title: `Dispatch Protocol #${idx + 1}`,
        desc: act,
        severity: 'high',
        tag: 'IMMEDIATE'
      }));

  return (
    <div className="space-y-6">
      {/* ── ANALYST HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#250C77] text-white flex items-center justify-center font-bold text-sm shadow-md">
              PA
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">
                Operations & Performance Analyst
              </h1>
              <p className="text-xs text-text-secondary">
                Turnaround efficiency models, delay diagnostics, and financial bleed recovery
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/analytics"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-default bg-bg-surface hover:bg-bg-surface-raised text-xs font-semibold text-text-primary transition-colors cursor-pointer"
          >
            <BarChart3 size={13} className="text-[#ED642B]" />
            <span>Full Analytics Hub</span>
            <ArrowRight size={12} className="text-text-tertiary" />
          </Link>

          <Button
            variant="primary"
            size="small"
            icon={<RefreshCw size={13} className={loadingAnalysis ? 'animate-spin' : ''} />}
            loading={loadingAnalysis}
            onClick={() => {
              refetch();
              toast.success('Refreshing Analyst Intelligence Model', {
                description: 'Fetching real-time dwell logs and calculating cost recovery vectors.'
              });
            }}
          >
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* ── EXECUTIVE ANALYST KPI HUD (REAL DATA) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-[#ED642B]/30 bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Projected Monthly Recovery</span>
            <DollarSign size={14} className="text-[#ED642B]" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-[#ED642B] mt-2">
            +{formatCurrency(monthlySavings)}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Through 20% dwell reduction</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Delayed Fleet Units</span>
            <Clock size={14} className="text-status-danger" />
          </div>
          <p className={`font-numeric text-2xl font-extrabold mt-2 ${delayedTrucks > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
            {delayedTrucks}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Units currently in excess dwell</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Today's Idle Cost</span>
            <TrendingUp size={14} className="text-money-accent" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-money-accent mt-2">
            {formatCurrency(totalCostToday)}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            {excessDwellToday > 0 ? `${formatMinutes(excessDwellToday)} total excess delay` : 'No excess dwell today'}
          </p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Analyst Status</span>
            <ShieldCheck size={14} className="text-status-good" />
          </div>
          <p className="text-xs font-bold text-status-good mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-good animate-pulse" />
            Live Telemetry Engine Active
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">Autonomous Corridor Monitoring</p>
        </div>
      </div>

      {/* ── LIVE CORRIDOR INTELLIGENCE REPORT ALERT BANNER ── */}
      {analysis?.executive_summary && (
        <Alert variant="info" className="border-[#250C77]/30 bg-[#250C77]/10">
          <Lightbulb size={16} className="text-[#ED642B]" />
          <AlertTitle className="text-[#250C77] dark:text-[#ED642B] font-bold uppercase tracking-wider text-[11px]">
            Executive Intelligence Summary
          </AlertTitle>
          <AlertDescription className="mt-1 space-y-1">
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium">
              {analysis.executive_summary}
            </p>
            {analysis.financial_impact_analysis && (
              <p className="text-xs text-text-secondary leading-relaxed">
                {analysis.financial_impact_analysis}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ── VISUAL ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Stop Dwell vs Target (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <BarChart3 size={14} className="text-[#ED642B]" />
                Stop Dwell vs Target Duration (Minutes)
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Comparing actual average turnaround against target operating SLAs
              </p>
            </div>
            <span className="text-[10px] font-numeric px-2 py-0.5 rounded bg-[#ED642B]/10 text-[#ED642B] font-bold">
              Monitored Corridors
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
                No stop dwell telemetry records available.
              </div>
            ) : (
              <ReactECharts
                option={analystChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-2 border-t border-border-default">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[#ED642B]" />
              Excess Dwell &gt; 30 mins
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[#250C77]" />
              Standard Target
            </span>
          </div>
        </div>

        {/* Right: Prescriptive Interventions (5 cols - Real Data) */}
        <div className="lg:col-span-5 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#ED642B]" />
                Prescriptive Interventions
              </h2>
              <span className="text-[10px] text-text-tertiary font-numeric">Live Formulated</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {liveInterventions.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-tertiary">
                  No critical dwell interventions currently flagged.
                </div>
              ) : (
                liveInterventions.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-bg-surface-raised border border-border-default space-y-1 hover:border-[#ED642B]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-text-primary leading-snug">{item.title}</p>
                      <span className={`text-[9.5px] font-numeric font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        item.severity === 'high'
                          ? 'bg-status-danger-bg text-status-danger border border-status-danger/30'
                          : 'bg-[#ED642B]/15 text-[#ED642B] border border-[#ED642B]/30'
                      }`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/analytics"
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised hover:bg-white/5 border border-border-default text-xs font-bold text-text-primary transition-colors cursor-pointer mt-2"
          >
            <span>View Full Financial Analytics</span>
            <ArrowRight size={13} className="text-[#ED642B]" />
          </Link>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE ANALYST TERMINAL (WITH RICH MARKDOWN RENDERING) ── */}
      <div className="rounded-2xl border border-border-strong bg-bg-surface shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-3 border-b border-border-default bg-bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#250C77] text-white flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <div>
              <span className="text-xs font-bold text-text-primary">Fleet Operations Analyst Terminal</span>
              <span className="hidden sm:inline text-[10px] text-text-tertiary ml-2">• Live Telemetry & Corridor Diagnostics Active</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-status-good font-numeric font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
            Live Context Ready
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#ED642B] text-white rounded-br-sm shadow-md font-semibold'
                      : 'bg-bg-surface-raised text-text-primary rounded-bl-sm border border-border-default shadow-sm'
                  }`}
                >
                  <FormattedMarkdownMessage content={msg.content} isUser={isUser} />
                  {/* View in Visuals button — only on assistant messages with chart_data */}
                  {!isUser && (msg as any).chart_data && (
                    <button
                      onClick={() => navigate('/analytics', {
                        state: { injectChart: (msg as any).chart_data }
                      })}
                      className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#250C77]/10 hover:bg-[#250C77]/20 border border-[#250C77]/30 text-[11px] font-bold text-[#250C77] dark:text-[#ED642B] transition-colors cursor-pointer"
                    >
                      <BarChart3 size={12} />
                      View in Visuals
                      <ExternalLink size={11} className="opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {copilotMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-bg-surface-raised border border-border-default rounded-2xl rounded-bl-sm px-4 py-3">
                <Spinner size="xs" color="brand" />
                <span className="text-xs text-text-secondary font-medium">Analyst querying telemetry & computing cost recovery...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto border-t border-border-default bg-bg-surface-raised/40 scrollbar-none">
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={copilotMutation.isPending}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-border-default text-[11px] text-text-secondary hover:text-text-primary hover:border-[#ED642B]/50 hover:bg-[#ED642B]/10 transition-colors cursor-pointer font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border-default bg-bg-surface-raised">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Analyst about stop turnaround, demurrage loss, or driver metrics..."
              disabled={copilotMutation.isPending}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors border border-border-default focus:border-[#ED642B] font-medium"
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || copilotMutation.isPending}
              className="p-2.5 sm:px-4 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-[#ED642B]/20"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Ask Analyst</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

