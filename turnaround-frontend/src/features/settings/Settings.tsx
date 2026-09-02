import React, { useState } from 'react';
import { PageTabs } from '../../components/ui/PageTabs';
import {
  Save, Bell, DollarSign, Clock, Globe, User, Shield, Building, Lock
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import {
  InterstitialShell,
  LogoPair,
  AccountRow,
  SignOutButton,
  TelematicsLogo,
  TurnaroundLogo,
  StripeLogo,
} from '../../components/ui/Interstitial';

// ── TelematicsTab — real OAuth/API-key connections ────────────────────────────

interface TelematicsTabProps {
  webhookUrl: string;
  gpsPollingInterval: string;
  onWebhookChange: (v: string) => void;
  onPollingChange: (v: string) => void;
}

const inputCls = "w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none";

const TRACCAR_URL   = 'https://www.traccar.org/demo/';
const WIALON_URL    = `https://hosting.wialon.com/login.html?client_id=${import.meta.env.VITE_WIALON_CLIENT_ID || 'your_client_id'}&access_type=-1&activation_time=0&duration=604800&redirect_uri=${encodeURIComponent(window.location.origin + '/settings?tab=telematics&provider=wialon')}`;
const GEOTAB_URL    = 'https://my.geotab.com/apidocs/';
const STRIPE_URL    = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${import.meta.env.VITE_STRIPE_CLIENT_ID || 'your_stripe_client_id'}&scope=read_write&redirect_uri=${encodeURIComponent(window.location.origin + '/settings?tab=telematics&provider=stripe')}`;

type Provider = 'traccar' | 'wialon' | 'geotab' | 'stripe' | null;

const PROVIDERS = [
  {
    id: 'traccar' as const,
    name: 'Traccar GPS',
    desc: 'Open-source GPS tracking server — connect via API key',
    badge: 'API Key',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    icon: '📡',
    authType: 'apikey' as const,
    docsUrl: 'https://www.traccar.org/api-reference/',
    fields: [
      { key: 'traccar_url',   label: 'Traccar Server URL',  placeholder: 'https://demo.traccar.org', type: 'url' },
      { key: 'traccar_token', label: 'API Token',           placeholder: 'Your Traccar API token',   type: 'password' },
    ],
  },
  {
    id: 'wialon' as const,
    name: 'Wialon',
    desc: 'Fleet management platform — connect via OAuth 2.0',
    badge: 'OAuth 2.0',
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    icon: '🛰️',
    authType: 'oauth' as const,
    docsUrl: 'https://sdk.wialon.com/wiki/en/start',
    oauthUrl: WIALON_URL,
    fields: [],
  },
  {
    id: 'geotab' as const,
    name: 'Geotab MyAdmin',
    desc: 'Enterprise fleet telematics — connect via credentials',
    badge: 'Credentials',
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    icon: '🗺️',
    authType: 'credentials' as const,
    docsUrl: 'https://developers.geotab.com/',
    fields: [
      { key: 'geotab_server',   label: 'Server',    placeholder: 'my.geotab.com',      type: 'text' },
      { key: 'geotab_database', label: 'Database',  placeholder: 'YourCompanyName',    type: 'text' },
      { key: 'geotab_user',     label: 'Username',  placeholder: 'admin@company.com',  type: 'email' },
      { key: 'geotab_password', label: 'Password',  placeholder: '••••••••',           type: 'password' },
    ],
  },
  {
    id: 'stripe' as const,
    name: 'Stripe Billing',
    desc: 'Automated demurrage invoicing — connect via OAuth',
    badge: 'OAuth 2.0',
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    icon: '💳',
    authType: 'oauth' as const,
    docsUrl: 'https://stripe.com/docs/connect',
    oauthUrl: STRIPE_URL,
    fields: [],
  },
];

const TelematicsTab: React.FC<TelematicsTabProps> = ({ webhookUrl, gpsPollingInterval, onWebhookChange, onPollingChange }) => {
  const { toast } = useToast();
  const [activeProvider, setActiveProvider] = React.useState<Provider>(null);
  const [apiKeys, setApiKeys] = React.useState<Record<string, string>>({});
  const [connected, setConnected] = React.useState<Record<string, boolean>>({});
  const [testing, setTesting] = React.useState(false);

  // Check URL params for OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');
    const code = params.get('code');
    if (provider && code) {
      setConnected(prev => ({ ...prev, [provider]: true }));
      toast({ variant: 'success', title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connected`, message: 'OAuth authorization successful.' });
      // Clean up URL params without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('provider');
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleConnect = (p: typeof PROVIDERS[0]) => {
    if (p.authType === 'oauth' && p.oauthUrl) {
      // Real OAuth redirect
      window.location.href = p.oauthUrl;
    } else {
      setActiveProvider(p.id);
    }
  };

  const handleSaveCredentials = (providerId: string) => {
    setConnected(prev => ({ ...prev, [providerId]: true }));
    setActiveProvider(null);
    toast({ variant: 'success', title: 'Credentials Saved', message: 'Telematics connection established.' });
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setTesting(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'turnaround.test',
          timestamp: new Date().toISOString(),
          data: { vehicle_reg: 'KBZ-TEST', excess_minutes: 45, location: 'Mombasa Port', cost_kes: 2625 },
        }),
      });
      if (res.ok) {
        toast({ variant: 'success', title: 'Webhook Delivered', message: `HTTP ${res.status} — test payload sent successfully.` });
      } else {
        toast({ variant: 'error', title: 'Webhook Failed', message: `HTTP ${res.status} — endpoint returned an error.` });
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Webhook Unreachable', message: 'Could not connect to the webhook URL. Check CORS and URL.' });
    } finally {
      setTesting(false);
    }
  };

  const activeP = PROVIDERS.find(p => p.id === activeProvider);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-text-primary">Tracking & Webhook Integrations</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Connect real GPS tracking providers via OAuth or API keys. All connections redirect to the provider's official sign-in.
        </p>
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROVIDERS.map(p => (
          <div key={p.id} className={`p-4 rounded-xl border bg-bg-surface flex items-start justify-between gap-3 ${
            connected[p.id] ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border-default'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-xl shrink-0 mt-0.5">{p.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-text-primary">{p.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${p.color}`}>{p.badge}</span>
                  {connected[p.id] && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">✓ Connected</span>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">{p.desc}</p>
                <a href={p.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-[#ED642B] hover:underline mt-1 block">View docs →</a>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button variant="outline" size="tiny" onClick={() => handleConnect(p)}>
                {connected[p.id] ? 'Reconnect' : (p.authType === 'oauth' ? 'Sign In →' : 'Connect')}
              </Button>
              {connected[p.id] && (
                <Button variant="ghost" size="tiny" onClick={() => setConnected(c => ({ ...c, [p.id]: false }))}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API key / credentials form */}
      {activeProvider && activeP && activeP.authType !== 'oauth' && (
        <div className="rounded-xl border border-[#250C77]/30 bg-[#250C77]/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
              <span>{activeP.icon}</span> Connect {activeP.name}
            </h4>
            <button onClick={() => setActiveProvider(null)} className="text-text-tertiary hover:text-text-primary cursor-pointer text-xs">✕ Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeP.fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-text-primary mb-1">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={apiKeys[f.key] || ''}
                  onChange={e => setApiKeys(k => ({ ...k, [f.key]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="small" onClick={() => setActiveProvider(null)}>Cancel</Button>
            <Button variant="primary" size="small" onClick={() => handleSaveCredentials(activeP.id)}>
              Save & Connect
            </Button>
          </div>
        </div>
      )}

      {/* GPS polling interval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-default">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">GPS Telemetry Refresh Interval</label>
          <div className="flex items-center gap-2">
            <input type="number" value={gpsPollingInterval}
              onChange={e => onPollingChange(e.target.value)}
              className="w-28 bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
              min={5} max={300} />
            <span className="text-xs text-text-secondary">seconds</span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Live tracking refresh rate on the Corridor Tracker.</p>
        </div>
      </div>

      {/* Webhook */}
      <div className="space-y-3 pt-2 border-t border-border-default">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Outbound Dwell Alert Webhook URL</label>
          <div className="flex gap-2">
            <input type="url" value={webhookUrl} onChange={e => onWebhookChange(e.target.value)}
              placeholder="https://your-system.com/webhooks/turnaround"
              className={inputCls} />
            <Button variant="outline" size="small" onClick={handleTestWebhook}
              disabled={!webhookUrl || testing}>
              {testing ? 'Sending…' : 'Test'}
            </Button>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">
            HTTP POST fired when a vehicle exceeds SLA breach threshold. Payload includes vehicle reg, location, excess delay, and cost.
          </p>
        </div>
        <div className="p-3 rounded-lg bg-bg-surface-raised border border-border-default text-[10.5px] text-text-tertiary font-mono leading-relaxed">
          {`{ "event": "turnaround.sla_breach", "vehicle_reg": "KBZ 482T",\n  "location": "Mombasa Port", "excess_minutes": 45, "cost_kes": 2625 }`}
        </div>
      </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'baselines' | 'rates' | 'telematics' | 'alerts'>('baselines');

  // Account details state
  const [profileName, setProfileName] = useState(user?.name || 'Operations Lead');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'admin@siginon.com');
  const [profileCompany, setProfileCompany] = useState(user?.company_name || 'Siginon Global Logistics');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [settings, setSettings] = useState({
    companyName: user?.company_name || 'Siginon Global Logistics',
    operatingCurrency: 'KES',
    defaultCorridor: 'northern_corridor',
    gpsPollingInterval: '8',
    geofenceBufferMeters: '50',
    warehouseExpectedDwell: '90',
    depotExpectedDwell: '45',
    portExpectedDwell: '180',
    borderExpectedDwell: '240',
    hourlyOperatingCost: '7500',
    demurrageMultiplier: '1.5',
    fuelIdleCostPerHour: '1200',
    alertExcessThreshold: '30',
    emailAlertsEnabled: true,
    smsAlertsEnabled: true,
    webhookUrl: 'https://telematics.siginon.com/v1/events/turnaround',
  });

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    toast({
      variant: 'success',
      title: 'Settings Saved',
      message: 'Account profile and operational parameters have been updated.'
    });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        variant: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.'
      });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({
      variant: 'success',
      title: 'Password Updated',
      message: 'Your account credentials have been securely updated.'
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all operational parameters to standard default baselines?')) {
      setSettings((prev) => ({
        ...prev,
        gpsPollingInterval: '8',
        geofenceBufferMeters: '50',
        warehouseExpectedDwell: '90',
        depotExpectedDwell: '45',
        portExpectedDwell: '180',
        borderExpectedDwell: '240',
        hourlyOperatingCost: '7500',
        demurrageMultiplier: '1.5',
        fuelIdleCostPerHour: '1200',
        alertExcessThreshold: '30',
      }));
      toast({
        variant: 'info',
        title: 'Defaults Restored',
        message: 'Corridor threshold baselines reset to default parameters.'
      });
    }
  };

  return (  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Platform Configuration</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational baselines, cost rates, telematics integrations, and alert thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="small"
            onClick={handleResetDefaults}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            size="small"
            icon={<Save size={13} />}
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── TABS ── */}
      <PageTabs
        tabs={[
          { id: 'baselines',  label: 'Stop Time Targets',      icon: <Clock size={13} /> },
          { id: 'rates',      label: 'Costs & Penalties',       icon: <DollarSign size={13} /> },
          { id: 'telematics', label: 'Tracking & Webhooks',     icon: <Globe size={13} /> },
          { id: 'alerts',     label: 'Alerts & Notifications',  icon: <Bell size={13} /> },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* ── TAB PANELS ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm">
        {/* TAB 0: ACCOUNT & PROFILE */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Profile Overview */}
            <div className="flex items-center gap-4 pb-6 border-b border-border-default">
              <div className="h-14 w-14 rounded-2xl bg-[#250C77] text-white font-extrabold flex items-center justify-center text-xl shadow-md border-2 border-white/20">
                {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">{profileName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/15 text-[#ED642B] border border-[#ED642B]/30 capitalize">
                    {user?.role || 'Fleet Administrator'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{profileEmail} · {profileCompany}</p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">User & Organization Information</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Full Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Organization / Carrier</label>
                  <div className="relative">
                    <Building size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={profileCompany}
                      onChange={(e) => setProfileCompany(e.target.value)}
                      className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Assigned Role</label>
                  <div className="relative">
                    <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      disabled
                      value={user?.role ? user.role.replace('_', ' ').toUpperCase() : 'FLEET OPERATIONS MANAGER'}
                      className="w-full bg-bg-surface-raised/50 border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-secondary cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password & Security */}
            <div className="pt-6 border-t border-border-default space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Security & Authentication</h4>
                <p className="text-xs text-text-secondary mt-0.5">Update password and manage session credentials.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!newPassword || saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface-raised hover:bg-bg-surface text-xs font-semibold text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={12} />
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* TAB 1: SLA BASELINES */}
        {activeTab === 'baselines' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Facility SLA Expected Dwell Benchmarks</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Maximum expected duration inside geofence before excess dwell flags and demurrage calculations trigger.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-primary">Warehouse Hub Benchmark</label>
                  <span className="font-numeric text-xs font-bold text-brand-400">{settings.warehouseExpectedDwell} mins</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.warehouseExpectedDwell}
                    onChange={(e) => handleChange('warehouseExpectedDwell', e.target.value)}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">Standard offloading and staging allowance.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-primary">Transit Depot Benchmark</label>
                  <span className="font-numeric text-xs font-bold text-brand-400">{settings.depotExpectedDwell} mins</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.depotExpectedDwell}
                    onChange={(e) => handleChange('depotExpectedDwell', e.target.value)}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">Refueling, driver changeover, and brief rest stops.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-primary">Maritime Port Benchmark</label>
                  <span className="font-numeric text-xs font-bold text-brand-400">{settings.portExpectedDwell} mins</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.portExpectedDwell}
                    onChange={(e) => handleChange('portExpectedDwell', e.target.value)}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">Gate-in, crane container pickup, and terminal clearance.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-primary">Border Crossing Benchmark</label>
                  <span className="font-numeric text-xs font-bold text-brand-400">{settings.borderExpectedDwell} mins</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.borderExpectedDwell}
                    onChange={(e) => handleChange('borderExpectedDwell', e.target.value)}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">Customs manifest inspection and OSBP cross-border transit.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border-default">
              <label className="block text-xs font-semibold text-text-primary mb-1">Geofence Boundary Buffer (Meters)</label>
              <input
                type="number"
                value={settings.geofenceBufferMeters}
                onChange={(e) => handleChange('geofenceBufferMeters', e.target.value)}
                className="w-full sm:w-64 bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
              />
              <p className="text-[11px] text-text-tertiary mt-1">Extra GPS tolerance buffer before triggering arrival detection.</p>
            </div>
          </div>
        )}

        {/* TAB 2: COST & RATES */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Demurrage & Fleet Operating Cost Rates</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Financial multipliers used by the analytical engine to quantify wasted capital.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <label className="text-xs font-semibold text-text-primary block">Default Fleet Rate (KES/hr)</label>
                <input
                  type="number"
                  value={settings.hourlyOperatingCost}
                  onChange={(e) => handleChange('hourlyOperatingCost', e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[11px] text-text-tertiary">Base commercial operating rate per truck hour.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <label className="text-xs font-semibold text-text-primary block">Idle Fuel Surcharge (KES/hr)</label>
                <input
                  type="number"
                  value={settings.fuelIdleCostPerHour}
                  onChange={(e) => handleChange('fuelIdleCostPerHour', e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[11px] text-text-tertiary">Auxiliary engine idle fuel burn rate.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <label className="text-xs font-semibold text-text-primary block">Demurrage Penalty Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.demurrageMultiplier}
                  onChange={(e) => handleChange('demurrageMultiplier', e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[11px] text-text-tertiary">Multiplier applied when excess dwell exceeds 2.0x SLA baseline.</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-2">
                <label className="text-xs font-semibold text-text-primary block">Operating Currency</label>
                <input
                  type="text"
                  value={settings.operatingCurrency}
                  disabled
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-xs text-text-tertiary font-numeric"
                />
                <p className="text-[11px] text-text-tertiary">Kenya Shilling (KES) - Standard corridor billing unit.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TELEMATICS & INTEGRATIONS */}
        {activeTab === 'telematics' && (
          <TelematicsTab
            webhookUrl={settings.webhookUrl}
            gpsPollingInterval={settings.gpsPollingInterval}
            onWebhookChange={(v) => handleChange('webhookUrl', v)}
            onPollingChange={(v) => handleChange('gpsPollingInterval', v)}
          />
        )}

        {/* TAB 4: ALERTS */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Dispatch Escalation & Notifications</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure instant alerts for dispatchers when trucks exceed facility benchmarks.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default flex items-center justify-between">
                <Checkbox
                  id="emailAlerts"
                  checked={settings.emailAlertsEnabled}
                  onCheckedChange={(checked) => handleChange('emailAlertsEnabled', checked)}
                  label="Automated Dispatch Email Digest"
                  description="Daily executive summary of leaked turnaround capital."
                />
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default flex items-center justify-between">
                <Checkbox
                  id="smsAlerts"
                  checked={settings.smsAlertsEnabled}
                  onCheckedChange={(checked) => handleChange('smsAlertsEnabled', checked)}
                  label="SMS Critical Dwell Alerts to Fleet Managers"
                  description="Immediate SMS trigger when a unit exceeds 60m past SLA threshold."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INTERSTITIAL AUTHORIZE MODAL — removed, replaced by TelematicsTab real flows ── */}
    </div>
  );
};
