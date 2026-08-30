import React, { useState } from 'react';
import {
  Save, Bell, DollarSign, Clock, Globe
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const Settings: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'baselines' | 'rates' | 'telematics' | 'alerts'>('baselines');

  const [settings, setSettings] = useState({
    companyName: 'Siginon Global Logistics',
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
      title: 'Configuration Saved',
      message: 'System SLA baselines, cost rates, and telemetry intervals updated.'
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
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Configuration</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Set your target stop times, costs, tracking intervals, and alert thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface hover:bg-bg-surface-raised text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-1 border-b border-border-default overflow-x-auto pb-px">
        {[
          { id: 'baselines', label: 'Stop Time Targets',    icon: <Clock size={14} /> },
          { id: 'rates',     label: 'Costs & Penalties',     icon: <DollarSign size={14} /> },
          { id: 'telematics', label: 'Tracking & Webhooks',  icon: <Globe size={14} /> },
          { id: 'alerts',    label: 'Alerts & Notifications', icon: <Bell size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
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

        {/* TAB 3: TELEMATICS */}
        {activeTab === 'telematics' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Telematics & Webhook Stream Integration</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time GPS ingestion settings and automated outbound webhook endpoints.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">GPS Telemetry Refresh Interval</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.gpsPollingInterval}
                    onChange={(e) => handleChange('gpsPollingInterval', e.target.value)}
                    className="w-32 bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
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
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
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

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-text-primary">Automated Dispatch Email Digest</p>
                  <p className="text-[11px] text-text-tertiary">Daily executive summary of leaked turnaround capital.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailAlertsEnabled}
                  onChange={(e) => handleChange('emailAlertsEnabled', e.target.checked)}
                  className="rounded accent-brand-500 cursor-pointer h-4 w-4"
                />
              </div>

              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-text-primary">SMS Critical Dwell Alerts to Fleet Managers</p>
                  <p className="text-[11px] text-text-tertiary">Immediate SMS trigger when a unit exceeds 60m past SLA threshold.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsAlertsEnabled}
                  onChange={(e) => handleChange('smsAlertsEnabled', e.target.checked)}
                  className="rounded accent-brand-500 cursor-pointer h-4 w-4"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
