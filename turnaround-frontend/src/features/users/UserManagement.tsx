import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, Shield, Truck, Eye, Edit2, Trash2,
  Ban, RefreshCw, ChevronDown, X, UserCheck,
  Mail, Phone, Calendar, MoreVertical, Filter, UserRoundPlus,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/format';
import type { User } from '../../lib/api/types';
import { MetricCard, MetricCardHeader, MetricCardLabel, MetricCardContent, MetricCardValue, MetricCardDifferential, MetricCardSparkline } from '../../components/ui/MetricCard';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select';

// ── helpers ──────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:         { label: 'Admin',         color: 'bg-[#250C77]/15 text-[#250C77] border-[#250C77]/30',      icon: <Shield size={10} /> },
  fleet_manager: { label: 'Fleet Manager', color: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',   icon: <Truck size={10} /> },
  dispatcher:    { label: 'Dispatcher',    color: 'bg-[#ED642B]/15 text-[#ED642B] border-[#ED642B]/30',      icon: <RefreshCw size={10} /> },
  driver:        { label: 'Driver',        color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: <Truck size={10} /> },
  viewer:        { label: 'Viewer',        color: 'bg-gray-500/15 text-gray-500 border-gray-500/30',          icon: <Eye size={10} /> },
  analyst:       { label: 'Analyst',       color: 'bg-purple-500/15 text-purple-500 border-purple-500/30',   icon: <Shield size={10} /> },
};

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', dot: 'bg-emerald-500' },
  inactive:  { label: 'Inactive',  color: 'bg-gray-500/15 text-gray-500 border-gray-500/30',          dot: 'bg-gray-400' },
  suspended: { label: 'Suspended', color: 'bg-red-500/15 text-red-500 border-red-500/30',             dot: 'bg-red-500' },
};

const ALL_ROLES = ['admin', 'fleet_manager', 'dispatcher', 'driver', 'viewer', 'analyst'];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.viewer;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── User Form Modal ───────────────────────────────────────────────────────────

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSave: (data: { email?: string; name: string; role: string; phone?: string; status?: string }) => void;
  isSaving: boolean;
}

const UserFormModal: React.FC<UserFormProps> = ({ user, onClose, onSave, isSaving }) => {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: user?.email ?? '',
    name: user?.name ?? '',
    role: user?.role ?? 'viewer',
    phone: user?.phone ?? '',
    status: user?.status ?? 'active',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#250C77] flex items-center justify-center">
              <Users size={15} className="text-[#ED642B]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{isEdit ? 'Edit Team Member' : 'Add Team Member'}</h3>
              <p className="text-[11px] text-text-tertiary">{isEdit ? `Update ${user.name}'s role and access` : 'Invite a new member to your company workspace'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer"><X size={15} /></button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 text-xs">
          {!isEdit && (
            <div>
              <label className="block font-semibold text-text-primary mb-1.5">Email Address <span className="text-[#ED642B]">*</span></label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="user@company.com"
                  className="w-full h-10 bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-text-primary mb-1.5">Full Name <span className="text-[#ED642B]">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. John Mwangi"
              className="w-full h-10 bg-bg-surface-raised border border-border-default rounded-lg px-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-text-primary mb-1.5">Role <span className="text-[#ED642B]">*</span></label>
              <Select value={form.role} onValueChange={value => set('role', value)} className="w-full">
                <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_CFG[r]?.label ?? r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="block font-semibold text-text-primary mb-1.5">Status</label>
              <Select value={form.status} onValueChange={value => set('status', value)} className="w-full" disabled={!isEdit}>
                <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Invited</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
              </Select>
              {!isEdit && <p className="mt-1.5 text-[10px] text-text-tertiary">New members start with an invitation pending.</p>}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-text-primary mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full h-10 bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
              />
            </div>
          </div>

          {!isEdit && <div className="rounded-lg border border-[#ED642B]/20 bg-[#ED642B]/5 px-3 py-2.5 text-[11px] text-text-secondary"><span className="font-semibold text-text-primary">Invitation ready.</span> The member will receive access instructions at their email address.</div>}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-default">
            <Button variant="ghost" size="small" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              size="small"
              loading={isSaving}
              icon={isEdit ? <Edit2 size={12} /> : <Plus size={12} />}
              onClick={() => onSave({
                ...(isEdit ? {} : { email: form.email }),
                name: form.name,
                role: form.role,
                phone: form.phone || undefined,
                ...(isEdit ? { status: form.status } : {}),
              })}
            >
              {isEdit ? 'Save Changes' : 'Add User'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmProps> = ({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) => (
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

// ── Main Component ────────────────────────────────────────────────────────────

export const UserManagement: React.FC = () => {
  const qc = useQueryClient();
  const { role: myRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = myRole === 'admin';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState<'create' | User | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; user: User } | null>(null);

  // ── queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter],
    queryFn: () => apiClient.getUsers({
      search: search || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      page_size: 100,
    }),
    staleTime: 30_000,
  });

  const users: User[] = data?.items ?? [];

  // ── mutations ──
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: (d: any) => apiClient.createUser(d),
    onSuccess: () => { invalidate(); setShowForm(null); toast({ variant: 'success', title: 'User Added', message: 'New user account created.' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => apiClient.updateUser(id, d),
    onSuccess: () => { invalidate(); setShowForm(null); toast({ variant: 'success', title: 'User Updated', message: 'Changes saved successfully.' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => apiClient.suspendUser(id),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'User Suspended' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.activateUser(id),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'User Activated' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'User Removed' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  // ── stats ──
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.status === 'active').length;

  // ── confirm handler ──
  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') suspendMutation.mutate(confirm.user.id);
    if (confirm.action === 'activate') activateMutation.mutate(confirm.user.id);
    if (confirm.action === 'delete') deleteMutation.mutate(confirm.user.id);
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Teams</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your team members, roles and access permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" icon={<Filter size={13} />}>Filters</Button>
          {isAdmin && <Button variant="primary" size="small" icon={<Plus size={13} />} onClick={() => setShowForm('create')}>Add Team Member</Button>}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<Users size={13} className="text-[#250C77]" />}>Total Members</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{totalUsers}</MetricCardValue><MetricCardDifferential variant="positive">+8% from last month</MetricCardDifferential></MetricCardContent><MetricCardSparkline data={[{ value: 19 }, { value: 21 }, { value: 22 }, { value: totalUsers }]} color="#250C77" /></MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<UserCheck size={13} className="text-[#ED642B]" />}>Active Members</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{activeCount}</MetricCardValue><MetricCardDifferential variant="positive">{totalUsers ? `${((activeCount / totalUsers) * 100).toFixed(1)}% of total` : '0% of total'}</MetricCardDifferential></MetricCardContent><MetricCardSparkline data={[{ value: 16 }, { value: 18 }, { value: 19 }, { value: activeCount }]} color="#ED642B" /></MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<Shield size={13} className="text-[#250C77]" />}>Roles</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{ALL_ROLES.length}</MetricCardValue><MetricCardDifferential variant="neutral">System roles</MetricCardDifferential></MetricCardContent><MetricCardSparkline data={[{ value: 6 }, { value: 6 }, { value: 6 }]} color="#8B5CF6" /></MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<UserRoundPlus size={13} className="text-[#ED642B]" />}>New This Month</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{users.filter(user => new Date(user.created_at).getMonth() === new Date().getMonth()).length}</MetricCardValue><MetricCardDifferential variant="positive">+50% from last month</MetricCardDifferential></MetricCardContent><MetricCardSparkline data={[{ value: 1 }, { value: 2 }, { value: 2 }, { value: 3 }]} color="#ED642B" /></MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<Mail size={13} className="text-[#250C77]" />}>Invited</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{users.filter(user => user.status === 'inactive').length}</MetricCardValue><MetricCardDifferential variant="neutral">Pending invitation</MetricCardDifferential></MetricCardContent><MetricCardSparkline data={[{ value: 1 }, { value: 1 }, { value: 1 }]} color="#8B5CF6" /></MetricCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-center gap-3">
        <div className="relative w-full lg:flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members by name, email or role..."
            className="w-full h-9 bg-bg-surface border border-border-default rounded-lg pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full lg:w-44 h-9 bg-bg-surface border border-border-default rounded-lg px-3 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none">
          <option value="all">All Roles</option>{ALL_ROLES.map(role => <option key={role} value={role}>{ROLE_CFG[role].label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full lg:w-44 h-9 bg-bg-surface border border-border-default rounded-lg px-3 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none">
          <option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Invited</option><option value="suspended">Suspended</option>
        </select>
        <select className="w-full lg:w-44 h-9 bg-bg-surface border border-border-default rounded-lg px-3 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none" defaultValue="recent"><option value="recent">Recently Added</option><option value="name">Name</option></select>
      </div>

      {!isLoading && users.length > 0 && <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-bg-surface-raised/70 border-b border-border-default">
              <tr>{['Member', 'Role', 'Status', 'Contact', 'Joined', 'Actions'].map((heading, index) => <th key={heading} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary ${index === 5 ? 'text-right' : ''}`}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
                return <tr key={user.id} className="border-b border-border-default last:border-0 hover:bg-bg-surface-raised/40 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-[#5B2BD8] text-white flex items-center justify-center text-xs font-bold shrink-0">{initials}</div><div className="min-w-0"><p className="text-xs font-bold text-text-primary truncate">{user.name}</p><p className="text-[10px] text-text-tertiary truncate">{user.email}</p></div></div></td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-text-secondary"><div className="flex items-center gap-1.5"><Phone size={11} />{user.phone || '—'}</div><div className="flex items-center gap-1.5 mt-1 text-[10px] text-text-tertiary"><Mail size={11} />{user.email}</div></td>
                  <td className="px-4 py-3 text-[11px] text-text-secondary"><div className="flex items-center gap-1.5"><Calendar size={11} />{formatDateTime(user.created_at)}</div><div className="text-[10px] text-text-tertiary mt-1">{user.status === 'inactive' ? 'Pending invitation' : 'Member'}</div></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                    {isAdmin && <><button title="Edit member" onClick={() => setShowForm(user)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised cursor-pointer"><Edit2 size={13} /></button><button title={user.status === 'suspended' ? 'Activate member' : 'Suspend member'} onClick={() => setConfirm({ action: user.status === 'suspended' ? 'activate' : 'suspend', user })} className="p-1.5 rounded-lg text-text-tertiary hover:text-[#ED642B] hover:bg-bg-surface-raised cursor-pointer">{user.status === 'suspended' ? <UserCheck size={13} /> : <Ban size={13} />}</button><button title="Delete member" onClick={() => setConfirm({ action: 'delete', user })} className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 cursor-pointer"><MoreVertical size={14} /></button></>}
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border-default px-4 py-3 text-[11px] text-text-tertiary"><span>Showing 1 to {Math.min(users.length, 10)} of {totalUsers} members</span><div className="flex items-center gap-1"><button className="p-2 rounded-lg bg-bg-surface-raised text-text-tertiary cursor-pointer"><ChevronDown size={13} className="rotate-90" /></button><button className="h-7 w-7 rounded-lg bg-[#ED642B] text-white font-bold cursor-pointer">1</button><button className="h-7 w-7 rounded-lg bg-bg-surface-raised text-text-secondary cursor-pointer">2</button><button className="h-7 w-7 rounded-lg bg-bg-surface-raised text-text-secondary cursor-pointer">3</button><button className="p-2 rounded-lg bg-bg-surface-raised text-text-tertiary cursor-pointer"><ChevronDown size={13} className="-rotate-90" /></button></div><span className="hidden sm:block px-3 py-1.5 rounded-lg border border-border-default">10 per page <ChevronDown size={12} className="inline ml-2" /></span></div>
      </div>}

      {/* User grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border-default bg-bg-surface p-4 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-bg-surface-raised" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-bg-surface-raised rounded w-2/3" />
                  <div className="h-2.5 bg-bg-surface-raised rounded w-1/2" />
                </div>
              </div>
              <div className="h-2.5 bg-bg-surface-raised rounded w-full" />
              <div className="h-2.5 bg-bg-surface-raised rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface p-12 text-center">
          <Users size={28} className="mx-auto mb-3 opacity-20 text-[#250C77]" />
          <p className="text-sm font-semibold text-text-secondary">No users found</p>
          <p className="text-xs text-text-tertiary mt-1">Adjust filters or add a new team member.</p>
          {isAdmin && (
            <Button variant="outline" size="small" className="mt-4" icon={<Plus size={12} />} onClick={() => setShowForm('create')}>
              Add First User
            </Button>
          )}
        </div>
      ) : (
        <div className="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-3 hover:border-[#ED642B]/30 hover:shadow-sm transition-all"
            >
              {/* Avatar + name */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-[#250C77]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[#250C77]">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{user.name}</p>
                    <p className="text-[10px] text-text-tertiary truncate">{user.email}</p>
                  </div>
                </div>
                <StatusBadge status={user.status} />
              </div>

              {/* Role + phone */}
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge role={user.role} />
                {user.phone && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
                    <Phone size={9} />{user.phone}
                  </span>
                )}
              </div>

              {/* Joined date */}
              <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <Calendar size={10} />
                <span>Joined {formatDateTime(user.created_at)}</span>
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-border-default flex-wrap">
                  <Button variant="outline" size="small" icon={<Edit2 size={11} />} onClick={() => setShowForm(user)}>
                    Edit
                  </Button>
                  {user.status === 'suspended' ? (
                    <Button
                      variant="outline"
                      size="small"
                      icon={<UserCheck size={11} />}
                      onClick={() => setConfirm({ action: 'activate', user })}
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<Ban size={11} />}
                      onClick={() => setConfirm({ action: 'suspend', user })}
                    >
                      Suspend
                    </Button>
                  )}
                  <button
                    onClick={() => setConfirm({ action: 'delete', user })}
                    className="ml-auto p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete user"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Role legend */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary mb-3">Role Permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(ROLE_CFG).map(([key]) => (
            <div key={key} className="text-[10px] space-y-1">
              <RoleBadge role={key} />
              <p className="text-text-tertiary pl-0.5">
                {key === 'admin' && 'Full access'}
                {key === 'fleet_manager' && 'Manage fleet & trips'}
                {key === 'dispatcher' && 'Create dispatches'}
                {key === 'driver' && 'View own trips'}
                {key === 'viewer' && 'Read-only access'}
                {key === 'analyst' && 'Analytics & AI'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <UserFormModal
          user={showForm !== 'create' ? showForm : undefined}
          onClose={() => setShowForm(null)}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={(d) => {
            if (showForm === 'create') {
              createMutation.mutate(d);
            } else {
              updateMutation.mutate({ id: (showForm as User).id, ...d });
            }
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.action === 'delete' ? 'Delete User Account' :
            confirm.action === 'suspend' ? 'Suspend User Account' :
            'Activate User Account'
          }
          message={
            confirm.action === 'delete'
              ? `Permanently delete ${confirm.user.name}'s account? This cannot be undone.`
              : confirm.action === 'suspend'
              ? `Suspend ${confirm.user.name}'s access? They will not be able to log in.`
              : `Reactivate ${confirm.user.name}'s account?`
          }
          confirmLabel={
            confirm.action === 'delete' ? 'Delete' :
            confirm.action === 'suspend' ? 'Suspend' : 'Activate'
          }
          danger={confirm.action === 'delete' || confirm.action === 'suspend'}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
