import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, Shield, Truck, Eye, Edit2, Trash2,
  CheckCircle2, Ban, RefreshCw, ChevronDown, X, UserCheck,
  Mail, Phone, Calendar,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/format';
import type { User } from '../../lib/api/types';

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
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#250C77] flex items-center justify-center">
              <Users size={15} className="text-[#ED642B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{isEdit ? 'Edit User' : 'Add New User'}</h3>
              <p className="text-[11px] text-text-tertiary">{isEdit ? `Editing ${user.name}` : 'Create a company team member'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer"><X size={15} /></button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 text-xs">
          {!isEdit && (
            <div>
              <label className="block font-semibold text-text-primary mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="user@company.com"
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-text-primary mb-1.5">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. John Mwangi"
              className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-text-primary mb-1.5">Role *</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  className="w-full appearance-none bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none pr-8"
                >
                  {ALL_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_CFG[r]?.label ?? r}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="block font-semibold text-text-primary mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    className="w-full appearance-none bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none pr-8"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            )}
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
                className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
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
  const suspendedCount = users.filter(u => u.status === 'suspended').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  // ── confirm handler ──
  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') suspendMutation.mutate(confirm.user.id);
    if (confirm.action === 'activate') activateMutation.mutate(confirm.user.id);
    if (confirm.action === 'delete') deleteMutation.mutate(confirm.user.id);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md">
            <Users size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Team & User Management</h1>
            <p className="text-xs text-text-secondary mt-0.5">Manage company staff, roles, and account access</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="primary" size="small" icon={<Plus size={13} />} onClick={() => setShowForm('create')}>
            Add User
          </Button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: totalUsers,     color: 'text-text-primary' },
          { label: 'Active',       value: activeCount,    color: 'text-emerald-500' },
          { label: 'Suspended',    value: suspendedCount, color: 'text-red-500' },
          { label: 'Admins',       value: adminCount,     color: 'text-[#250C77]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-tertiary mb-1">{label}</p>
            <p className={`text-2xl font-black font-numeric ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default">
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <span className="text-[10px] text-text-tertiary font-semibold shrink-0">Role:</span>
          {(['all', ...ALL_ROLES]).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
                roleFilter === r ? 'bg-[#250C77] text-white' : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              {r === 'all' ? 'All' : ROLE_CFG[r]?.label ?? r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <span className="text-[10px] text-text-tertiary font-semibold shrink-0">Status:</span>
          {(['all', 'active', 'inactive', 'suspended']).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors cursor-pointer capitalize ${
                statusFilter === s ? 'bg-[#250C77] text-white' : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          {Object.entries(ROLE_CFG).map(([key, cfg]) => (
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
