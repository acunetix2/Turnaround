import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { Link } from 'react-router-dom';
import {
  Brain, ArrowRight, RefreshCw, Sparkles,
  AlertTriangle, MapPin, CheckCircle2
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';

export const Insights: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const { data: rawInsights, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights'],
    queryFn: apiClient.getInsights
  });

  // Normalize: backend may return an array or a paginated object
  const insights: any[] = Array.isArray(rawInsights)
    ? rawInsights
    : (rawInsights as any)?.items ?? [];

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations
  });

  const analysisMutation = useMutation({
    mutationFn: apiClient.triggerAnalysis,
    onSuccess: (data) => {
      queryClient.setQueryData(['insights'], data);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast({
        variant: 'success',
        title: 'Delay Check Complete',
        message: 'Delay patterns updated with latest tracking data.'
      });
    },
    onError: () => {
      toast({
        variant: 'error',
        title: 'Check Failed',
        message: 'Could not refresh delay patterns right now.'
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-surface-raised rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-bg-surface-raised rounded-xl" />
          <div className="h-64 bg-bg-surface-raised rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <Brain size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Unable to load delay reports</h2>
        <p className="text-xs text-text-secondary mt-1">Please check your connection and try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredInsights = insights.filter((ins) => {
    const matchesSeverity = severityFilter === 'all' || ins.severity === severityFilter;
    const matchesLocation = locationFilter === 'all' || ins.location_id === locationFilter;
    return matchesSeverity && matchesLocation;
  });

  const highCount = insights.filter((i) => i.severity === 'high').length;
  const medCount = insights.filter((i) => i.severity === 'medium').length;
  const lowCount = insights.filter((i) => i.severity === 'low').length;
  const totalSavings = insights.reduce((acc, i) => acc + (i.financial_impact || 0), 0);

  const locOptions = [
    { value: 'all', label: 'All Monitored Locations' },
    ...(locations || []).map((l) => ({ value: l.id, label: l.name }))
  ];

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Delay Reports & Causes</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Identified delay patterns, facility dwell warnings, and suggested operational actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/ai-advisor"
            className="flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-2 text-xs font-semibold text-brand-400 transition-colors"
          >
            <Sparkles size={13} />
            Smart Assistant
          </Link>

          <button
            onClick={() => analysisMutation.mutate()}
            disabled={analysisMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={analysisMutation.isPending ? 'animate-spin' : ''} />
            {analysisMutation.isPending ? 'Checking Delays...' : 'Check for Delays'}
          </button>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Detected Bottlenecks</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">{insights.length}</span>
            <span className="text-[11px] text-text-tertiary">open patterns</span>
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${
          highCount > 0 ? 'bg-status-danger-bg/40 border-status-danger/40' : 'bg-bg-surface border-border-default'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Critical Severity</span>
            {highCount > 0 && <AlertTriangle size={13} className="text-status-danger" />}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-numeric text-2xl font-bold ${highCount > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
              {highCount}
            </span>
            <span className="text-[11px] text-text-tertiary">urgent dispatch actions</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">High / Moderate Alerts</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-status-warning">{medCount + lowCount}</span>
            <span className="text-[11px] text-text-tertiary">monitored</span>
          </div>
        </div>

        <div className="rounded-xl border border-money-accent/25 bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-money-accent">Financial Waste Impact</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-money-accent">{formatCurrency(totalSavings)}</span>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default shadow-sm">
        <div className="w-full sm:w-56">
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            options={[
              { value: 'all', label: 'All Severity Levels' },
              { value: 'high', label: 'Critical / High Severity' },
              { value: 'medium', label: 'Medium Severity' },
              { value: 'low', label: 'Low Severity' },
            ]}
          />
        </div>

        <div className="w-full sm:w-72">
          <Select
            value={locationFilter}
            onChange={setLocationFilter}
            options={locOptions}
          />
        </div>
      </div>

      {/* ── INSIGHTS CARDS GRID ── */}
      {filteredInsights.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface p-12 text-center">
          <CheckCircle2 size={36} className="text-status-good mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-text-primary">No Anomalies Found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            All corridor assets are operating within expected turnaround benchmarks for the chosen filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights.map((ins) => {
            const isHigh = ins.severity === 'high';
            const isMed = ins.severity === 'medium';

            return (
              <div
                key={ins.id}
                className={`rounded-xl border bg-bg-surface p-5 shadow-sm flex flex-col justify-between space-y-4 ${
                  isHigh ? 'border-status-danger/40' : isMed ? 'border-status-warning/40' : 'border-border-default'
                }`}
              >
                {/* Header: Severity + Title + Timestamp */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase font-numeric ${
                      isHigh
                        ? 'bg-status-danger-bg text-status-danger border-status-danger/30'
                        : isMed
                        ? 'bg-status-warning-bg text-status-warning border-status-warning/30'
                        : 'bg-status-good-bg text-status-good border-status-good/30'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isHigh ? 'bg-status-danger status-dot-pulse' : isMed ? 'bg-status-warning' : 'bg-status-good'}`} />
                      {ins.severity} Severity
                    </span>

                    <span className="font-numeric text-[11px] text-text-tertiary">
                      {formatDateTime(ins.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    {ins.title}
                  </h3>

                  {ins.location_name && (
                    <Link
                      to={ins.location_id ? `/locations/${ins.location_id}` : '/locations'}
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium mt-1 transition-colors"
                    >
                      <MapPin size={11} />
                      <span>{ins.location_name}</span>
                    </Link>
                  )}

                  {/* Description */}
                  <p className="text-xs text-text-secondary leading-relaxed mt-2.5">
                    {ins.description}
                  </p>
                </div>

                {/* Structured Recommendation Action */}
                {ins.recommendation && (
                  <div className="rounded-lg bg-bg-surface-raised border-l-2 border-brand-500 border-r border-t border-b border-border-default p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-1">
                      Recommended Dispatch Action
                    </span>
                    <p className="text-xs text-text-primary leading-relaxed font-medium">
                      {ins.recommendation}
                    </p>
                  </div>
                )}

                {/* Footer: Financial Waste & Quick Jump */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between">
                  {ins.financial_impact ? (
                    <div>
                      <span className="text-[10px] uppercase text-text-tertiary block">Financial Impact</span>
                      <span className="font-numeric text-xs font-bold text-money-accent">
                        {formatCurrency(ins.financial_impact)}
                      </span>
                    </div>
                  ) : <div />}

                  <Link
                    to="/ai-advisor"
                    className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <span>Simulate in Advisor</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
