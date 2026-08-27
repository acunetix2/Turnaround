import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Brain,
  Filter,
  DollarSign,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  MapPin
} from 'lucide-react';
import type { SeverityType } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';

export const Insights: React.FC = () => {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch Insights
  const { data: insights, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights'],
    queryFn: apiClient.getInsights
  });

  // Fetch Locations (for filter dropdown)
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations
  });

  // Trigger analysis mutation
  const analysisMutation = useMutation({
    mutationFn: apiClient.triggerAnalysis,
    onSuccess: (data) => {
      queryClient.setQueryData(['insights'], data);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setToastMessage('Fleet analysis completed. Operational insights database updated.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    },
    onError: () => {
      setToastMessage('Critical error: Analytical engine failed to calculate patterns.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  });

  const handleRunAnalysis = () => {
    analysisMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-full bg-bg-surface-raised rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-bg-surface-raised rounded-lg"></div>
          <div className="h-48 bg-bg-surface-raised rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (isError || !insights) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <Brain size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mt-2">Failed to load system insights</h2>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filters logic
  const filteredInsights = insights.filter((ins) => {
    const matchesSeverity = severityFilter === 'all' || ins.severity === severityFilter;
    const matchesLocation = locationFilter === 'all' || ins.location_id === locationFilter;
    return matchesSeverity && matchesLocation;
  });

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-ui text-xl font-bold text-text-primary">System Insights</h1>
          <p className="text-xs text-text-secondary mt-1">
            Pluggable rule-based anomalies, bottleneck detections, and scheduling recommendations.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analysisMutation.isPending}
          className="flex items-center justify-center gap-1.5 rounded bg-brand-500 hover:bg-brand-400 px-3.5 py-2 text-xs font-bold text-white shadow disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={analysisMutation.isPending ? 'animate-spin' : ''} />
          {analysisMutation.isPending ? 'Processing Analytics...' : 'Run Operational Scan'}
        </button>
      </div>

      {/* Filter HUD */}
      <div className="flex flex-col sm:flex-row gap-4 bg-bg-surface p-4 rounded-xl border border-border-default">
        {/* Severity filter */}
        <div className="flex-1">
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'high', label: 'High Severity' },
              { value: 'medium', label: 'Medium Severity' },
              { value: 'low', label: 'Low Severity' },
            ]}
          />
        </div>

        {/* Location filter */}
        <div className="flex-1">
          <Select
            value={locationFilter}
            onChange={setLocationFilter}
            options={[
              { value: 'all', label: 'All Facilities' },
              ...(locations || []).map((l) => ({
                value: l.id,
                label: l.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* Insights Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredInsights.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-border-default rounded-xl bg-bg-surface py-20">
            <Sparkles size={24} className="text-text-tertiary mb-2" />
            <span className="text-sm font-semibold text-text-primary">No Anomalies Detected</span>
            <p className="text-xs text-text-secondary mt-1">
              Select other filters or click "Run Operational Scan" to ingest new telematic streams.
            </p>
          </div>
        ) : (
          filteredInsights.map((ins) => (
            <div key={ins.id} className="panel-elevated bg-bg-surface p-5 flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="flex items-center justify-between gap-4">
                  {/* Severity Badge (Section 7 Spec) */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize ${
                    ins.severity === 'high'
                      ? 'bg-status-danger-bg text-status-danger'
                      : ins.severity === 'medium'
                      ? 'bg-status-warning-bg text-status-warning'
                      : 'bg-status-good-bg text-status-good'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      ins.severity === 'high' ? 'bg-status-danger' : ins.severity === 'medium' ? 'bg-status-warning' : 'bg-status-good'
                    }`} />
                    {ins.severity} Alert
                  </span>

                  {/* Leakage Cost emphasis */}
                  <div className="text-right">
                    <span className="text-[10px] text-text-secondary block">Monthly Loss</span>
                    <span className="font-numeric text-xs font-bold text-money-accent">
                      {formatCurrency(ins.financial_impact)}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="mt-3 font-ui text-sm font-bold text-text-primary">
                  {ins.title}
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  {ins.description}
                </p>

                {/* Recommendation Box - left border accent, muted bg (Section 8 Spec) */}
                <div className="mt-4 border-l-2 border-brand-500 bg-bg-surface-raised p-3 rounded-r-md">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">
                    <TrendingUp size={12} />
                    Recommended Action
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">
                    {ins.recommendation}
                  </p>
                </div>
              </div>

              {/* Bottom Metadata Link */}
              <div className="mt-5 pt-3 border-t border-border-default flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-text-tertiary">
                  <Clock size={12} />
                  <span>Detected {formatDateTime(ins.created_at).split(',')[0]}</span>
                </div>
                <Link
                  to={`/locations/${ins.location_id}`}
                  className="flex items-center gap-1 font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Analyze Bottleneck
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Status Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[1200] max-w-sm rounded-lg bg-bg-surface-raised border border-border-strong px-4 py-3 shadow-2xl animate-fade-in flex items-center gap-3">
          <Brain size={18} className="text-brand-400 shrink-0" />
          <span className="text-xs text-text-primary">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};



