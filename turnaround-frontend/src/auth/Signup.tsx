import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, BarChart3, Moon, Sun } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from './AuthProvider';
import { useTheme } from '../lib/ThemeContext';

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

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    fleetSize: '11-50',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'firstName' | 'lastName' | 'email' | 'company' | 'password' | 'confirmPassword', string>>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['firstName', 'lastName', 'email', 'company'] as const;
    const nextErrors = Object.fromEntries(requiredFields.filter(field => !form[field].trim()).map(field => [field, 'This field is required.']));
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setError('');
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!form.password) nextErrors.password = 'Password is required.';
    else if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await signup({
        email: form.email,
        password: form.password,
        name: `${form.firstName} ${form.lastName}`.trim(),
        company: form.company,
        fleetSize: form.fleetSize
      });
      setRequiresEmailConfirmation(Boolean(result.requires_email_confirmation));
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
    <div className={`flex min-h-screen w-screen overflow-x-hidden text-[#F4F5F7] ${theme === 'dark' ? 'bg-[#0A051B]' : 'bg-[#F5F3FB] text-[#250C77]'}`}>

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
      <div className={`flex min-h-screen flex-1 flex-col items-center justify-start px-6 py-8 overflow-y-auto lg:justify-center lg:py-10 ${theme === 'dark' ? 'bg-[#0E0724]/90' : 'bg-white/90'}`}>
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-6">
          <BrandLogo size={34} showText={true} />
        </Link>

        <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="absolute right-6 top-6 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 hover:text-white cursor-pointer">{theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}</button>

        <div className={`w-full max-w-[440px] rounded-2xl border p-6 shadow-2xl backdrop-blur-md sm:p-8 ${theme === 'dark' ? 'border-white/10 bg-[#0B0928]/80' : 'border-[#250C77]/15 bg-white/90'}`}>
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#250C77] ring-8 ring-[#250C77]/20"><BrandLogo size={48} showText={false} /></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ED642B]">Create your workspace</p>
          </div>

          {done ? (
            /* Success confirmation state */
            <div className="rounded-2xl border border-status-good/30 bg-status-good/10 p-8 text-center space-y-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-status-good/20 text-status-good">
                <CheckCircle size={28} />
              </div>
              <h2 className="text-xl font-extrabold text-white">{requiresEmailConfirmation ? 'Confirm your email' : 'Account Created Successfully'}</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {requiresEmailConfirmation
                  ? `We sent a confirmation link to ${form.email}. Confirm your email, then return here to sign in.`
                  : 'Welcome to Turnaround. Your organisation profile is ready to explore.'}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
              >
                {requiresEmailConfirmation ? 'Back to Sign In' : 'Continue to Sign In'}
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
                <form onSubmit={handleStep1} noValidate className="space-y-3.5">
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
                      {fieldErrors.firstName && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.firstName}</p>}
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
                      {fieldErrors.lastName && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Work email address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                        placeholder="james.mwangi@turnaround.com"
                      className={inputCls}
                    />
                    {fieldErrors.email && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.email}</p>}
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
                    {fieldErrors.company && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.company}</p>}
                  </div>

                  <div>
                    <div>
                      <label className={labelCls}>Fleet size</label>
                      <Select
                        value={form.fleetSize}
                        onChange={v => setForm(p => ({ ...p, fleetSize: v }))}
                        options={FLEET_SIZE_OPTIONS}
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
                <form onSubmit={handleStep2} noValidate className="space-y-4">
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
                    {fieldErrors.password && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.password}</p>}
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
                    {fieldErrors.confirmPassword && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.confirmPassword}</p>}
                  </div>

                  <p className="text-[11px] text-text-tertiary">
                    By registering, you agree to Turnaround's{' '}
                    <Link to="/terms" className="text-[#ED642B] hover:underline">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="text-[#ED642B] hover:underline">Privacy Policy</Link>.
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
