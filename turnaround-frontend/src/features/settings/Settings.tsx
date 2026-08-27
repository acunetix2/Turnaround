import React, { useState } from 'react';
import {
  Sliders, Save, RefreshCw, Bell, DollarSign, Clock, MapPin,
  Building, ShieldCheck, CheckCircle2, AlertTriangle, Radio
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    companyName: 'Turnaround Haulage Ltd',
    operatingCurrency: 'KES',
    defaultCorridor: 'northern_corridor',
    gpsPollingInterval: '15',
    geofenceBufferMeters: '50',
    warehouseExpectedDwell: '90',
    depotExpectedDwell: '45',
    portExpectedDwell: '180',
    borderExpectedDwell: '240',
    hourlyOperatingCost: '3500',
    demurrageMultiplier: '1.5',
    fuelIdleCostPerHour: '950',
    alertExcessThreshold: '30',
    emailAlertsEnabled: true,
    smsAlertsEnabled: true,
    webhookUrl: 'https://api.turnaround.io/v1/telematics/events',
  });

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate persisting system configuration
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    showToast('System configuration saved successfully', 'success');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all threshold values to factory logistics defaults?')) {
      setSettings((prev) => ({
        ...prev,
        gpsPollingInterval: '15',
        geofenceBufferMeters: '50',
        warehouseExpectedDwell: '90',
        depotExpectedDwell: '45',
        portExpectedDwell: '180',
        borderExpectedDwell: '240',
        hourlyOperatingCost: '3500',
        demurrageMultiplier: '1.5',
        fuelIdleCostPerHour: '950',
        alertExcessThreshold: '30',
      }));
      showToast('Thresholds reset to standard baselines', 'info');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-[#F4F5F7] placeholder:text-[#4B5563] focus:border-[#4F7CFF]/60 focus:bg-white/[0.06] focus:outline-none transition-colors font-mono';
  const labelCls = 'block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <h1 className="font-ui text-xl font-bold text-text-primary flex items-center gap-2.5">
            <Sliders size={20} className="text-[#4F7CFF]" />
            Fleet System Configuration
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Configure baseline dwell allowances, telemetry refresh rates, and automated cost calculation algorithms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-surface-raised transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#4F7CFF] hover:bg-[#6E92FF] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#4F7CFF]/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save size={14} />
            {saving ? 'Saving Changes…' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: Dwell Threshold Baselines */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Location Dwell Thresholds (Minutes)
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expected time allowed per facility type before excess delay and demurrage costs trigger.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Warehouse & DC</label>
              <input
                type="number"
                value={settings.warehouseExpectedDwell}
                onChange={(e) => handleChange('warehouseExpectedDwell', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Default: 90 mins</span>
            </div>

            <div>
              <label className={labelCls}>Transit Depot</label>
              <input
                type="number"
                value={settings.depotExpectedDwell}
                onChange={(e) => handleChange('depotExpectedDwell', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Default: 45 mins</span>
            </div>

            <div>
              <label className={labelCls}>Port Terminal</label>
              <input
                type="number"
                value={settings.portExpectedDwell}
                onChange={(e) => handleChange('portExpectedDwell', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Default: 180 mins</span>
            </div>

            <div>
              <label className={labelCls}>Border Crossing</label>
              <input
                type="number"
                value={settings.borderExpectedDwell}
                onChange={(e) => handleChange('borderExpectedDwell', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Default: 240 mins</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Financial & Loss Quantification Engine */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Cost Quantification Engine
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Parameters used to compute monetary financial loss per excess dwell hour across the fleet.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Hourly Vehicle Rate (KES/hr)</label>
              <input
                type="number"
                value={settings.hourlyOperatingCost}
                onChange={(e) => handleChange('hourlyOperatingCost', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Driver salary + capital depreciation</span>
            </div>

            <div>
              <label className={labelCls}>Demurrage Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={settings.demurrageMultiplier}
                onChange={(e) => handleChange('demurrageMultiplier', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Applied to port/border delays</span>
            </div>

            <div>
              <label className={labelCls}>Fuel Idle Burn (KES/hr)</label>
              <input
                type="number"
                value={settings.fuelIdleCostPerHour}
                onChange={(e) => handleChange('fuelIdleCostPerHour', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Auxiliary engine consumption</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Telemetry & GPS Ingestion */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 text-[#6E92FF]">
              <Radio size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Telemetry & Geofence Sync
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Live GPS ingestion rate and spatial geofence buffer distance for accurate arrival/departure detection.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="GPS Sync Polling Interval"
                value={settings.gpsPollingInterval}
                onChange={(v) => handleChange('gpsPollingInterval', v)}
                options={[
                  { value: '10', label: '10 Seconds', description: 'Highest live precision (higher bandwidth)' },
                  { value: '15', label: '15 Seconds (Recommended)', description: 'Balanced real-time tracking' },
                  { value: '30', label: '30 Seconds', description: 'Standard long-haul telemetry' },
                  { value: '60', label: '60 Seconds', description: 'Low bandwidth mode' },
                ]}
              />
            </div>

            <div>
              <label className={labelCls}>Geofence Entry Buffer (Meters)</label>
              <input
                type="number"
                value={settings.geofenceBufferMeters}
                onChange={(e) => handleChange('geofenceBufferMeters', e.target.value)}
                className={inputCls}
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">Tolerance for GPS jitter near gate entrance</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Alerts & Escalations */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Alert Escalations & Webhooks
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Automated alert dispatch thresholds for dispatchers and fleet operations managers.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Excess Dwell Alert Trigger (Minutes Over Limit)</label>
                <input
                  type="number"
                  value={settings.alertExcessThreshold}
                  onChange={(e) => handleChange('alertExcessThreshold', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Telematics Webhook URL</label>
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => handleChange('webhookUrl', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailAlertsEnabled}
                  onChange={(e) => handleChange('emailAlertsEnabled', e.target.checked)}
                  className="rounded border-border-default bg-bg-surface text-[#4F7CFF] focus:ring-0"
                />
                <span>Email alerts on High Severity bottlenecks</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsAlertsEnabled}
                  onChange={(e) => handleChange('smsAlertsEnabled', e.target.checked)}
                  className="rounded border-border-default bg-bg-surface text-[#4F7CFF] focus:ring-0"
                />
                <span>SMS alerts to active driver dispatchers</span>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom save button bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#4F7CFF] hover:bg-[#6E92FF] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-[#4F7CFF]/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save size={16} />
            {saving ? 'Saving System Configuration…' : 'Save System Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
