import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Eye, EyeOff, ArrowRight, ShieldCheck, TrendingDown, Lock, Mail, Clock } from 'lucide-react';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { BrandLogo } from '../components/common/BrandLogo';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A051B] text-[#F4F5F7]">

      {/* ── LEFT PANEL: Hero photography + animated moving fleet ── */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet logistics distribution center at dusk"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.80] contrast-[1.15] animate-cinematic-crane"
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

          {/* Headline */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
                Stop losing margins<br />
                <span className="text-[#ED642B]">at every loading dock.</span>
              </h1>
              <p className="mt-4 text-base text-white/75 max-w-md leading-relaxed">
                Real-time fleet operational intelligence that turns dwell and turnaround bottlenecks into cost-saving decisions.
              </p>
            </div>

            {/* Floating metric cards */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { icon: TrendingDown, label: 'Average excess dwell cut', value: '2h 14m', color: '#10B981' },
                { icon: Clock,        label: 'Bottleneck response',      value: '4× faster', color: '#ED642B' },
                { icon: ShieldCheck,  label: 'Geofence accuracy',        value: '99.4%',   color: '#ED642B' },
                { icon: TrendingDown, label: 'Weekly cost recovered',    value: 'KES 84K',  color: '#10B981' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/15 bg-[#180B4A]/60 backdrop-blur-md p-4 shadow-lg"
                >
                  <Icon size={15} style={{ color }} className="mb-2" />
                  <div className="font-numeric text-lg font-extrabold text-white">{value}</div>
                  <div className="mt-0.5 text-xs text-white/70 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50">
            Trusted by commercial fleet operators across East Africa
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign in form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto bg-[#0E0724]/90">
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Enter your credentials to access your fleet operations dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Work email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operations@siginon.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-[#ED642B] hover:text-[#D4521D] hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 pr-11 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit in FedEx Express Orange */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 focus:outline-none focus:ring-2 focus:ring-[#ED642B]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-tertiary">
            Don't have an account yet?{' '}
            <Link to="/signup" className="font-bold text-[#ED642B] hover:text-[#D4521D] hover:underline transition-colors">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
