import React, { useState } from 'react';
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

export const Settings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'baselines' | 'rates' | 'telematics' | 'alerts'>('account');

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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Account & Configuration</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your personal profile, organization settings, target stop times, and alert thresholds.
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
      <div className="flex items-center gap-1 border-b border-border-default overflow-x-auto pb-px">
        {[
          { id: 'account',   label: 'Account & Organization', icon: <User size={14} /> },
          { id: 'baselines', label: 'Stop Time Targets',      icon: <Clock size={14} /> },
          { id: 'rates',     label: 'Costs & Penalties',       icon: <DollarSign size={14} /> },
          { id: 'telematics', label: 'Tracking & Webhooks',    icon: <Globe size={14} /> },
          { id: 'alerts',    label: 'Alerts & Notifications',  icon: <Bell size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'border-[#ED642B] text-[#ED642B] bg-[#ED642B]/5 font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

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
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Telematics & Webhook Stream Integration</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time GPS ingestion settings, connected partner services, and automated outbound webhook endpoints.
              </p>
            </div>

            {/* Connected Partner Interstitials */}
            <div className="rounded-xl border border-border-default bg-bg-surface-raised/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Connected Carrier Integrations</h4>
                  <p className="text-[11px] text-text-tertiary">Link external GPS devices and enterprise billing services.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-lg border border-border-default bg-bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TelematicsLogo className="h-7 w-7" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Teltonika & Geotab GPS</p>
                      <p className="text-[10px] text-text-tertiary">Direct MQTT telemetry stream</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="tiny"
                    onClick={() => setShowAuthModal('telematics')}
                  >
                    Authorize
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border border-border-default bg-bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <StripeLogo className="h-7 w-7" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Stripe Demurrage Billing</p>
                      <p className="text-[10px] text-text-tertiary">Automated invoice collection</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="tiny"
                    onClick={() => setShowAuthModal('stripe')}
                  >
                    Authorize
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">GPS Telemetry Refresh Interval</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.gpsPollingInterval}
                    onChange={(e) => handleChange('gpsPollingInterval', e.target.value)}
                    className="w-32 bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
                  />
                  <span className="text-xs text-text-secondary">seconds</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">Live tracking interval on corridor map views.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Outbound Dwell Alert Webhook URL</label>
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => handleChange('webhookUrl', e.target.value)}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
                />
                <p className="text-[11px] text-text-tertiary mt-1">HTTP POST webhook payload fired on excess dwell triggers.</p>
              </div>
            </div>
          </div>
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

      {/* ── INTERSTITIAL AUTHORIZE MODAL ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <InterstitialShell
            logo={
              showAuthModal === 'stripe' ? (
                <LogoPair left={<TurnaroundLogo />} right={<StripeLogo />} />
              ) : (
                <LogoPair left={<TurnaroundLogo />} right={<TelematicsLogo />} />
              )
            }
            title={
              showAuthModal === 'stripe'
                ? 'Authorize Stripe Demurrage Billing'
                : 'Authorize Telematics Gateway Stream'
            }
            description={
              showAuthModal === 'stripe'
                ? 'This will enable automated demurrage invoice generation and settlement on your behalf.'
                : 'This will allow Turnaround to ingest raw GPS NMEA/AVL coordinates from your telematics provider.'
            }
          >
            <div className="flex flex-col gap-3">
              <AccountRow
                displayName={user?.email || 'admin@siginon.com'}
                action={
                  <SignOutButton
                    onClick={() => {
                      toast({
                        variant: 'info',
                        title: 'Switch Account',
                        message: 'Sign in with a different carrier account.'
                      });
                    }}
                  />
                }
              />
              <Button
                variant="primary"
                block
                onClick={() => {
                  toast({
                    variant: 'success',
                    title: showAuthModal === 'stripe' ? 'Stripe Billing Connected' : 'Telematics Ingestion Active',
                    message: 'Credentials and webhook handshake verified successfully.'
                  });
                  setShowAuthModal(null);
                }}
              >
                {showAuthModal === 'stripe' ? 'Authorize Stripe Connection' : 'Authorize Telematics Stream'}
              </Button>
              <Button variant="ghost" block onClick={() => setShowAuthModal(null)}>
                Cancel
              </Button>
            </div>
          </InterstitialShell>
        </div>
      )}
    </div>
  );
};
