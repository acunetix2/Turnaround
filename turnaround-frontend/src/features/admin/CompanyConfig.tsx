import React, { useState, useEffect } from 'react';
import {
  Building2, Globe, Phone, Mail, MapPin, Save,
  Shield, Settings2, AlertTriangle, Upload, Database, Activity,
  RefreshCw,
} from 'lucide-react';
import { useCompany } from '../../lib/CompanyContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { PageTabs } from '../../components/ui/PageTabs';
import { Select } from '../../components/ui/Select';
import { LoadingStatus } from '../../components/common/Loader';
import type { CompanyConfig as CC } from '../../lib/api/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const inputCls = "w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none";

const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({ label, required, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-text-primary">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-text-tertiary">{hint}</p>}
  </div>
);

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div className="border-b border-border-default pb-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">{title}</h3>
      {description && <p className="text-[11px] text-text-secondary mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }> = ({ checked, onChange, label, desc }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-bg-surface hover:bg-bg-surface-raised/40 transition-colors">
    <div>
      <p className="text-xs font-semibold text-text-primary">{label}</p>
      {desc && <p className="text-[10px] text-text-tertiary mt-0.5">{desc}</p>}
    </div>
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${checked ? 'bg-[#250C77]' : 'bg-bg-surface-raised border border-border-default'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────────

export const CompanyConfig: React.FC = () => {
  const { config, isLoading, update, refresh } = useCompany();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'operations' | 'workspace' | 'security'>('general');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CC>>({});

  // Populate form from loaded config
  useEffect(() => {
    if (config) setForm({ ...config });
  }, [config]);

  const set = (k: keyof CC, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleWelcomeMedia = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ variant: 'error', title: 'Unsupported welcome media', message: 'Choose an image, GIF, or video file.' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Welcome media is too large', message: 'Choose a file smaller than 8 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('welcome_media_url', String(reader.result));
    reader.readAsDataURL(file);
    set('welcome_media_type', file.type.startsWith('video/') ? 'video' : 'image');
  };

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: 'Unsupported logo', message: 'Choose a PNG, JPG, SVG, or WebP image.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Logo is too large', message: 'Choose an image smaller than 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('logo_url', String(reader.result));
    reader.readAsDataURL(file);
  };

  // Route already enforces admin-only via ProtectedRoute in routes.tsx

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(form);
      toast({ variant: 'success', title: 'Configuration Saved', message: 'Company settings updated successfully.' });
    } catch (e: any) {
      toast({ variant: 'error', title: 'Save Failed', message: e?.message || 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <LoadingStatus messages={['Loading company settings', 'Checking saved preferences', 'Almost there', 'Finalizing configuration']} centered />
        <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-bg-surface-raised rounded-xl w-64" />
        <div className="h-64 bg-bg-surface-raised rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-2xl rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
        <h2 className="text-sm font-bold text-text-primary">Company configuration unavailable</h2>
        <p className="mt-1 text-xs text-text-secondary">The backend did not respond. Check the connection and retry.</p>
        <Button variant="outline" size="small" icon={<RefreshCw size={12} />} onClick={refresh} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-[#250C77]/20 flex items-center justify-center shadow-md">
            <Settings2 size={20} className="text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Company Configuration</h1>
            <p className="text-xs text-text-secondary mt-0.5">Manage your company settings, branding, and system preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" icon={<RefreshCw size={12} />} onClick={refresh}>Refresh Data</Button>
          <Button variant="primary" size="small" icon={<Save size={12} />} loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <PageTabs
        tabs={[
          { id: 'general',    label: 'General Information',  icon: <Building2 size={13} /> },
          { id: 'operations', label: 'Operations Settings',  icon: <Settings2 size={13} /> },
          { id: 'workspace',  label: 'Workspace Preferences', icon: <Database size={13} /> },
          { id: 'security',   label: 'Security & Compliance', icon: <Shield size={13} /> },
        ]}
        active={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4 items-start">
      <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-7">

        {/* ── GENERAL ── */}
        {activeTab === 'general' && (
          <>
            <Section title="Organisation Identity" description="Core company information displayed across the platform.">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border-default bg-bg-surface-raised flex items-center justify-center shrink-0">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" className="h-full w-full object-contain rounded-xl" />
                    : <Building2 size={20} className="text-text-tertiary" />}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <Field label="Logo URL" hint="Paste a direct image URL or upload an image below.">
                    <input className={inputCls} value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
                  </Field>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border-default bg-bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary hover:border-[#ED642B] cursor-pointer transition-colors">
                    <Upload size={13} /> {form.logo_url?.startsWith('data:') ? 'Replace uploaded logo' : 'Upload logo image'}
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={e => handleLogoUpload(e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company Name" required>
                  <input className={inputCls} value={form.name || ''} onChange={e => set('name', e.target.value)} />
                </Field>
                <Field label="Registration Number">
                  <input className={inputCls} value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} />
                </Field>
                <Field label="Industry">
                  <input className={inputCls} value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder="e.g. Road Freight & Logistics" />
                </Field>
                <Field label="Website">
                  <div className="relative">
                    <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input className={`${inputCls} pl-8`} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://" />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Welcome motto" hint="Shown on the branded welcome screen after sign-in">
                  <input className={inputCls} value={form.welcome_motto || ''} onChange={e => set('welcome_motto', e.target.value)} placeholder="Moving every mile with confidence" />
                </Field>
                <Field label="Welcome media" hint="Upload an image, GIF, or video up to 8 MB">
                  <label className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border-default bg-bg-surface-raised px-3 py-2 text-xs text-text-secondary hover:border-[#ED642B] cursor-pointer transition-colors">
                    <Upload size={13} /> {form.welcome_media_url ? 'Replace welcome media' : 'Choose welcome media'}
                    <input type="file" accept="image/*,video/*" className="sr-only" onChange={e => handleWelcomeMedia(e.target.files?.[0])} />
                  </label>
                </Field>
              </div>
              {form.welcome_media_url && (
                <div className="relative h-64 overflow-hidden rounded-xl border border-border-default bg-bg-surface-raised sm:h-80">
                  {form.welcome_media_type === 'video'
                    ? <video src={form.welcome_media_url} className="h-full w-full object-cover" controls muted />
                    : <img src={form.welcome_media_url} alt="Welcome preview" className="h-full w-full object-cover" />}
                </div>
              )}

            </Section>

            <Section title="Contact & Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input className={`${inputCls} pl-8`} value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input className={`${inputCls} pl-8`} value={form.email || ''} onChange={e => set('email', e.target.value)} />
                  </div>
                </Field>
                <Field label="Country">
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input className={`${inputCls} pl-8`} value={form.country || ''} onChange={e => set('country', e.target.value)} />
                  </div>
                </Field>
                <Field label="City">
                  <input className={inputCls} value={form.city || ''} onChange={e => set('city', e.target.value)} />
                </Field>
                <Field label="Address">
                  <input className={inputCls} value={form.address || ''} onChange={e => set('address', e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Regional Settings" description="Currency and timezone affect all financial displays and timestamps across the app.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Currency" hint="Used in all cost and demurrage displays">
                  <Select
                    value={form.currency || 'KES'}
                    onValueChange={value => set('currency', value)}
                    options={[
                      { value: 'KES', label: 'KES — Kenyan Shilling' },
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'UGX', label: 'UGX — Ugandan Shilling' },
                      { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
                      { value: 'RWF', label: 'RWF — Rwandan Franc' },
                      { value: 'ZAR', label: 'ZAR — South African Rand' },
                      { value: 'NGN', label: 'NGN — Nigerian Naira' },
                      { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
                      { value: 'EGP', label: 'EGP — Egyptian Pound' },
                      { value: 'MAD', label: 'MAD — Moroccan Dirham' },
                      { value: 'INR', label: 'INR — Indian Rupee' },
                      { value: 'CNY', label: 'CNY — Chinese Yuan' },
                      { value: 'JPY', label: 'JPY — Japanese Yen' },
                      { value: 'AED', label: 'AED — UAE Dirham' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                      { value: 'CHF', label: 'CHF — Swiss Franc' },
                      { value: 'CAD', label: 'CAD — Canadian Dollar' },
                      { value: 'AUD', label: 'AUD — Australian Dollar' },
                      { value: 'NZD', label: 'NZD — New Zealand Dollar' },
                      { value: 'BRL', label: 'BRL — Brazilian Real' },
                      { value: 'MXN', label: 'MXN — Mexican Peso' },
                      { value: 'SGD', label: 'SGD — Singapore Dollar' },
                    ]}
                  />
                </Field>
                <Field label="Timezone" hint="Used for all date/time displays">
                  <Select
                    value={form.timezone || 'Africa/Nairobi'}
                    onValueChange={value => set('timezone', value)}
                    options={[
                      { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT UTC+3)' },
                      { value: 'Africa/Kampala', label: 'Africa/Kampala (EAT UTC+3)' },
                      { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar_es_Salaam (EAT UTC+3)' },
                      { value: 'Africa/Kigali', label: 'Africa/Kigali (CAT UTC+2)' },
                      { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT UTC+1)' },
                      { value: 'Africa/Cairo', label: 'Africa/Cairo (EET UTC+2)' },
                      { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST UTC+2)' },
                      { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                      { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
                      { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
                      { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK UTC+3)' },
                      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST UTC+4)' },
                      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST UTC+5:30)' },
                      { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST UTC+8)' },
                      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST UTC+9)' },
                      { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT UTC+8)' },
                      { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
                      { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
                      { value: 'America/New_York', label: 'America/New_York (ET)' },
                      { value: 'America/Chicago', label: 'America/Chicago (CT)' },
                      { value: 'America/Denver', label: 'America/Denver (MT)' },
                      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
                      { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT UTC-3)' },
                      { value: 'America/Mexico_City', label: 'America/Mexico_City (CT)' },
                      { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (HST UTC-10)' },
                      { value: 'UTC', label: 'UTC' },
                    ]}
                  />
                </Field>
              </div>
            </Section>
          </>
        )}

        {/* ── OPERATIONS ── */}
        {activeTab === 'operations' && (
          <>
            <Section title="Corridor & GPS" description="Default trade corridor and position refresh rate.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Default Trade Corridor" hint="Pre-fills when creating new trips">
                  <Select
                    value={form.default_corridor || ''}
                    onValueChange={value => set('default_corridor', value)}
                    options={[
                      { value: '', label: 'Select corridor' },
                      { value: 'Northern Corridor (Mombasa - Nairobi)', label: 'Northern Corridor (Mombasa - Nairobi)' },
                      { value: 'Great Lakes Link (Nairobi - Malaba - Kampala)', label: 'Great Lakes Link (Nairobi - Malaba - Kampala)' },
                      { value: 'Tanzania Link (Nairobi - Namanga - Arusha)', label: 'Tanzania Link (Nairobi - Namanga - Arusha)' },
                      { value: 'Western Kenya Spur (Nakuru - Kisumu)', label: 'Western Kenya Spur (Nakuru - Kisumu)' },
                    ]}
                  />
                </Field>
                <Field label="GPS Polling (seconds)" hint="How often vehicle positions refresh on the map">
                  <input type="number" className={inputCls} value={form.gps_polling_interval_seconds ?? 30}
                    onChange={e => set('gps_polling_interval_seconds', parseInt(e.target.value))} min={10} max={300} />
                </Field>
                <Field label="Geofence Buffer (metres)" hint="Tolerance radius around facility coordinates">
                  <input type="number" className={inputCls} value={form.geofence_buffer_meters ?? 100}
                    onChange={e => set('geofence_buffer_meters', parseInt(e.target.value))} min={25} max={500} />
                </Field>
              </div>
            </Section>

            <Section title="SLA Thresholds" description="When to fire delay warnings and breach alerts across the platform.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label={`Warning Threshold — ${form.sla_warning_threshold_minutes ?? 30} min`} hint="Amber alert fires at this excess dwell">
                  <input type="range" min={5} max={120} step={5}
                    value={form.sla_warning_threshold_minutes ?? 30}
                    onChange={e => set('sla_warning_threshold_minutes', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>5m</span><span>120m</span></div>
                </Field>
                <Field label={`Breach Threshold — ${form.sla_breach_threshold_minutes ?? 60} min`} hint="Red alert + demurrage trigger">
                  <input type="range" min={15} max={240} step={15}
                    value={form.sla_breach_threshold_minutes ?? 60}
                    onChange={e => set('sla_breach_threshold_minutes', parseInt(e.target.value))}
                    className="w-full accent-red-500 h-1.5 cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>15m</span><span>240m</span></div>
                </Field>
              </div>
            </Section>

            <Section title="Financial Rates" description="Base rates for all cost calculations and demurrage invoicing.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={`Hourly Operating Rate (${form.currency || 'KES'})`} hint="Base idle cost per truck per hour">
                  <input type="number" className={inputCls} value={form.hourly_operating_rate ?? 7500}
                    onChange={e => set('hourly_operating_rate', parseFloat(e.target.value))} step={500} min={100} />
                </Field>
                <Field label="Demurrage Multiplier" hint="Multiplied by hourly rate on SLA breach">
                  <input type="number" className={inputCls} value={form.demurrage_rate_multiplier ?? 1.5}
                    onChange={e => set('demurrage_rate_multiplier', parseFloat(e.target.value))} step={0.1} min={1} max={5} />
                </Field>
              </div>
            </Section>

            <Section title="Automations">
              <div className="rounded-xl border border-border-default overflow-hidden divide-y divide-border-default">
                <Toggle checked={form.auto_revoke_expired_passes ?? true} onChange={v => set('auto_revoke_expired_passes', v)}
                  label="Auto-revoke expired gate passes" desc="Automatically invalidate passes whose time window has passed" />
                <Toggle checked={form.notify_on_delay ?? true} onChange={v => set('notify_on_delay', v)}
                  label="Notify on SLA breach" desc="Send notifications when vehicles exceed the breach threshold" />
                <Toggle checked={form.notify_on_gate_pass ?? true} onChange={v => set('notify_on_gate_pass', v)}
                  label="Gate pass activity notifications" desc="Notify when passes are issued, used, or revoked" />
              </div>
            </Section>
          </>
        )}

        {/* ── WORKSPACE ── */}
        {activeTab === 'workspace' && (
          <>
            <Section title="Workspace Overview" description="Operational details for this company's Turnaround workspace.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Company ID', config.id],
                  ['Operating model', 'Single-company workspace'],
                  ['Primary currency', config.currency],
                  ['Workspace timezone', config.timezone],
                  ['Default corridor', config.default_corridor || 'Not configured'],
                  ['Notification status', config.notify_on_delay || config.notify_on_gate_pass ? 'Operational alerts enabled' : 'Operational alerts paused'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border-default bg-bg-surface-raised/40 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Enabled Operations" description="Capabilities available to your team in this deployment.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Fleet tracking', icon: <Activity size={16} /> },
                  { label: 'Dwell intelligence', icon: <Settings2 size={16} /> },
                  { label: 'Operational records', icon: <Database size={16} /> },
                ].map(({ label, icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-border-default p-4 text-xs font-semibold text-text-primary">
                    <span className="text-[#ED642B]">{icon}</span>{label}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── SECURITY ── */}
        {activeTab === 'security' && (
          <>
            <Section title="Access Control">
              <div className="rounded-xl border border-border-default overflow-hidden divide-y divide-border-default">
                {[
                  { label: 'Require MFA for Admins', desc: 'Enforce 2FA for admin accounts' },
                  { label: 'Session Timeout (8h)', desc: 'Auto log-out inactive sessions after 8 hours' },
                  { label: 'Audit Log', desc: 'Track all admin actions and config changes' },
                ].map(({ label, desc }) => (
                  <Toggle key={label} checked={true} onChange={() => {}} label={label} desc={desc} />
                ))}
              </div>
            </Section>
            <Section title="Data & Compliance">
              <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/8 flex items-start gap-3">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-text-primary">Data stored in EU West (Supabase)</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">Contact support to request data residency changes.</p>
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><div className="h-7 w-7 rounded-lg bg-[#250C77]/20 flex items-center justify-center"><Building2 size={14} className="text-[#8B5CF6]" /></div><div><h2 className="text-xs font-bold text-text-primary">Brand Preview</h2><p className="text-[10px] text-text-secondary">How your brand appears to users</p></div></div>
          <div className="relative h-40 overflow-hidden rounded-lg border border-border-default bg-[#16074A]">
            {form.welcome_media_url ? <img src={form.welcome_media_url} alt="Welcome preview" className="h-full w-full object-cover opacity-80" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#3D1BA8] via-[#250C77] to-[#16074A]" />}
            <div className="absolute inset-0 bg-[#0B0524]/35 p-4 flex flex-col justify-between"><div>{form.logo_url ? <img src={form.logo_url} alt="Company logo" className="h-7 max-w-28 object-contain object-left" /> : <p className="text-base font-bold text-white">{form.name || config.name}</p>}</div><div><p className="text-sm font-semibold text-white">Welcome to</p><p className="text-lg font-bold text-white">{form.name || config.name}</p><p className="text-[10px] text-white/75 mt-1">{form.welcome_motto || 'Delivering excellence across every mile.'}</p></div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2"><div className="rounded-lg border border-border-default bg-bg-surface-raised/50 p-2"><p className="text-[9px] text-text-tertiary">Primary Color</p><div className="flex items-center gap-2 mt-1"><span className="h-4 w-4 rounded bg-[#ED642B]" /><span className="text-[10px] text-text-secondary">#ED642B</span></div></div><div className="rounded-lg border border-border-default bg-bg-surface-raised/50 p-2"><p className="text-[9px] text-text-tertiary">Secondary Color</p><div className="flex items-center gap-2 mt-1"><span className="h-4 w-4 rounded bg-[#250C77]" /><span className="text-[10px] text-text-secondary">#250C77</span></div></div></div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm"><div className="flex items-center gap-2 mb-3"><Database size={14} className="text-[#8B5CF6]" /><h2 className="text-xs font-bold text-text-primary">System Information</h2></div><div className="space-y-2 text-[11px]"><div className="flex justify-between gap-3"><span className="text-text-tertiary">Company ID</span><span className="font-mono text-text-secondary truncate">{config.id}</span></div><div className="flex justify-between gap-3"><span className="text-text-tertiary">Subscription Plan</span><span className="text-text-primary">Enterprise</span></div><div className="flex justify-between gap-3"><span className="text-text-tertiary">Member Since</span><span className="text-text-primary">{new Date(config.created_at).toLocaleDateString()}</span></div><div className="flex justify-between gap-3"><span className="text-text-tertiary">Last Updated</span><span className="text-text-primary">{new Date().toLocaleDateString()}</span></div><div className="flex items-center justify-between pt-2 border-t border-border-default"><span className="text-text-tertiary">Storage Used</span><span className="text-status-good">Operational</span></div></div></div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-500" /><h2 className="text-xs font-bold text-red-500">Danger Zone</h2></div><p className="text-[10px] text-text-secondary mb-3">Irreversible and system-critical actions</p><div className="flex gap-2"><Button variant="outline" size="small" icon={<Database size={11} />}>Export Data</Button><Button variant="danger" size="small" icon={<RefreshCw size={11} />}>Reset Configuration</Button></div></div>
      </aside>
      </div>
    </div>
  );
};
