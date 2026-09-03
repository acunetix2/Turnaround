import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useToast } from '../components/ui/Toast';
import { Eye, EyeOff, ArrowRight, ShieldCheck, TrendingUp, Lock, Mail, Moon, Sun, Truck } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../lib/ThemeContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [fieldErrors, setFieldErrors]   = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const nextErrors: typeof fieldErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required.';
    if (!password) nextErrors.password = 'Password is required.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      await login(email, password);
      sessionStorage.setItem('turnaround:show-welcome-on-login', '1');
      toast({ variant: 'success', title: 'Login successful', message: 'Welcome back to your Turnaround workspace.' });
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      const message = err?.message || '';
      setError(message.includes('fetch') || message.includes('NetworkError') || message.includes('getaddrinfo')
        ? 'Unable to connect to the authentication service. Check your internet connection and Supabase URL, then try again.'
        : message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-[#08051C] text-[#F4F5F7]">

      {/* ── LEFT PANEL: Hero photography + animated moving fleet ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden border-r border-white/10">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet logistics distribution center at dusk"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.80] contrast-[1.15] animate-cinematic-crane"
        />
        {/* Gradients & Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A051B]/95 via-[#180B4A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A051B]/90 via-transparent to-[#0A051B]/30" />

        {/* Content over image */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-11">
          {/* Brand Logo */}
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          {/* Headline */}
          <div className="space-y-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#ED642B]/30 bg-[#250C77]/60 px-3 py-1.5 text-[11px] font-semibold text-white/90"><span className="h-1.5 w-1.5 rounded-full bg-[#ED642B]" /> Logistics. Optimized.</span>
              <h1 className="mt-5 text-4xl xl:text-[42px] font-extrabold text-white leading-tight tracking-tight">
                Delivering Excellence.<br />
                <span className="text-[#ED642B]">Connecting East Africa.</span>
              </h1>
              <p className="mt-4 text-sm xl:text-base text-white/75 max-w-md leading-relaxed">
                Real-time visibility, intelligent analytics, and seamless operations across every corridor.
              </p>
            </div>

            {/* Product capabilities */}
            <div className="space-y-3 max-w-sm">
              {[
                { icon: Truck, title: 'Real-time Fleet Tracking', detail: 'Monitor fleet across all corridors' },
                { icon: TrendingUp, title: 'Intelligent Analytics', detail: 'Data-driven insights for better decisions' },
                { icon: ShieldCheck, title: 'Secure & Reliable', detail: 'Enterprise-grade security for your data' },
              ].map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#180B4A]/55 p-3 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#250C77] text-[#C084FC]"><Icon size={18} /></div>
                  <div><p className="text-xs font-semibold text-white">{title}</p><p className="mt-0.5 text-[11px] text-white/60">{detail}</p></div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50">
            © 2025 Turnaround Logistics. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign in form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10 overflow-y-auto bg-[#08051C]">
        <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="absolute right-6 top-6 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 hover:text-white cursor-pointer">{theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}</button>
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[458px] rounded-xl border border-white/10 bg-[#0B0928]/80 p-6 shadow-2xl backdrop-blur-md sm:p-7">
          <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#250C77] ring-8 ring-[#250C77]/20"><Lock size={23} className="text-white" /></div><h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome back</h2><p className="mt-1.5 text-sm text-text-secondary">Sign in to your Turnaround account</p></div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operations@siginon.com"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 pl-10 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>
              {fieldErrors.email && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white">Password</label>
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
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 pl-10 pr-11 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
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
              {fieldErrors.password && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.password}</p>}
            </div>

            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#ED642B]" /> Remember me <span className="ml-auto">Keep me signed in</span></label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 focus:outline-none focus:ring-2 focus:ring-[#ED642B]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Logging you in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] text-text-tertiary"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white hover:bg-white/[0.07] cursor-pointer"><span className="font-bold text-[#4285F4]">G</span> Sign in with Google</button>
          <p className="mt-6 text-center text-sm text-text-tertiary">Don't have an account? <Link to="/signup" className="font-bold text-[#ED642B] hover:text-[#D4521D] hover:underline transition-colors">Contact your administrator</Link>
          </p>
          <p className="mt-5 text-center text-[11px] text-text-tertiary">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
