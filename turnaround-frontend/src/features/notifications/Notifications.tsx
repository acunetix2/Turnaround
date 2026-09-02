import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, AlertTriangle, CheckCircle2, Clock, Truck, MapPin,
  DollarSign, FileCheck, Check, RefreshCw, Filter, ArrowRight,
  Trash2, Users, Settings2,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/format';
import { formatCurrency } from '../../lib/format';
import type { AppNotification } from '../../lib/api/types';

// ── Config ─────────────────────────────────────────────────────────────────

const SEV_CFG = {
  high:   { cls: 'bg-red-500/10 border-red-500/25',          icon: <AlertTriangle size={14} className="text-red-500" />,    dot: 'bg-red-500'     },
  medium: { cls: 'bg-amber-500/10 border-amber-500/25',      icon: <Clock size={14} className="text-amber-500" />,          dot: 'bg-amber-400'   },
  low:    { cls: 'bg-emerald-500/10 border-emerald-500/25',  icon: <CheckCircle2 size={14} className="text-emerald-500" />, dot: 'bg-emerald-500' },
  info:   { cls: 'bg-[#250C77]/8 border-[#250C77]/20',      icon: <Bell size={14} className="text-[#250C77]" />,           dot: 'bg-[#250C77]'   },
} as const;

const CAT_ICON: Record<string, React.ReactNode> = {
  delay:      <Clock size={11} />,
  demurrage:  <DollarSign size={11} />,
  gate_pass:  <FileCheck size={11} />,
  trip:       <Truck size={11} />,
  user:       <Users size={11} />,
  system:     <Settings2 size={11} />,
};

const CAT_LABEL: Record<string, string> = {
  delay: 'Delay', demurrage: 'Demurrage', gate_pass: 'Gate Pass',
  trip: 'Dispatch', user: 'User', system: 'System',
};

type FilterVal = 'all' | 'unread' | 'high' | 'medium' | 'delay' | 'demurrage' | 'gate_pass' | 'trip' | 'user';

// ── Component ───────────────────────────────────────────────────────────────

export const Notifications: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterVal>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => apiClient.getNotifications({
      unread_only: filter === 'unread',
      category: ['delay','demurrage','gate_pass','trip','user'].includes(filter) ? filter : undefined,
      limit: 100,
    }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const items: AppNotification[] = data?.items ?? [];
  const unread = data?.unread ?? 0;
  const total  = data?.total  ?? 0;

  // Severity filter applied client-side
  const filtered = items.filter(n => {
    if (filter === 'high' || filter === 'medium') return n.severity === filter;
    return true;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const readMutation = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: invalidate,
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'All marked as read' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteNotification(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md relative">
            <Bell size={18} className="text-[#ED642B]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Notifications</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {unread > 0 ? `${unread} unread alert${unread !== 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending}>
            <Check size={12} className="mr-1" /> Mark all read
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: total,                                   color: 'text-text-primary' },
          { label: 'Unread',   value: unread,                                  color: 'text-[#250C77]' },
          { label: 'Critical', value: items.filter(n=>n.severity==='high').length,   color: 'text-red-500' },
          { label: 'Warnings', value: items.filter(n=>n.severity==='medium').length, color: 'text-amber-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-1">{label}</p>
            <p className={`text-2xl font-black font-numeric ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-bg-surface p-3 rounded-xl border border-border-default">
        <Filter size={12} className="text-text-tertiary shrink-0 mr-1" />
        {([
          { id: 'all',       label: 'All' },
          { id: 'unread',    label: 'Unread' },
          { id: 'high',      label: 'Critical' },
          { id: 'medium',    label: 'Warnings' },
          { id: 'delay',     label: 'Delays' },
          { id: 'demurrage', label: 'Demurrage' },
          { id: 'gate_pass', label: 'Gate Passes' },
          { id: 'trip',      label: 'Dispatches' },
          { id: 'user',      label: 'Team' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
              filter === id ? 'bg-[#250C77] text-white' : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border-default bg-bg-surface p-4 animate-pulse flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-bg-surface-raised shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-bg-surface-raised rounded w-1/3" />
                <div className="h-2.5 bg-bg-surface-raised rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface p-12 text-center">
          <Bell size={28} className="mx-auto mb-3 opacity-20 text-[#250C77]" />
          <p className="text-sm font-semibold text-text-secondary">No notifications</p>
          <p className="text-xs text-text-tertiary mt-1">You're all caught up. Alerts appear here as actions occur.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const sev = SEV_CFG[n.severity] ?? SEV_CFG.info;
            const isUnread = !n.read;
            return (
              <div key={n.id}
                className={`rounded-xl border p-4 transition-all ${sev.cls} ${isUnread ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    n.severity === 'high' ? 'bg-red-500/15' :
                    n.severity === 'medium' ? 'bg-amber-500/15' :
                    n.severity === 'info' ? 'bg-[#250C77]/10' : 'bg-emerald-500/15'
                  }`}>
                    {sev.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-text-primary">{n.title}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-surface border border-border-default text-text-tertiary font-medium">
                          {CAT_ICON[n.category]}{CAT_LABEL[n.category] || n.category}
                        </span>
                        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-[#ED642B]" />}
                      </div>
                      <span className="text-[10px] text-text-tertiary font-numeric shrink-0">{formatDateTime(n.created_at)}</span>
                    </div>

                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{n.description}</p>

                    {n.meta?.financial_impact && Number(n.meta.financial_impact) > 0 && (
                      <p className="text-[11px] font-bold text-[#ED642B] mt-1">
                        Cost impact: {formatCurrency(Number(n.meta.financial_impact))}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      {n.link && (
                        <Link to={n.link}
                          className="text-[11px] font-bold text-text-primary hover:text-[#ED642B] flex items-center gap-1 transition-colors">
                          View details <ArrowRight size={10} />
                        </Link>
                      )}
                      {isUnread && (
                        <button onClick={() => readMutation.mutate(n.id)}
                          className="text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer flex items-center gap-1">
                          <Check size={10} /> Mark read
                        </button>
                      )}
                      <button onClick={() => deleteMutation.mutate(n.id)}
                        className="text-[11px] text-text-tertiary hover:text-red-500 cursor-pointer flex items-center gap-1 ml-auto">
                        <Trash2 size={10} /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Simple button helper (no import needed) ────────────────────────────────
const Button: React.FC<{ onClick: () => void; loading?: boolean; children: React.ReactNode }> = ({ onClick, loading, children }) => (
  <button onClick={onClick} disabled={loading}
    className="flex items-center px-3 py-1.5 rounded-lg border border-border-default text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50">
    {children}
  </button>
);
