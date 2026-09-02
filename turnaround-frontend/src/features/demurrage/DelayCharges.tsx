import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import {
  DollarSign, FileText, Download, Printer, Search,
  CheckCircle2, AlertTriangle, Clock, ShieldCheck,
  X, Eye, Send
} from 'lucide-react';
import type { DelayChargeClaim, ClaimStatus, ResponsibleParty } from '../../lib/api/types';
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

export const DelayCharges: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | ResponsibleParty>('all');
  const [selectedClaimForNotice, setSelectedClaimForNotice] = useState<DelayChargeClaim | null>(null);

  // Queries
  const { data: claimsData, isLoading: loadingClaims, isError: claimsError } = useQuery({
    queryKey: ['delayChargeClaims'],
    queryFn: () => apiClient.getDelayChargeClaims(),
    refetchInterval: 20000,
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DelayChargeClaim> }) =>
      apiClient.updateDelayChargeClaim(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['delayChargeClaims'] });
      toast({
        variant: 'success',
        title: 'Claim Updated Successfully',
        message: `Claim ${updated.claim_number} status changed to ${updated.status.replace('_', ' ').toUpperCase()}.`
      });
    },
    onError: () => {
      toast({
        variant: 'error',
        title: 'Update Failed',
        message: 'Could not update delay charge claim. Please try again.'
      });
    }
  });

  const claims = claimsData || [];

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (partyFilter !== 'all' && c.responsible_party !== partyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.claim_number.toLowerCase().includes(q) ||
          c.vehicle_reg.toLowerCase().includes(q) ||
          c.location_name.toLowerCase().includes(q) ||
          c.container_number?.toLowerCase().includes(q) ||
          c.driver_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [claims, statusFilter, partyFilter, searchQuery]);

  // Aggregate Metrics
  const totalAssessed = useMemo(() => claims.reduce((sum, c) => sum + c.claimed_amount_kes, 0), [claims]);
  const totalRecovered = useMemo(() => claims.reduce((sum, c) => sum + (c.settled_amount_kes || 0), 0), [claims]);
  const totalInvoiced = useMemo(
    () =>
      claims.filter((c) => c.status === 'invoiced').reduce((sum, c) => sum + c.claimed_amount_kes, 0),
    [claims]
  );
  const totalDisputedCount = useMemo(() => claims.filter((c) => c.status === 'disputed').length, [claims]);

  const handleStatusChange = (claimId: string, newStatus: ClaimStatus) => {
    if (!canMutate) {
      toast({
        variant: 'warning',
        title: 'Permission Denied',
        message: 'You do not have permission to update claims.'
      });
      return;
    }

    toast({
      variant: 'info',
      title: 'Updating Claim',
      message: 'Processing status change...'
    });

    updateClaimMutation.mutate({
      id: claimId,
      data: {
        status: newStatus,
        ...(newStatus === 'settled' && { settlement_date: new Date().toISOString() })
      }
    });
  };

  const handleExportCSV = () => {
    apiClient.exportDelayChargeClaimsCSV(filteredClaims);
    toast({
      variant: 'success',
      title: 'Export Complete',
      message: `${filteredClaims.length} delay charge records exported to CSV successfully.`
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={18} className="text-[#ED642B]" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Financial Recovery</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Delay Charges & Recovery Ledger</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Automated financial penalty recovery for facility SLA breaches, port queues, and customs downtime.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" icon={<Printer size={13} />} onClick={() => window.print()}>
            Print Report
          </Button>
          <Button variant="primary" size="small" icon={<Download size={13} />} onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error State */}
      {claimsError ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span>Could not load delay charge claims. Please check your connection and try again.</span>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Total financial delay penalties assessed across all facility SLA breaches" icon={<DollarSign size={13} className="text-[#ED642B]" />}>
              Total Assessed Claims
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatCurrency(totalAssessed)}</MetricCardValue>
            <MetricCardDifferential trend="neutral" changePercent={0} />
          </MetricCardContent>
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Capital successfully recovered and settled from terminal operators & shippers" icon={<ShieldCheck size={13} className="text-status-good" />}>
              Recovered Capital
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatCurrency(totalRecovered)}</MetricCardValue>
            <MetricCardDifferential trend="positive" changePercent={18} />
          </MetricCardContent>
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Formal invoices served to port and customs authorities awaiting payment" icon={<FileText size={13} className="text-[#250C77]" />}>
              Invoiced & Pending
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatCurrency(totalInvoiced)}</MetricCardValue>
            <MetricCardDifferential trend="neutral" changePercent={0} />
          </MetricCardContent>
        </MetricCard>

        <MetricCard isLoading={loadingClaims}>
          <MetricCardHeader href="/demurrage">
            <MetricCardLabel tooltip="Claims currently contested by facility receivers requiring arbitration" icon={<AlertTriangle size={13} className={totalDisputedCount > 0 ? 'text-red-500' : 'text-text-tertiary'} />}>
              Disputed Claims
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalDisputedCount}</MetricCardValue>
          </MetricCardContent>
        </MetricCard>
      </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Search by claim#, vehicle, location, or container..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-surface border border-border-default rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="written_off">Written Off</SelectItem>
          </SelectContent>
        </Select>

        <Select value={partyFilter} onValueChange={(val) => setPartyFilter(val as any)}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <SelectValue placeholder="Filter by Party" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Responsible Parties</SelectItem>
            <SelectItem value="terminal_operator">Port Terminal</SelectItem>
            <SelectItem value="customs_authority">Customs Authority</SelectItem>
            <SelectItem value="shipper">Shipper/Warehouse</SelectItem>
            <SelectItem value="weighbridge_authority">Weighbridge</SelectItem>
            <SelectItem value="rail_freight">Rail Freight</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Claims Table */}
      <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Vehicle & Driver</TableHead>
              <TableHead>Facility Location</TableHead>
              <TableHead>Responsible Party</TableHead>
              <TableHead className="text-right">Excess Delay</TableHead>
              <TableHead className="text-right">Claim Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingClaims ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-text-tertiary py-8">
                  Loading delay charge claims...
                </TableCell>
              </TableRow>
            ) : filteredClaims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-text-tertiary py-8">
                  No delay charge claims match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>
                    <span className="font-mono font-semibold text-xs text-text-primary">
                      {claim.claim_number}
                    </span>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {formatDateTime(claim.created_at)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-xs text-text-primary block">
                      {claim.vehicle_reg}
                    </span>
                    {claim.driver_name && (
                      <span className="text-[10px] text-text-secondary">{claim.driver_name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-text-primary font-medium">{claim.location_name}</span>
                    {claim.container_number && (
                      <p className="text-[10px] font-mono text-text-tertiary mt-0.5">
                        {claim.container_number}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        RESPONSIBLE_PARTY_BADGES[claim.responsible_party]
                      }`}
                    >
                      {RESPONSIBLE_PARTY_LABELS[claim.responsible_party]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-numeric text-xs text-text-primary">
                    {formatMinutes(claim.excess_delay_minutes)}
                  </TableCell>
                  <TableCell className="text-right font-numeric font-semibold text-xs text-text-primary">
                    {formatCurrency(claim.claimed_amount_kes)}
                  </TableCell>
                  <TableCell>
                    {canMutate ? (
                      <Select
                        value={claim.status}
                        onValueChange={(val) => handleStatusChange(claim.id, val as ClaimStatus)}
                      >
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flagged">Flagged</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="disputed">Disputed</SelectItem>
                          <SelectItem value="settled">Settled</SelectItem>
                          <SelectItem value="written_off">Written Off</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-text-secondary capitalize">
                        {claim.status.replace('_', ' ')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="small" icon={<Eye size={12} />}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Export backward compatibility alias
export { DelayCharges as Demurrage };
