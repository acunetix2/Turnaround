import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, BarChart3 } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from './AuthProvider';
import type { UserRole } from '../lib/api/types';

const PERKS = [
  { icon: BarChart3, title: 'Real-time dwell intelligence', desc: 'Know exactly where time and money are lost across every location.' },
  { icon: Users,     title: 'Multi-role access control',  desc: 'Fleet managers, dispatchers, and analysts — each with the right view.' },
  { icon: Building2, title: 'Multi-location fleet ops',   desc: 'Track performance across warehouses, ports, border crossings, and depots.' },
];

const FLEET_SIZE_OPTIONS = [
  { value: '1-10',    label: '1 – 10 trucks',    description: 'Small commercial fleet' },
  { value: '11-50',   label: '11 – 50 trucks',   description: 'Mid-sized logistics operations' },
  { value: '51-200',  label: '51 – 200 trucks',  description: 'Enterprise regional carrier' },
  { value: '200+',    label: '200+ trucks',      description: 'National / cross-border operator' },
];

const ROLE_OPTIONS = [
  { value: 'fleet_manager', label: 'Fleet Manager', description: 'Manage fleet operations, vehicles & routes' },
  { value: 'admin',         label: 'Administrator', description: 'Full organisation and system administration' },
  { value: 'dispatcher',   label: 'Dispatcher',    description: 'Real-time route assignment & live monitoring' },
  { value: 'analyst',      label: 'Data Analyst',  description: 'Performance benchmarking & reporting' },
];

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    fleetSize: '11-50',
    role: 'fleet_manager',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.company) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
        name: `${form.firstName} ${form.lastName}`.trim(),
        company: form.company,
        role: form.role as UserRole,
        fleetSize: form.fleetSize
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign up. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors';
  const labelCls = 'block text-xs font-semibold text-text-secondary mb-1.5';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A051B] text-[#F4F5F7]">

      {/* ── LEFT: info panel with photography and animated background ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Fleet logistics distribution centre"
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.80] contrast-[1.15] animate-cinematic-crane"
        />
        {/* Gradients & Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A051B]/95 via-[#180B4A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A051B]/90 via-transparent to-[#0A051B]/30" />

        {/* Subtle Anamorphic Optical Flare Sweep in Express Orange */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-[45%] h-full bg-gradient-to-r from-transparent via-[#ED642B]/10 to-transparent animate-anamorphic-flare blur-xl" />
        </div>

        {/* Live animated fleet background */}
        <AnimatedFleetBackground />

        {/* Content over image */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          {/* Brand Logo */}
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          {/* Value Prop */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
                Turnaround intelligence<br />
                <span className="text-[#ED642B]">built for East Africa.</span>
              </h1>
              <p className="mt-3 text-sm text-white/75 leading-relaxed">
                Connect GPS signals, monitor terminal geofences, and eliminate idle fleet demurrage.
              </p>
            </div>

            <div className="space-y-3">
              {PERKS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-white/15 bg-[#180B4A]/60 backdrop-blur-md p-3.5 shadow-md">
                  <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#ED642B]/20 border border-[#ED642B]/30">
                    <Icon size={14} className="text-[#ED642B]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="text-[11px] text-white/65 mt-0.5 leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50">
            No credit card required · Instant account activation
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 overflow-y-auto bg-[#0E0724]/90">
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-6">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[440px]">

          {done ? (
            /* Success confirmation state */
            <div className="rounded-2xl border border-status-good/30 bg-status-good/10 p-8 text-center space-y-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-status-good/20 text-status-good">
                <CheckCircle size={28} />
              </div>
              <h2 className="text-xl font-extrabold text-white">Account Created Successfully</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Welcome to Turnaround. Your organisation profile has been created with demo vehicles and corridor locations ready to explore.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2].map((s) => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={[
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                          step === s
                            ? 'bg-[#ED642B] text-white'
                            : step > s
                            ? 'bg-status-good text-white'
                            : 'bg-white/10 text-text-tertiary',
                        ].join(' ')}
                      >
                        {step > s ? '✓' : s}
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {s === 1 ? 'Organisation' : 'Credentials'}
                      </span>
                    </div>
                    {s < 2 && (
                      <div className={['h-px flex-1 transition-all', step > s ? 'bg-[#ED642B]' : 'bg-white/10'].join(' ')} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {step === 1 ? 'Tell us about your fleet' : 'Set your account password'}
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {step === 1
                    ? 'We will tailor your metrics and corridor baselines to your operation.'
                    : `Account email: ${form.email}`
                  }
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]">
                  {error}
                </div>
              )}

              {/* ── STEP 1: Personal & Fleet Info ── */}
              {step === 1 && (
                <form onSubmit={handleStep1} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>First name</label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={set('firstName')}
                        placeholder="James"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Last name</label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={set('lastName')}
                        placeholder="Mwangi"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Work email address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                      placeholder="james.mwangi@haulage.co.ke"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Company or Organisation name</label>
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={set('company')}
                      placeholder="East Africa Haulage Ltd"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Fleet size</label>
                      <Select
                        value={form.fleetSize}
                        onChange={v => setForm(p => ({ ...p, fleetSize: v }))}
                        options={FLEET_SIZE_OPTIONS}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Your primary role</label>
                      <Select
                        value={form.role}
                        onChange={v => setForm(p => ({ ...p, role: v }))}
                        options={ROLE_OPTIONS}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>
                </form>
              )}

              {/* ── STEP 2: Password & Submit ── */}
              {step === 2 && (
                <form onSubmit={handleStep2} className="space-y-4">
                  <div>
                    <label className={labelCls}>Create a secure password</label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={set('password')}
                      placeholder="At least 8 characters"
                      className={inputCls}
                    />
                    {/* Strength indicator */}
                    <div className="mt-2 flex gap-1">
                      {[8, 12, 16].map((n) => (
                        <div
                          key={n}
                          className={[
                            'h-1 flex-1 rounded-full transition-all',
                            form.password.length >= n ? 'bg-[#ED642B]' : 'bg-white/10',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Confirm password</label>
                    <input
                      type="password"
                      required
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      placeholder="Repeat your password"
                      className={inputCls}
                    />
                  </div>

                  <p className="text-[11px] text-text-tertiary">
                    By registering, you agree to Turnaround's{' '}
                    <a href="#" className="text-[#ED642B] hover:underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-[#ED642B] hover:underline">Privacy Policy</a>.
                  </p>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {submitting ? 'Creating account…' : 'Complete Registration'}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-6 text-center text-xs text-text-tertiary">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-[#ED642B] hover:underline transition-colors">
                  Sign in instead
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
