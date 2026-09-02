import React, { useState } from 'react';
import { PageTabs } from '../../components/ui/PageTabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, User, Bell, Shield, Eye, EyeOff,
  Save, Lock, Phone, Mail, Building2, CheckCircle2,
  AlertTriangle, Sun, Moon, Monitor,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useTheme } from '../../lib/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/format';
import type { NotificationPreferences } from '../../lib/api/types';

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <User size={14} /> },
  { id: 'security',      label: 'Security',      icon: <Shield size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'appearance',    label: 'Appearance',    icon: <Sun size={14} /> },
];

// ── Toggle Switch ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-border-default last:border-0">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-text-primary">{label}</p>
      {description && <p className="text-[11px] text-text-tertiary mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
        checked ? 'bg-[#250C77]' : 'bg-bg-surface-raised border border-border-default'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  </div>
);

// ── Profile Tab ───────────────────────────────────────────────────────────────

const ProfileTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['account', 'profile'],
    queryFn: apiClient.getProfile,
    staleTime: 60_000,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateProfile({ name: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', 'profile'] });
      setIsDirty(false);
      toast({ variant: 'success', title: 'Profile Updated', message: 'Your profile has been saved.' });
    },
    onError: (e: any) => toast({ variant: 'error', title: 'Update Failed', message: e?.message }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-bg-surface-raised rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-bg-surface-raised border border-border-default">
        <div className="h-14 w-14 rounded-2xl bg-[#250C77] flex items-center justify-center shrink-0 shadow-md">
          <span className="text-xl font-black text-white">{(profile?.name ?? user?.name ?? 'U').charAt(0)}</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">{profile?.name}</p>
          <p className="text-xs text-text-tertiary">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#250C77]/15 text-[#250C77] font-bold border border-[#250C77]/30 capitalize">
              {profile?.role?.replace('_', ' ')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold border border-emerald-500/30">
              {profile?.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-text-primary mb-1.5">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setIsDirty(true); }}
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-semibold text-text-primary mb-1.5">Email Address</label>
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full bg-bg-surface-raised/50 border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-tertiary opacity-60 cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">Email changes must be done through Supabase Auth.</p>
        </div>
        <div>
          <label className="block font-semibold text-text-primary mb-1.5">Phone Number</label>
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setIsDirty(true); }}
              placeholder="+254 7XX XXX XXX"
              className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block font-semibold text-text-primary mb-1.5">Company</label>
          <div className="relative">
            <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={profile?.company_name ?? '—'}
              disabled
              className="w-full bg-bg-surface-raised/50 border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-tertiary opacity-60 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-bg-surface-raised/50 border border-border-default text-[11px] text-text-tertiary flex items-center gap-2">
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
        Member since {profile?.created_at ? formatDateTime(profile.created_at) : '—'}
        {profile?.last_login && <span className="ml-3 opacity-70">· Last login: {formatDateTime(profile.last_login)}</span>}
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="small"
          icon={<Save size={12} />}
          disabled={!isDirty}
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// ── Security Tab ──────────────────────────────────────────────────────────────

const SecurityTab: React.FC = () => {
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const changeMutation = useMutation({
    mutationFn: () => apiClient.changePassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast({ variant: 'success', title: 'Password Updated', message: 'Your password has been changed.' });
    },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const pwMatch = newPw === confirmPw;
  const pwStrong = newPw.length >= 8;
  const canSubmit = currentPw && newPw && confirmPw && pwMatch && pwStrong;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl border border-border-default bg-bg-surface-raised/40 space-y-1">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-[#250C77]" />
          <p className="text-xs font-bold text-text-primary">Authentication</p>
        </div>
        <p className="text-[11px] text-text-secondary">Your account is secured through Supabase Auth with JWT tokens.</p>
        <div className="flex items-center gap-1.5 mt-2">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-[11px] text-emerald-600 font-semibold">2FA available via Supabase Auth</span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
          <Lock size={13} className="text-[#ED642B]" /> Change Password
        </h4>

        {[
          { label: 'Current Password', value: currentPw, setter: setCurrentPw, show: showCurrent, toggle: setShowCurrent },
          { label: 'New Password', value: newPw, setter: setNewPw, show: showNew, toggle: setShowNew },
          { label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw, show: showConfirm, toggle: setShowConfirm },
        ].map(({ label, value, setter, show, toggle }) => (
          <div key={label}>
            <label className="block text-[11px] font-semibold text-text-primary mb-1.5">{label}</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none pr-9"
              />
              <button
                type="button"
                onClick={() => toggle(!show)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer"
              >
                {show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        ))}

        {/* Strength indicators */}
        {newPw && (
          <div className="space-y-1 text-[10px]">
            <div className={`flex items-center gap-1.5 ${pwStrong ? 'text-emerald-500' : 'text-red-500'}`}>
              {pwStrong ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              Minimum 8 characters
            </div>
            {confirmPw && (
              <div className={`flex items-center gap-1.5 ${pwMatch ? 'text-emerald-500' : 'text-red-500'}`}>
                {pwMatch ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                Passwords {pwMatch ? 'match' : "don't match"}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="small"
            icon={<Lock size={12} />}
            disabled={!canSubmit}
            loading={changeMutation.isPending}
            onClick={() => changeMutation.mutate()}
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Notifications Tab ─────────────────────────────────────────────────────────

const NotificationsTab: React.FC = () => {
  const { toast } = useToast();

  const { data: prefs } = useQuery({
    queryKey: ['account', 'notifications'],
    queryFn: apiClient.getNotificationPreferences,
    staleTime: 60_000,
  });

  const [local, setLocal] = useState<NotificationPreferences | null>(null);

  React.useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: (p: NotificationPreferences) => apiClient.updateNotificationPreferences(p),
    onSuccess: () => toast({ variant: 'success', title: 'Preferences Saved' }),
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  if (!local) return <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-bg-surface-raised rounded-lg" />)}</div>;

  const set = (k: keyof NotificationPreferences, v: boolean) => setLocal(p => p ? { ...p, [k]: v } : p);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1">
        <p className="text-xs font-bold text-text-primary mb-2">Delivery Channels</p>
        <Toggle checked={local.email_notifications} onChange={v => set('email_notifications', v)} label="Email Notifications" description="Receive alerts via email" />
        <Toggle checked={local.sms_notifications} onChange={v => set('sms_notifications', v)} label="SMS Alerts" description="Receive critical alerts via SMS (requires phone number)" />
        <Toggle checked={local.push_notifications} onChange={v => set('push_notifications', v)} label="In-App Notifications" description="Show real-time alerts in the platform" />
      </div>

      <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1">
        <p className="text-xs font-bold text-text-primary mb-2">Alert Types</p>
        <Toggle checked={local.notify_on_delay} onChange={v => set('notify_on_delay', v)} label="Delay Alerts" description="When a vehicle exceeds SLA dwell time" />
        <Toggle checked={local.notify_on_arrival} onChange={v => set('notify_on_arrival', v)} label="Arrival Confirmations" description="When a trip reaches its destination" />
        <Toggle checked={local.notify_on_gate_pass} onChange={v => set('notify_on_gate_pass', v)} label="Gate Pass Activity" description="When passes are issued, used, or revoked" />
        <Toggle checked={local.notify_on_demurrage} onChange={v => set('notify_on_demurrage', v)} label="Demurrage Claims" description="New demurrage claims and status changes" />
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="small"
          icon={<Save size={12} />}
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate(local)}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

// ── Appearance Tab ────────────────────────────────────────────────────────────

const AppearanceTab: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const themes = [
    { id: 'light', label: 'Light', icon: <Sun size={16} />, desc: 'Clean white interface' },
    { id: 'dark',  label: 'Dark',  icon: <Moon size={16} />, desc: 'Dark background, easy on eyes' },
    { id: 'system', label: 'System', icon: <Monitor size={16} />, desc: 'Follow device setting' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-text-primary mb-3">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { if (t.id !== 'system' && theme !== t.id) toggleTheme(); }}
              className={`p-4 rounded-xl border-2 text-center space-y-2 cursor-pointer transition-all ${
                (t.id === 'system' ? false : theme === t.id)
                  ? 'border-[#250C77] bg-[#250C77]/5'
                  : 'border-border-default hover:border-[#ED642B]/40'
              }`}
            >
              <div className="flex justify-center text-text-primary">{t.icon}</div>
              <p className="text-xs font-bold text-text-primary">{t.label}</p>
              <p className="text-[10px] text-text-tertiary">{t.desc}</p>
              {(t.id !== 'system' && theme === t.id) && (
                <div className="inline-flex items-center gap-1 text-[10px] text-[#250C77] font-bold">
                  <CheckCircle2 size={11} /> Active
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-bg-surface-raised/50 p-4 text-xs text-text-secondary space-y-1">
        <p className="font-semibold text-text-primary">Display Density</p>
        <p className="text-[11px]">The interface uses a compact density optimised for fleet operations dashboards.</p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md">
          <Settings size={18} className="text-[#ED642B]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Account Settings</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage your profile, security, and preferences</p>
        </div>
      </div>

      {/* Tab bar */}
      <PageTabs
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
        active={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
      />

      {/* Tab content */}
      <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-sm">
        {activeTab === 'profile'       && <ProfileTab />}
        {activeTab === 'security'      && <SecurityTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'appearance'    && <AppearanceTab />}
      </div>
    </div>
  );
};
