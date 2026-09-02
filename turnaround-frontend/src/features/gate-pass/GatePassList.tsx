import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, Search, Eye, ShieldCheck, Truck, Clock,
  Container, Plus, MapPin, CheckCircle2, Ban, RefreshCw,
  Stamp, Trash2, MoreVertical, AlertTriangle, LayoutGrid, List, Archive,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { queryKeys } from '../../lib/query-keys';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import type { GatePassData } from '../../lib/api/types';

// ── Smart status ──────────────────────────────────────────────────────────────

function resolvePassStatus(pass: GatePassData): string {
  const now = Date.now();
  if (
    (pass.status === 'pre_approved' || pass.status === 'approved') &&
    new Date(pass.time_window_end).getTime() < now
  ) return 'expired';
  return pass.status;
}

type PassStatus = 'pre_approved' | 'approved' | 'cleared' | 'inspected' | 'used' | 'expired' | 'revoked';

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  pre_approved: { label: 'Pending',    cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30',      dot: 'bg-amber-500'   },
  approved:     { label: 'Approved',   cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', dot: 'bg-emerald-500' },
  cleared:      { label: 'Cleared',    cls: 'bg-emerald-600/15 text-emerald-700 border-emerald-600/30', dot: 'bg-emerald-600' },
  inspected:    { label: 'Inspected',  cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',          dot: 'bg-blue-500'    },
  used:         { label: 'Gate Used',  cls: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',    dot: 'bg-indigo-500'  },
  expired:      { label: 'Expired',    cls: 'bg-red-500/15 text-red-500 border-red-500/30',             dot: 'bg-red-500'     },
  revoked:      { label: 'Revoked',    cls: 'bg-gray-500/15 text-gray-500 border-gray-500/30',          dot: 'bg-gray-400'    },
};

const ARCHIVED = ['used', 'expired', 'revoked'];

function fmtShort(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ title, message, confirmLabel, danger, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="small" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
);

// ── 3-dot Action Menu ─────────────────────────────────────────────────────────

interface PassMenuProps {
  pass: GatePassData; resolvedStatus: string;
  canMutate: boolean; canAdmin: boolean; isAdmin: boolean; busyId: string | null;
  onApprove: () => void; onMarkUsed: () => void; onReissue: () => void;
  onRevoke: () => void; onDelete: () => void; onView: () => void; onPrint: () => void;
}

const PassActionMenu: React.FC<PassMenuProps> = ({
  pass, resolvedStatus, canMutate, canAdmin, isAdmin, busyId,
  onApprove, onMarkUsed, onReissue, onRevoke, onDelete, onView, onPrint,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBusy = busyId === pass.id;

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fn = () => setOpen(false);
    window.addEventListener('scroll', fn, true);
    return () => window.removeEventListener('scroll', fn, true);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(o => !o);
  };

  const item = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button key={label} onClick={() => { setOpen(false); onClick(); }} disabled={isBusy}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-40 ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary hover:bg-bg-surface-raised'}`}>
      {icon}{label}
    </button>
  );

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
        title="Actions">
        {isBusy
          ? <span className="h-3.5 w-3.5 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin block" />
          : <MoreVertical size={14} />}
      </button>
      {open && (
        <div ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-44 bg-bg-surface border border-border-default rounded-xl shadow-2xl py-1 overflow-hidden">
          {item('View Pass', <Eye size={12} />, onView)}
          <div className="my-1 border-t border-border-default" />
          {canAdmin && resolvedStatus === 'pre_approved' && item('Approve Pass', <CheckCircle2 size={12} className="text-emerald-500" />, onApprove)}
          {canMutate && (resolvedStatus === 'pre_approved' || resolvedStatus === 'approved') && item('Mark Gate Used', <Stamp size={12} />, onMarkUsed)}
          {canAdmin && ARCHIVED.includes(resolvedStatus) && item('Reissue New Pass', <RefreshCw size={12} />, onReissue)}
          {canAdmin && !ARCHIVED.includes(resolvedStatus) && (
            <>
              <div className="my-1 border-t border-border-default" />
              {item('Revoke Access', <Ban size={12} />, onRevoke, true)}
            </>
          )}
          {isAdmin && (
            <>
              <div className="my-1 border-t border-border-default" />
              {item('Delete Pass', <Trash2 size={12} />, onDelete, true)}
            </>
          )}
        </div>
      )}
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const GatePassList: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { role } = useAuth();
  const canMutate = role === 'admin' || role === 'fleet_manager' || role === 'dispatcher';
  const canAdmin  = role === 'admin' || role === 'fleet_manager';
  const isAdmin   = role === 'admin';

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<string>('active');
  const [layout, setLayout]       = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm]     = useState<{ action: string; pass: GatePassData } | null>(null);
  const [busyId, setBusyId]       = useState<string | null>(null);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: queryKeys.gatePasses.all(),
    queryFn:  () => apiClient.getGatePasses(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.gatePasses.all() });

  const approveMutation = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return apiClient.approveGatePass(id); },
    onSettled: () => setBusyId(null),
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Pass Approved' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const markUsedMutation = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return apiClient.markGatePassUsed(id); },
    onSettled: () => setBusyId(null),
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Recorded as Gate Used' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const reissueMutation = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return apiClient.reissueGatePass(id); },
    onSettled: () => setBusyId(null),
    onSuccess: (p: any) => { invalidate(); toast({ variant: 'success', title: 'New Pass Issued', message: `Pass ${p?.pass_number} created.` }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return apiClient.revokeGatePass(id); },
    onSettled: () => { setBusyId(null); setConfirm(null); },
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Access Revoked' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return apiClient.deleteGatePass(id); },
    onSettled: () => { setBusyId(null); setConfirm(null); },
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Pass Deleted' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'revoke') revokeMutation.mutate(confirm.pass.id);
    if (confirm.action === 'delete') deleteMutation.mutate(confirm.pass.id);
  };

  const openPass = (pass: GatePassData) => navigate(`/gate-pass/${pass.id}`, { state: { pass } });

  // Stats
  const total   = passes.length;
  const active  = passes.filter((p: GatePassData) => { const rs = resolvePassStatus(p); return !ARCHIVED.includes(rs); }).length;
  const revoked = passes.filter((p: GatePassData) => p.status === 'revoked').length;
  const expired = passes.filter((p: GatePassData) => resolvePassStatus(p) === 'expired').length;

  // Filter
  const filtered = passes.filter((p: GatePassData) => {
    const rs = resolvePassStatus(p);
    const isArch = ARCHIVED.includes(rs);
    if (showArchived && !isArch) return false;
    if (!showArchived && isArch) return false;
    if (!showArchived && statusFilter !== 'active' && rs !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.pass_number.toLowerCase().includes(q)           ||
      (p.vehicle_reg ?? '').toLowerCase().includes(q)   ||
      (p.driver_name ?? '').toLowerCase().includes(q)   ||
      (p.terminal_name ?? '').toLowerCase().includes(q) ||
      (p.container_number ?? '').toLowerCase().includes(q)
    );
  });

  // ── Shared card renderer ──
  const actionMenu = (pass: GatePassData, rs: string) => (
    <div onClick={e => e.stopPropagation()}>
      <PassActionMenu
        pass={pass} resolvedStatus={rs} canMutate={canMutate} canAdmin={canAdmin}
        isAdmin={isAdmin} busyId={busyId}
        onView={() => openPass(pass)} onPrint={() => openPass(pass)}
        onApprove={() => approveMutation.mutate(pass.id)}
        onMarkUsed={() => markUsedMutation.mutate(pass.id)}
        onReissue={() => reissueMutation.mutate(pass.id)}
        onRevoke={() => setConfirm({ action: 'revoke', pass })}
        onDelete={() => setConfirm({ action: 'delete', pass })}
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md">
            <FileCheck size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Gate Passes</h1>
            <p className="text-xs text-text-secondary mt-0.5">Terminal entry authorisations — issue, approve, revoke</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-bg-surface-raised border border-border-default">
            <button onClick={() => setLayout('grid')} title="Grid view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${layout === 'grid' ? 'bg-bg-surface shadow-sm text-[#250C77]' : 'text-text-tertiary hover:text-text-primary'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setLayout('list')} title="List view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${layout === 'list' ? 'bg-bg-surface shadow-sm text-[#250C77]' : 'text-text-tertiary hover:text-text-primary'}`}>
              <List size={14} />
            </button>
          </div>
          {/* Archive toggle */}
          <button onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              showArchived ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-bg-surface text-text-tertiary border-border-default hover:text-text-primary'
            }`}>
            <Archive size={13} />
            {showArchived ? 'Archived' : 'Archive'}
          </button>
          <Button variant="primary" size="small" icon={<Plus size={13} />} onClick={() => navigate('/trips')}>
            New Pass
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Issued', value: total,   color: 'text-text-primary' },
          { label: 'Active',       value: active,  color: 'text-emerald-500'  },
          { label: 'Revoked',      value: revoked, color: 'text-gray-500'     },
          { label: 'Expired',      value: expired, color: 'text-red-500'      },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-1">{label}</p>
            <p className={`text-2xl font-black font-numeric ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter / archive banner */}
      {showArchived ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 font-semibold">
          <Archive size={13} />
          Archived passes ({filtered.length}) — used, expired &amp; revoked
          <button onClick={() => setShowArchived(false)} className="ml-auto underline cursor-pointer font-semibold">
            Back to active
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default">
          <div className="relative w-full sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pass #, vehicle, driver, terminal…"
              className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none" />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['active', 'pre_approved', 'approved'] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  statusFilter === s ? 'bg-[#250C77] text-white shadow-sm' : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
                }`}>
                {s === 'active' ? 'All Active' : STATUS_CFG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border-default bg-bg-surface p-4 animate-pulse h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface p-12 text-center">
          <FileCheck size={28} className="mx-auto mb-3 opacity-20 text-[#250C77]" />
          <p className="text-sm font-semibold text-text-secondary">
            {showArchived ? 'No archived passes' : 'No active gate passes'}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {showArchived ? 'Used, expired or revoked passes appear here.' : 'Generate passes from the Trips page.'}
          </p>
          {!showArchived && (
            <Button variant="outline" size="small" className="mt-4" onClick={() => navigate('/trips')}>
              Go to Trips
            </Button>
          )}
        </div>
      ) : layout === 'grid' ? (

        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((pass: GatePassData) => {
            const rs = resolvePassStatus(pass);
            const sc = STATUS_CFG[rs] ?? STATUS_CFG.pre_approved;
            const isExpiredByTime = rs === 'expired' && pass.status !== 'expired';
            return (
              <div key={pass.pass_number}
                onClick={() => openPass(pass)}
                className="rounded-xl border border-border-default bg-bg-surface hover:border-[#ED642B]/40 transition-all overflow-hidden cursor-pointer">
                <div className={`h-0.5 w-full ${sc.dot}`} />
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-black text-text-primary tracking-wider truncate block">{pass.pass_number}</span>
                      {isExpiredByTime && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                          <AlertTriangle size={9} /> Window passed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />{sc.label}
                      </span>
                      {actionMenu(pass, rs)}
                    </div>
                  </div>
                  {/* Vehicle */}
                  <div className="flex items-center gap-2">
                    <Truck size={12} className="text-[#ED642B] shrink-0" />
                    <span className="font-mono text-xs font-bold text-text-primary">{pass.vehicle_reg}</span>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary truncate">{pass.driver_name}</span>
                  </div>
                  {/* Terminal */}
                  <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <MapPin size={10} className="text-text-tertiary shrink-0" />
                    <span className="truncate">{pass.terminal_name}{(pass as any).terminal_gate ? ` · Gate ${(pass as any).terminal_gate}` : ''}</span>
                  </div>
                  {/* Time window */}
                  <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono">
                    <Clock size={10} className="shrink-0" />
                    <span>{fmtShort(pass.time_window_start)} → {fmtShort(pass.time_window_end)}</span>
                  </div>
                  {/* Tags */}
                  {(pass.container_number || pass.customs_seal_number) && (
                    <div className="flex flex-wrap gap-1">
                      {pass.container_number && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/15">
                          <Container size={9} />{pass.container_number}
                        </span>
                      )}
                      {pass.customs_seal_number && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
                          <ShieldCheck size={9} />{pass.customs_seal_number}
                        </span>
                      )}
                    </div>
                  )}
                  {/* View button */}
                  <div className="pt-2 border-t border-border-default">
                    <Button variant="outline" size="small" icon={<Eye size={11} />} onClick={() => openPass(pass)} className="w-full justify-center">
                      View Full Pass
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[0.5rem_9rem_7rem_1fr_10rem_11rem_4rem] gap-3 items-center px-4 py-2 bg-bg-surface-raised/60 border-b border-border-default">
            <span />
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Pass #</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Status</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Vehicle · Driver</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Terminal</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Time Window</p>
            <span />
          </div>
          {filtered.map((pass: GatePassData, idx) => {
            const rs = resolvePassStatus(pass);
            const sc = STATUS_CFG[rs] ?? STATUS_CFG.pre_approved;
            return (
              <div key={pass.pass_number}
                className={`flex md:grid md:grid-cols-[0.5rem_9rem_7rem_1fr_10rem_11rem_4rem] gap-3 items-center px-4 py-2.5 hover:bg-bg-surface-raised/50 transition-colors ${idx !== 0 ? 'border-t border-border-default' : ''}`}>
                <span className={`h-2 w-2 rounded-full ${sc.dot} shrink-0`} />
                <span className="font-mono text-xs font-black text-text-primary truncate">{pass.pass_number}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${sc.cls}`}>{sc.label}</span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-text-primary shrink-0">{pass.vehicle_reg}</span>
                  <span className="text-text-tertiary mx-1">·</span>
                  <span className="text-xs text-text-secondary truncate">{pass.driver_name}</span>
                </div>
                <div className="hidden md:flex items-center gap-1 text-[11px] text-text-secondary min-w-0">
                  <MapPin size={10} className="text-text-tertiary shrink-0" />
                  <span className="truncate">{pass.terminal_name}</span>
                </div>
                <div className="hidden lg:flex items-center gap-1 text-[10px] text-text-tertiary font-mono">
                  <Clock size={10} className="shrink-0" />
                  <span className="truncate">{fmtShort(pass.time_window_start)} → {fmtShort(pass.time_window_end)}</span>
                </div>
                <div className="flex items-center gap-1 justify-end ml-auto md:ml-0">
                  <button onClick={() => openPass(pass)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer" title="View">
                    <Eye size={13} />
                  </button>
                  {actionMenu(pass, rs)}
                </div>
              </div>
            );
          })}
        </div>

      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'revoke' ? 'Revoke Gate Pass' : 'Delete Gate Pass'}
          message={
            confirm.action === 'revoke'
              ? `Revoke pass ${confirm.pass.pass_number}? The vehicle will lose terminal access immediately.`
              : `Permanently delete pass ${confirm.pass.pass_number}? This cannot be undone.`
          }
          confirmLabel={confirm.action === 'revoke' ? 'Yes, Revoke Access' : 'Yes, Delete'}
          danger
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
