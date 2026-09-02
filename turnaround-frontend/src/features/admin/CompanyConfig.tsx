import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Globe, Phone, Mail, MapPin, Save,
  Shield, CreditCard, Settings2, AlertTriangle,
  ChevronDown, Upload, Route, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCompany } from '../../lib/CompanyContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { PageTabs } from '../../components/ui/PageTabs';
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
  const [activeTab, setActiveTab] = useState<'general' | 'operations' | 'billing' | 'security'>('general');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CC>>({});

  // Populate form from loaded config
  useEffect(() => {
    if (config) setForm({ ...config });
  }, [config]);

  const set = (k: keyof CC, v: any) => setForm(f => ({ ...f, [k]: v }));

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

  if (isLoading || !config) {
    return (
      <div className="space-y-4 max-w-4xl animate-pulse">
        <div className="h-10 bg-bg-surface-raised rounded-xl w-64" />
        <div className="h-64 bg-bg-surface-raised rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] flex items-center justify-center shadow-md">
            <Building2 size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Company Configuration</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Changes here update the app in real-time — company name, currency, SLA thresholds and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#250C77]/10 border border-[#250C77]/20 text-[10px] font-bold text-[#250C77]">
            <Shield size={11} /> Admin Only
          </span>
          <Button variant="ghost" size="small" icon={<RefreshCw size={12} />} onClick={refresh}>Refresh</Button>
          <Button variant="primary" size="small" icon={<Save size={12} />} loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Current state banner */}
      <div className="rounded-xl border border-border-default bg-bg-surface-raised/50 px-4 py-2.5 flex items-center gap-3 text-xs text-text-secondary">
        <Building2 size={13} className="text-[#250C77] shrink-0" />
        <span>Current company: <strong className="text-text-primary">{config.name}</strong></span>
        <span className="mx-2 text-text-tertiary">·</span>
        <span>Currency: <strong className="text-text-primary">{config.currency}</strong></span>
        <span className="mx-2 text-text-tertiary">·</span>
        <span>SLA breach at: <strong className="text-[#ED642B]">{config.sla_breach_threshold_minutes}m</strong></span>
      </div>

      {/* Tabs */}
      <PageTabs
        tabs={[
          { id: 'general',    label: 'Company Details',  icon: <Building2 size={13} /> },
          { id: 'operations', label: 'Operations',       icon: <Settings2 size={13} /> },
          { id: 'billing',    label: 'Billing & Plan',   icon: <CreditCard size={13} /> },
          { id: 'security',   label: 'Security',         icon: <Shield size={13} /> },
        ]}
        active={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-sm space-y-8">

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
                <div>
                  <Field label="Logo URL" hint="Paste a direct image URL (PNG/SVG)">
                    <input className={inputCls} value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
                  </Field>
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
                  <div className="relative">
                    <select value={form.currency || 'KES'} onChange={e => set('currency', e.target.value)}
                      className={`${inputCls} appearance-none pr-8`}>
                      <option value="KES">KES — Kenyan Shilling</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="UGX">UGX — Ugandan Shilling</option>
                      <option value="TZS">TZS — Tanzanian Shilling</option>
                      <option value="RWF">RWF — Rwandan Franc</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  </div>
                </Field>
                <Field label="Timezone" hint="Used for all date/time displays">
                  <div className="relative">
                    <select value={form.timezone || 'Africa/Nairobi'} onChange={e => set('timezone', e.target.value)}
                      className={`${inputCls} appearance-none pr-8`}>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT UTC+3)</option>
                      <option value="Africa/Kampala">Africa/Kampala (EAT UTC+3)</option>
                      <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT UTC+3)</option>
                      <option value="Africa/Kigali">Africa/Kigali (CAT UTC+2)</option>
                      <option value="UTC">UTC</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  </div>
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
                  <div className="relative">
                    <Route size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <select value={form.default_corridor || ''} onChange={e => set('default_corridor', e.target.value)}
                      className={`${inputCls} pl-8 appearance-none pr-8`}>
                      <option value="">— Select corridor —</option>
                      <option>Northern Corridor (Mombasa - Nairobi)</option>
                      <option>Great Lakes Link (Nairobi - Malaba - Kampala)</option>
                      <option>Tanzania Link (Nairobi - Namanga - Arusha)</option>
                      <option>Western Kenya Spur (Nakuru - Kisumu)</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  </div>
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

        {/* ── BILLING ── */}
        {activeTab === 'billing' && (
          <Section title="Subscription & Billing">
            <div className="rounded-xl border border-[#250C77]/30 bg-[#250C77]/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">Turnaround Pro</p>
                  <p className="text-xs text-text-secondary mt-0.5">Full fleet intelligence platform</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Active</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#250C77]/15">
                {[{ label: 'Fleet Units', value: 'Unlimited' }, { label: 'Corridors', value: 'All EAC' }, { label: 'Data Retention', value: '24 months' }].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border-default bg-bg-surface-raised/40">
              <CreditCard size={16} className="text-text-tertiary shrink-0" />
              <p className="text-xs text-text-secondary">Contact <strong className="text-text-primary">support@turnaround.africa</strong> to update payment details or change your plan.</p>
            </div>
          </Section>
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
    </div>
  );
};
