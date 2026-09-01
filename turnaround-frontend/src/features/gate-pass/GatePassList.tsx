import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, Search, Printer, Eye, ShieldCheck,
  Truck, Clock, Container, Plus, Ban
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { queryKeys } from '../../lib/query-keys';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthProvider';
import type { GatePassData } from '../../lib/api/types';

/* ─── helpers ─────────────────────────────────────────────────── */
type PassStatus = GatePassData['status'];

const STATUS_CFG: Record<PassStatus, { label: string; cls: string; dot: string }> = {
  pre_approved: { label: 'Approved',   cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30',   dot: 'bg-amber-500'   },
  cleared:      { label: 'Cleared',    cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', dot: 'bg-emerald-500' },
  inspected:    { label: 'Inspected',  cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',       dot: 'bg-blue-500'    },
  expired:      { label: 'Expired',    cls: 'bg-red-500/15 text-red-500 border-red-500/30',          dot: 'bg-red-500'     },
  cancelled:    { label: 'Cancelled',  cls: 'bg-gray-500/15 text-gray-500 border-gray-500/30',       dot: 'bg-gray-400'    },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function fmtShort(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/* ─── component ───────────────────────────────────────────────── */
export const GatePassList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = useAuth();
  const canRevoke = role === 'admin' || role === 'fleet_manager';

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<'all' | PassStatus>('all');

  const { data: passes = [], isLoading } = useQuery({
    queryKey: queryKeys.gatePasses.all(),
    queryFn:  () => apiClient.getGatePasses(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.revokeGatePass(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gatePasses.all() });
      toast({ variant: 'success', title: 'Pass Revoked', message: `${updated.pass_number} has been cancelled.` });
    },
    onError: (err: any) => {
      toast({ variant: 'error', title: 'Revoke Failed', message: err?.message || 'Could not revoke gate pass.' });
    },
  });

  const handleRevoke = (pass: GatePassData) => {
    if (!pass.id) return;
    if (!window.confirm(`Cancel gate pass ${pass.pass_number}? This cannot be undone.`)) return;
    revokeMutation.mutate(pass.id);
  };

  /* filter */
  const filtered = passes.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.pass_number.toLowerCase().includes(q)      ||
      p.vehicle_reg.toLowerCase().includes(q)       ||
      p.driver_name.toLowerCase().includes(q)       ||
      p.terminal_name.toLowerCase().includes(q)     ||
      (p.container_number ?? '').toLowerCase().includes(q)
    );
  });

  /* counts */
  const total    = passes.length;
  const active   = passes.filter(p => p.status === 'pre_approved' || p.status === 'cleared').length;
  const expired  = passes.filter(p => p.status === 'expired').length;

  const openPass = (pass: GatePassData) =>
    navigate('/gate-pass', { state: { pass } });

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md">
            <FileCheck size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Gate Passes</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              All issued terminal entry authorisations
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="small"
          icon={<Plus size={13} />}
          onClick={() => navigate('/trips')}
        >
          New Pass via Trip
        </Button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Issued',  value: total,   color: 'text-text-primary' },
          { label: 'Active',        value: active,  color: 'text-emerald-500'  },
          { label: 'Expired',       value: expired, color: 'text-red-500'      },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-1">{label}</p>
            <p className={`text-2xl font-black font-numeric ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default">
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pass #, vehicle, driver, terminal…"
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {(['all', 'pre_approved', 'cleared', 'inspected', 'expired', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-[#250C77] text-white shadow-sm'
                  : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-default bg-bg-surface p-5 animate-pulse">
              <div className="h-4 bg-bg-surface-raised rounded w-1/3 mb-2" />
              <div className="h-3 bg-bg-surface-raised rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-12 text-center">
          <FileCheck size={32} className="mx-auto mb-3 opacity-20 text-[#250C77]" />
          <p className="text-sm font-semibold text-text-secondary">No gate passes found</p>
          <p className="text-xs text-text-tertiary mt-1">
            Generate passes from the Trips page using the Gate Pass button on each trip.
          </p>
          <Button
            variant="outline"
            size="small"
            className="mt-4"
            onClick={() => navigate('/trips')}
          >
            Go to Trips
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pass) => {
            const sc = STATUS_CFG[pass.status] ?? STATUS_CFG.pre_approved;
            const isExpired = pass.status === 'expired';

            return (
              <div
                key={pass.pass_number}
                className={`rounded-2xl border bg-bg-surface transition-all hover:border-[#ED642B]/40 ${
                  isExpired ? 'opacity-60 border-border-default' : 'border-border-default'
                }`}
              >
                {/* Coloured top strip */}
                <div className={`h-1 w-full rounded-t-2xl ${sc.dot}`} />

                <div className="p-5">
                  {/* Row 1 — pass number + status + actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-text-primary tracking-wider">
                          {pass.pass_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                      {pass.created_at && (
                        <p className="text-[10px] text-text-tertiary mt-0.5 font-mono">
                          Issued: {fmtDate(pass.created_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="small"
                        icon={<Eye size={12} />}
                        onClick={() => openPass(pass)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="small"
                        icon={<Printer size={12} />}
                        onClick={() => openPass(pass)}
                      >
                        Print
                      </Button>
                      {canRevoke && pass.status === 'pre_approved' && (
                        <Button
                          variant="ghost"
                          size="small"
                          icon={<Ban size={12} className="text-red-500" />}
                          onClick={() => handleRevoke(pass)}
                          loading={revokeMutation.isPending && revokeMutation.variables === pass.id}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Row 2 — details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-text-tertiary mb-0.5">Vehicle</p>
                      <p className="font-mono font-bold text-text-primary flex items-center gap-1">
                        <Truck size={11} className="text-[#ED642B] shrink-0" />
                        {pass.vehicle_reg}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-text-tertiary mb-0.5">Driver</p>
                      <p className="font-semibold text-text-primary truncate">{pass.driver_name}</p>
                      {pass.driver_phone && (
                        <p className="text-[10px] text-text-tertiary font-mono">{pass.driver_phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-text-tertiary mb-0.5">Terminal</p>
                      <p className="font-semibold text-text-primary truncate">{pass.terminal_name}</p>
                      {pass.terminal_gate && (
                        <p className="text-[10px] text-text-tertiary">Gate {pass.terminal_gate}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-text-tertiary mb-0.5">Valid Window</p>
                      <div className="flex items-center gap-1 text-text-secondary">
                        <Clock size={10} className="shrink-0 text-text-tertiary" />
                        <span className="font-mono text-[10px]">
                          {fmtShort(pass.time_window_start)}<br />
                          → {fmtShort(pass.time_window_end)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3 — cargo tags (optional) */}
                  {(pass.container_number || pass.customs_seal_number || pass.cargo_type) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-default">
                      {pass.container_number && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                          <Container size={10} /> {pass.container_number}
                        </span>
                      )}
                      {pass.customs_seal_number && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                          <ShieldCheck size={10} /> Seal: {pass.customs_seal_number}
                        </span>
                      )}
                      {pass.cargo_type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-bg-surface-raised text-text-tertiary border border-border-default">
                          {pass.cargo_type}
                          {pass.cargo_weight_tonnes ? ` · ${pass.cargo_weight_tonnes}t` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
