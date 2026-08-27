import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, TrendingDown, Lock, Mail } from 'lucide-react';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { BrandLogo } from '../components/common/BrandLogo';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from?.pathname || '/';

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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B0D]">

      {/* ── LEFT PANEL: Hero photography + animated moving fleet ── */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet logistics distribution center at dusk"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.84] contrast-[1.10] animate-cinematic-crane"
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

        {/* Content over image */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          {/* Brand Logo */}
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          {/* Headline */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
                Stop losing margins<br />
                <span className="text-[#4F7CFF]">at every loading dock.</span>
              </h1>
              <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
                Real-time fleet operational intelligence that turns dwell and turnaround bottlenecks into cost-saving decisions.
              </p>
            </div>

            {/* Floating metric cards with clean sentence case */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { icon: TrendingDown, label: 'Average excess dwell cut', value: '2h 14m', color: '#22C55E' },
                { icon: Zap,          label: 'Bottleneck response',      value: '4× faster', color: '#4F7CFF' },
                { icon: ShieldCheck,  label: 'Geofence accuracy',        value: '99.4%',  color: '#F5A524' },
                { icon: TrendingDown, label: 'Weekly cost recovered',    value: 'KES 84K', color: '#F0464C' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-4"
                >
                  <Icon size={14} style={{ color }} className="mb-2" />
                  <div className="font-['IBM_Plex_Mono'] text-lg font-bold text-white">{value}</div>
                  <div className="mt-0.5 text-xs text-white/60 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">
            Trusted by commercial fleet operators across East Africa
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign in form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#F4F5F7] tracking-tight">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">
              Enter your credentials to access your fleet operations dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-[#F0464C]/25 bg-[#F0464C]/10 px-4 py-3 text-xs text-[#F0464C]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                Work email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operations@siginon.com"
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 pl-10 text-sm text-[#F4F5F7] placeholder:text-[#4B5563] focus:border-[#4F7CFF]/60 focus:bg-white/[0.06] focus:outline-none transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#9CA3AF]">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#4F7CFF] hover:text-[#6E92FF] hover:underline transition-colors cursor-pointer"
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
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 pl-10 pr-11 text-sm text-[#F4F5F7] placeholder:text-[#4B5563] focus:border-[#4F7CFF]/60 focus:bg-white/[0.06] focus:outline-none transition-colors"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
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

          <p className="mt-8 text-center text-sm text-[#6B7280]">
            Don't have an account yet?{' '}
            <Link to="/signup" className="font-semibold text-[#4F7CFF] hover:text-[#6E92FF] hover:underline transition-colors">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
