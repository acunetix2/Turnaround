import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import {
  DollarSign, FileText, Download, Printer, Search,
  CheckCircle2, AlertTriangle, Clock, ShieldCheck,
  X, Eye, Send
} from 'lucide-react';
import type { DemurrageClaim, ClaimStatus, ResponsibleParty } from '../../lib/api/types';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline
} from '../../components/ui/MetricCard';

const RESPONSIBLE_PARTY_LABELS: Record<ResponsibleParty, string> = {
  terminal_operator: 'Port Terminal Operator',
  customs_authority: 'Customs & Border Authority',
  shipper: 'Consignee / Shipper Warehouse',
  weighbridge_authority: 'Weighbridge Authority',
  rail_freight: 'Rail Freight Station'
};

const RESPONSIBLE_PARTY_BADGES: Record<ResponsibleParty, string> = {
  terminal_operator: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  customs_authority: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  shipper: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  weighbridge_authority: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rail_freight: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

export const Demurrage: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | ResponsibleParty>('all');
  const [selectedClaimForNotice, setSelectedClaimForNotice] = useState<DemurrageClaim | null>(null);

  // Queries
  const { data: claimsData, isLoading: loadingClaims, isError: claimsError } = useQuery({
    queryKey: ['demurrageClaims'],
    queryFn: () => apiClient.getDemurrageClaims(),
    refetchInterval: 20000,
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DemurrageClaim> }) =>
      apiClient.updateDemurrageClaim(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['demurrageClaims'] });
      toast({
        variant: 'success',
        title: 'Claim Updated',
        message: `Claim ${updated.claim_number} transitioned to ${updated.status.toUpperCase()}.`
      });
    },
    onError: () => {
      toast({
        variant: 'error',
        title: 'Update Failed',
        message: 'Could not update demurrage claim status.'
      });
    }
  });

  const claims = claimsData || [];

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (partyFilter !== 'all' && c.responsible_party !== partyFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.claim_number.toLowerCase().includes(q) ||
        c.vehicle_reg.toLowerCase().includes(q) ||
        c.location_name.toLowerCase().includes(q) ||
        (c.container_number || '').toLowerCase().includes(q) ||
        (c.driver_name || '').toLowerCase().includes(q)
      );
    });
  }, [claims, statusFilter, partyFilter, searchQuery]);

  // Derived Financial KPIs
  const totalClaimedKES = claims.reduce((acc, c) => acc + c.claimed_amount_kes, 0);
  const totalSettledKES = claims.reduce((acc, c) => acc + (c.settled_amount_kes || 0), 0);
  const totalDisputedCount = claims.filter(c => c.status === 'disputed').length;
  const totalInvoicedCount = claims.filter(c => c.status === 'invoiced').length;
  const totalFlaggedCount = claims.filter(c => c.status === 'flagged').length;
  const totalSettledCount = claims.filter(c => c.status === 'settled').length;
  const recoveryRate = totalClaimedKES > 0
    ? ((totalSettledKES / totalClaimedKES) * 100).toFixed(1)
    : '0.0';

  // Derive real sparkline data from claims sorted by date (up to 8 buckets)
  const claimedSparkline = useMemo(() => {
    if (claims.length === 0) return [{ value: 0 }];
    const sorted = [...claims].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const buckets = sorted.slice(-8).map(c => ({ value: c.claimed_amount_kes }));
    return buckets.length > 0 ? buckets : [{ value: 0 }];
  }, [claims]);

  const settledSparkline = useMemo(() => {
    if (claims.length === 0) return [{ value: 0 }];
    const sorted = [...claims]
      .filter(c => c.status === 'settled')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const buckets = sorted.slice(-8).map(c => ({ value: c.settled_amount_kes || 0 }));
    return buckets.length > 0 ? buckets : [{ value: 0 }, { value: 0 }];
  }, [claims]);

  const invoicedSparkline = useMemo(() => {
    const perStatus = ['flagged', 'invoiced', 'disputed', 'settled', 'written_off'].map(
      (s) => ({ value: claims.filter(c => c.status === s).length })
    );
    return perStatus;
  }, [claims]);

  const disputedSparkline = useMemo(() => {
    if (claims.length === 0) return [{ value: 0 }];
    const sorted = [...claims]
      .filter(c => c.status === 'disputed')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return sorted.length > 0
      ? sorted.slice(-6).map((_, i, arr) => ({ value: i === arr.length - 1 ? totalDisputedCount : i }))
      : [{ value: 0 }, { value: 0 }];
  }, [claims, totalDisputedCount]);

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'settled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-status-good/15 text-status-good border border-status-good/30"><CheckCircle2 size={10} /> Settled & Paid</span>;
      case 'invoiced':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30"><Send size={10} /> Invoiced</span>;
      case 'disputed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-red-500/15 text-red-500 border border-red-500/30"><AlertTriangle size={10} /> Disputed</span>;
      case 'flagged':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#ED642B]/15 text-[#ED642B] border border-[#ED642B]/30"><Clock size={10} /> SLA Breach Flagged</span>;
      case 'written_off':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-bg-surface-raised text-text-tertiary">Written Off</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-bg-surface-raised text-text-tertiary">{status}</span>;
    }
  };

  const handleExportCSV = () => {
    apiClient.exportDemurrageClaimsCSV(filteredClaims);
    toast({
      variant: 'success',
      title: 'Ledger Exported',
      message: `${filteredClaims.length} demurrage claim records exported to CSV.`
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] text-white flex items-center justify-center shadow-md">
            <DollarSign size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Demurrage Claims & Invoicing Ledger</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Automated financial penalty recovery against facility SLA breaches, port queues, and customs downtime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="small"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
          >
            Export Ledger CSV
          </Button>
        </div>
      </div>

      {/* ── KPI METRICS STRIP ── */}
      {claimsError ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span>Could not load demurrage claims from the server. Check backend connectivity.</span>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Total financial demurrage penalty assessed across all geofence SLA breaches" icon={<DollarSign size={13} className="text-[#ED642B]" />}>
              Total Assessed Claims
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-[#ED642B]">{formatCurrency(totalClaimedKES)}</MetricCardValue>
            <MetricCardDifferential variant="negative">{claims.length} Claims Total</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={claimedSparkline} color="#ED642B" />
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Capital successfully recovered and settled from terminal operators & shippers" icon={<ShieldCheck size={13} className="text-status-good" />}>
              Recovered Capital
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-status-good">{formatCurrency(totalSettledKES)}</MetricCardValue>
            <MetricCardDifferential variant="positive">{recoveryRate}% Recovery Rate</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={settledSparkline} color="#10B981" />
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Formal invoices served to port and customs authorities awaiting payment" icon={<FileText size={13} className="text-[#250C77]" />}>
              Invoiced & Pending
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalInvoicedCount + totalFlaggedCount}</MetricCardValue>
            <MetricCardDifferential variant="positive">{totalInvoicedCount} Invoiced · {totalSettledCount} Settled</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={invoicedSparkline} color="#250C77" />
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Claims currently contested by facility receivers requiring arbitration" icon={<AlertTriangle size={13} className={totalDisputedCount > 0 ? 'text-red-500' : 'text-text-tertiary'} />}>
              Contested Disputes
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={totalDisputedCount > 0 ? 'text-red-500' : ''}>
              {totalDisputedCount}
            </MetricCardValue>
            <MetricCardDifferential variant={totalDisputedCount > 0 ? 'negative' : 'positive'}>
              {totalDisputedCount > 0 ? 'Action Required' : 'No Active Disputes'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={disputedSparkline} color="#EF4444" />
        </MetricCard>
      </div>
      )}

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claim #, plate, container, stop..."
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'flagged', 'invoiced', 'disputed', 'settled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer shrink-0 ${
                  statusFilter === s
                    ? 'bg-[#250C77] text-white shadow-sm'
                    : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
                }`}
              >
                {s === 'all' ? 'All Status' : s === 'flagged' ? 'Flagged Breaches' : s}
              </button>
            ))}
          </div>

          {/* Party Filter */}
          <div className="w-52">
            <Select
              value={partyFilter}
              onValueChange={(val) => setPartyFilter(val as any)}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium bg-bg-surface-raised border-border-default">
                <SelectValue placeholder="All Responsible Parties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responsible Parties</SelectItem>
                <SelectItem value="terminal_operator">Terminal Operators</SelectItem>
                <SelectItem value="customs_authority">Customs & Border</SelectItem>
                <SelectItem value="shipper">Shippers & Warehouses</SelectItem>
                <SelectItem value="weighbridge_authority">Weighbridges</SelectItem>
                <SelectItem value="rail_freight">Rail Freight</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── CLAIMS LEDGER TABLE ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID & Date</TableHead>
              <TableHead>Vehicle & Container</TableHead>
              <TableHead>Facility Geofence</TableHead>
              <TableHead>Liable Party</TableHead>
              <TableHead>Delay vs SLA</TableHead>
              <TableHead>Demurrage Amount</TableHead>
              <TableHead>Claim Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClaims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-text-tertiary">
                  No demurrage claims found matching current criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredClaims.map((claim) => (
                <TableRow key={claim.id}>
                  {/* Claim # */}
                  <TableCell>
                    <div className="font-mono font-bold text-xs text-text-primary">{claim.claim_number}</div>
                    <div className="text-[10px] text-text-tertiary font-numeric">{formatDateTime(claim.created_at)}</div>
                  </TableCell>

                  {/* Vehicle */}
                  <TableCell>
                    <Link to={`/vehicles/${claim.vehicle_id}`} className="font-mono text-xs font-bold text-text-primary hover:text-[#ED642B] transition-colors block">
                      {claim.vehicle_reg}
                    </Link>
                    {claim.container_number && (
                      <span className="font-mono text-[10px] text-indigo-400 font-bold block">{claim.container_number}</span>
                    )}
                  </TableCell>

                  {/* Location */}
                  <TableCell className="text-xs font-medium text-text-primary">
                    <div className="truncate max-w-[160px]">{claim.location_name}</div>
                  </TableCell>

                  {/* Liable Party */}
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${RESPONSIBLE_PARTY_BADGES[claim.responsible_party]}`}>
                      {RESPONSIBLE_PARTY_LABELS[claim.responsible_party]}
                    </span>
                  </TableCell>

                  {/* Delay */}
                  <TableCell className="text-xs font-numeric">
                    <div className="font-bold text-red-500">+{formatMinutes(claim.excess_delay_minutes)}</div>
                    <div className="text-[10px] text-text-tertiary">SLA: {claim.sla_threshold_minutes}m</div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="font-numeric text-xs">
                    <div className="font-extrabold text-[#ED642B]">{formatCurrency(claim.claimed_amount_kes)}</div>
                    {claim.settled_amount_kes != null && claim.settled_amount_kes > 0 && (
                      <div className="text-[10px] text-status-good font-bold">Paid: {formatCurrency(claim.settled_amount_kes)}</div>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(claim.status)}</TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="small"
                        icon={<Eye size={12} />}
                        onClick={() => setSelectedClaimForNotice(claim)}
                      >
                        Claim Notice
                      </Button>

                      {canMutate && claim.status !== 'settled' && (
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => {
                            const nextStatus: ClaimStatus =
                              claim.status === 'flagged' ? 'invoiced' :
                              claim.status === 'invoiced' ? 'settled' :
                              claim.status === 'disputed' ? 'settled' : 'invoiced';
                            
                            updateClaimMutation.mutate({
                              id: claim.id,
                              data: {
                                status: nextStatus,
                                ...(nextStatus === 'settled' ? { settled_amount_kes: claim.claimed_amount_kes, settlement_date: new Date().toISOString() } : {}),
                                ...(nextStatus === 'invoiced' ? { invoice_date: new Date().toISOString() } : {})
                              }
                            });
                          }}
                        >
                          {claim.status === 'flagged' ? 'Issue Invoice' : claim.status === 'invoiced' ? 'Mark Paid' : 'Settle'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── FORMAL DEMURRAGE CLAIM NOTICE & INVOICE MODAL ── */}
      {selectedClaimForNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between bg-bg-surface-raised/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#ED642B] text-white flex items-center justify-center">
                  <FileText size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Formal Demurrage & SLA Breach Notice</h3>
                  <p className="text-[11px] text-text-tertiary">Verified commercial liability letter with satellite telematics audit.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClaimForNotice(null)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 space-y-5 text-text-primary text-xs font-sans">
              <div className="flex items-start justify-between border-b border-border-default pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#250C77]">SIGINON GLOBAL LOGISTICS</h2>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Commercial Fleet Operations & Corridor Recovery Unit</p>
                  <p className="text-[10px] text-text-tertiary">Turnaround Telematics Automated Enforcement</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary block">Notice Number</span>
                  <span className="font-mono font-bold text-text-primary text-sm">{selectedClaimForNotice.claim_number}</span>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Date: {new Date(selectedClaimForNotice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Responsible Entity Info */}
              <div className="p-3.5 rounded-xl bg-bg-surface-raised/50 border border-border-default flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-tertiary block">Demand Served Upon</span>
                  <span className="font-bold text-text-primary text-xs">{RESPONSIBLE_PARTY_LABELS[selectedClaimForNotice.responsible_party]}</span>
                  <span className="text-[11px] text-text-secondary block mt-0.5">{selectedClaimForNotice.location_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary block">Claim Status</span>
                  {getStatusBadge(selectedClaimForNotice.status)}
                </div>
              </div>

              {/* Summary Table */}
              <div className="rounded-xl border border-border-default overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 border-b border-border-default bg-bg-surface-raised/20 text-xs">
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Vehicle Unit</span>
                    <span className="font-mono font-bold text-text-primary">{selectedClaimForNotice.vehicle_reg}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Container ISO</span>
                    <span className="font-mono font-bold text-indigo-400">{selectedClaimForNotice.container_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Assigned Driver</span>
                    <span className="font-medium text-text-primary">{selectedClaimForNotice.driver_name || 'Fleet Operator'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Operating Rate</span>
                    <span className="font-numeric font-bold text-text-primary">{formatCurrency(selectedClaimForNotice.hourly_operating_rate)} / hr</span>
                  </div>
                </div>

                <div className="p-4 space-y-2 bg-[#ED642B]/5 border-b border-border-default">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>Geofence SLA Baseline Window:</span>
                    <span className="font-numeric">{formatMinutes(selectedClaimForNotice.sla_threshold_minutes)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>Actual Recorded Facility Dwell:</span>
                    <span className="font-numeric">{formatMinutes(selectedClaimForNotice.total_dwell_minutes)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-red-500 pt-1 border-t border-border-default/40">
                    <span>Net Excess Idling Delay:</span>
                    <span className="font-numeric">+{formatMinutes(selectedClaimForNotice.excess_delay_minutes)} ({(selectedClaimForNotice.excess_delay_minutes / 60).toFixed(2)} Hours)</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-extrabold text-[#ED642B] pt-1">
                    <span>Total Assessed Demurrage Liability:</span>
                    <span className="font-numeric">{formatCurrency(selectedClaimForNotice.claimed_amount_kes)}</span>
                  </div>
                </div>
              </div>

              {selectedClaimForNotice.notes && (
                <div className="p-3 rounded-lg bg-bg-surface-raised border border-border-default text-[11px]">
                  <strong className="text-text-primary">Incident Audit Note:</strong> {selectedClaimForNotice.notes}
                </div>
              )}

              <div className="text-[10.5px] text-text-tertiary space-y-1 border-t border-border-default pt-3">
                <p>
                  <strong>Payment & Settlement Terms:</strong> In accordance with East African Freight Corridor SLA agreements, demurrage remittances are due within 14 calendar days of notice transmission.
                </p>
                <p className="italic">
                  Verified by satellite GPS timestamps and entrance/exit geofence polygon telemetry recorded on Turnaround.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
              <Button variant="ghost" size="small" onClick={() => setSelectedClaimForNotice(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="small"
                  icon={<Printer size={13} />}
                  onClick={() => window.print()}
                >
                  Print Notice
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  icon={<Download size={13} />}
                  onClick={async () => {
                    if (!selectedClaimForNotice.id) return;
                    try {
                      await apiClient.downloadDemurrageNoticePDF(
                        selectedClaimForNotice.id,
                        selectedClaimForNotice.claim_number
                      );
                    } catch (err: any) {
                      toast({ variant: 'error', title: 'PDF Failed', message: err?.message || 'Could not generate PDF.' });
                    }
                    setSelectedClaimForNotice(null);
                  }}
                >
                  Download PDF Statement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
