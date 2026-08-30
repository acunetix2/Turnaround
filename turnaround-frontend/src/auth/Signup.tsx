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

  const inputCls = 'w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-[#F4F5F7] placeholder:text-[#4B5563] focus:border-[#4F7CFF]/60 focus:bg-white/[0.06] focus:outline-none transition-colors';
  const labelCls = 'block text-xs font-medium text-[#9CA3AF] mb-1.5';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B0D]">

      {/* ── LEFT: info panel with photography and animated background ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Fleet logistics distribution centre"
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.84] contrast-[1.10] animate-cinematic-crane"
        />
        {/* Gradients & Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0B0D]/90 via-[#0A0B0D]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0D]/85 via-transparent to-[#0A0B0D]/20" />
        <div className="absolute inset-0 cinematic-vignette opacity-70" />

        {/* Subtle Anamorphic Optical Flare Sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-[45%] h-full bg-gradient-to-r from-transparent via-[#4F7CFF]/10 to-transparent animate-anamorphic-flare blur-xl" />
        </div>

        {/* Live animated fleet background */}
        <AnimatedFleetBackground />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white leading-snug">
                Fleet intelligence<br />
                <span className="text-[#4F7CFF]">built for East Africa.</span>
              </h1>
              <p className="mt-4 text-sm text-white/65 leading-relaxed max-w-xs">
                Register your organisation to start turning dwell tracking into measurable cost savings.
              </p>
            </div>

            <div className="space-y-4">
              {PERKS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F7CFF]/15 border border-[#4F7CFF]/20">
                    <Icon size={13} className="text-[#6E92FF]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/30">© 2026 Turnaround Logistics Systems</p>
        </div>
      </div>

      {/* ── RIGHT: registration form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[440px]">

          {done ? (
            /* Success state */
            <div className="text-center space-y-5">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[#22C55E]/15 border border-[#22C55E]/25">
                <CheckCircle size={28} className="text-[#22C55E]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#F4F5F7]">Registration successful</h2>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  Your fleet account is ready. Sign in to configure your vehicles and geofences.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] transition-all cursor-pointer"
              >
                Sign in to your dashboard <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2].map(s => (
                  <React.Fragment key={s}>
                    <div className={[
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                      step >= s
                        ? 'bg-[#4F7CFF] text-white'
                        : 'bg-white/[0.07] text-[#6B7280]',
                    ].join(' ')}>
                      {step > s ? <CheckCircle size={14} /> : s}
                    </div>
                    {s < 2 && (
                      <div className={['h-px flex-1 transition-all', step > s ? 'bg-[#4F7CFF]' : 'bg-white/[0.08]'].join(' ')} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#F4F5F7]">
                  {step === 1 ? 'Register your company' : 'Set your password'}
                </h2>
                <p className="mt-1.5 text-sm text-[#9CA3AF]">
                  {step === 1 ? 'Create an organisation profile for your operations team.' : 'Choose secure credentials for your account.'}
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-[#F0464C]/25 bg-[#F0464C]/10 px-4 py-3 text-xs text-[#F0464C]">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleStep1} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>First name</label>
                      <input
                        type="text"
                        required
                        placeholder="James"
                        value={form.firstName}
                        onChange={set('firstName')}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Last name</label>
                      <input
                        type="text"
                        required
                        placeholder="Mwangi"
                        value={form.lastName}
                        onChange={set('lastName')}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Work email</label>
                    <input
                      type="email"
                      required
                      placeholder="j.mwangi@siginon.com"
                      value={form.email}
                      onChange={set('email')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Company name</label>
                    <input
                      type="text"
                      required
                      placeholder="Siginon Global Logistics Ltd"
                      value={form.company}
                      onChange={set('company')}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Select
                        label="Fleet size"
                        value={form.fleetSize}
                        onChange={(val) => setForm(prev => ({ ...prev, fleetSize: val }))}
                        options={FLEET_SIZE_OPTIONS}
                      />
                    </div>
                    <div>
                      <Select
                        label="Your role"
                        value={form.role}
                        onChange={(val) => setForm(prev => ({ ...prev, role: val }))}
                        options={ROLE_OPTIONS}
                      />
                    </div>
                  </div>
                  <button type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] transition-all cursor-pointer">
                    Continue <ArrowRight size={15} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStep2} className="space-y-4">
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set('password')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm password</label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat your password"
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      className={inputCls}
                    />
                  </div>

                  {/* Password strength */}
                  {form.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[8, 12, 16].map(n => (
                          <div key={n} className={['h-1 flex-1 rounded-full transition-all', form.password.length >= n ? 'bg-[#4F7CFF]' : 'bg-white/[0.08]'].join(' ')} />
                        ))}
                      </div>
                      <p className="text-[11px] text-[#6B7280]">
                        {form.password.length < 8 ? 'Too short' : form.password.length < 12 ? 'Acceptable' : form.password.length < 16 ? 'Strong' : 'Very strong'}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    By registering you agree to our{' '}
                    <a href="#" className="text-[#4F7CFF] hover:text-[#6E92FF]">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-[#4F7CFF] hover:text-[#6E92FF]">Privacy Policy</a>.
                  </p>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl border border-white/[0.10] py-3 text-sm font-semibold text-[#9CA3AF] hover:border-white/[0.18] hover:text-[#F4F5F7] transition-all cursor-pointer">
                      Back
                    </button>
                    <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] disabled:opacity-50 transition-all cursor-pointer">
                      {submitting ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                      ) : <>Register account <ArrowRight size={15} /></>}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-[#6B7280]">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-[#4F7CFF] hover:text-[#6E92FF] hover:underline transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
