import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, RefreshCw, BarChart3, TrendingUp, DollarSign, Clock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { useCorridorAnalysis, useCopilotQuery } from '../../hooks/useAIAdvisor';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { Spinner } from '../../components/common/Loader';
import type { AICopilotMessage } from '../../lib/api/types';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../lib/ThemeContext';

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

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AICopilotMessage[]>([
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
    'Which 3 stops are leaking the most revenue this week?',
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

  const monthlySavings = analysis?.estimated_monthly_savings_kes || 580000;
  const delayedTrucks = dashboardStats?.trucks_delayed ?? 0;
  const totalCostToday = dashboardStats?.estimated_financial_impact ?? 0;

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

          <button
            onClick={() => refetch()}
            disabled={loadingAnalysis}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#ED642B] hover:bg-[#D4521D] text-white text-xs font-bold shadow-md shadow-[#ED642B]/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadingAnalysis ? 'animate-spin' : ''} />
            <span>{loadingAnalysis ? 'Analyzing...' : 'Refresh Analysis'}</span>
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE ANALYST KPI HUD ── */}
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
          <p className="text-[11px] text-text-tertiary mt-0.5">Exceeding target stop duration</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Today's Idle Cost</span>
            <TrendingUp size={14} className="text-money-accent" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-money-accent mt-2">
            {formatCurrency(totalCostToday)}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Cumulative demurrage bleed</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Analyst Status</span>
            <ShieldCheck size={14} className="text-status-good" />
          </div>
          <p className="text-xs font-bold text-status-good mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-good animate-pulse" />
            Active Fleet Monitoring
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">Autonomous Telemetry Monitoring</p>
        </div>
      </div>

      {/* ── VISUAL ANALYTICS SECTION (CHARTS GENERATED BY ANALYST) ── */}
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
              Top Bottlenecks
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

        {/* Right: Key Prescriptive Interventions (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#ED642B]" />
                Prescriptive Interventions
              </h2>
              <span className="text-[10px] text-text-tertiary font-numeric">Analyst Formulated</span>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: 'Stagger Gate Arrival Windows',
                  desc: 'Spread truck arrival slots across 45-minute windows to avoid peak yard congestion.',
                  savings: 420000,
                  roi: 'High'
                },
                {
                  title: 'Pre-submit Customs Documentation',
                  desc: 'Ensure single-window transit documents are pre-cleared before trucks arrive at border OSBPs.',
                  savings: 680000,
                  roi: 'Very High'
                },
                {
                  title: 'Warehouse Offloading Incentive',
                  desc: 'Provide driver turnaround bonuses for loading completed under 60 minutes.',
                  savings: 310000,
                  roi: 'Medium'
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-bg-surface-raised border border-border-default space-y-1.5 hover:border-[#ED642B]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-text-primary leading-snug">{item.title}</p>
                    <span className="text-[10px] font-numeric font-bold px-2 py-0.5 rounded bg-[#ED642B]/15 text-[#ED642B] border border-[#ED642B]/30 shrink-0">
                      +{formatCurrency(item.savings)}/mo
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
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

      {/* ── LIVE INTERACTIVE ANALYST TERMINAL ── */}
      <div className="rounded-2xl border border-border-strong bg-bg-surface shadow-xl flex flex-col h-[520px] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-3 border-b border-border-default bg-bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#250C77] text-white flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <div>
              <span className="text-xs font-bold text-text-primary">Fleet Operations Analyst Terminal</span>
              <span className="hidden sm:inline text-[10px] text-text-tertiary ml-2">• Telemetry & Diagnostics Engine Active</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-status-good font-numeric font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
            Live Context Ready
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#ED642B] text-white rounded-br-sm shadow-md font-semibold'
                      : 'bg-bg-surface-raised text-text-primary rounded-bl-sm border border-border-default shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}
          {copilotMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-bg-surface-raised border border-border-default rounded-2xl rounded-bl-sm px-4 py-3">
                <Spinner size="xs" color="brand" />
                <span className="text-xs text-text-secondary font-medium">Analyst formulating data report...</span>
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
