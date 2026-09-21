import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { BrandLogo } from '../components/common/BrandLogo';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { useTheme } from '../lib/ThemeContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams]);
  const accessToken = useMemo(() => searchParams.get('access_token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token') || '', [searchParams]);
  const refreshToken = useMemo(() => searchParams.get('refresh_token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('refresh_token') || '', [searchParams]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const type = params.get('type');

    if (!tokenHash && (!accessToken || !refreshToken || type !== 'recovery')) {
      setError('This password reset link is missing a valid token. Please request a new one.');
    }
  }, [tokenHash, accessToken, refreshToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessTokenFromHash = searchParams.get('access_token') || params.get('access_token') || accessToken;
    const refreshTokenFromHash = searchParams.get('refresh_token') || params.get('refresh_token') || refreshToken;

    const currentTokenHash = tokenHash || '';

    if (!currentTokenHash && (!accessTokenFromHash || !refreshTokenFromHash)) {
      setError('This password reset link is missing a valid token. Please request a new one.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      if (accessTokenFromHash && refreshTokenFromHash) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessTokenFromHash,
          refresh_token: refreshTokenFromHash,
        });

        if (sessionError) throw sessionError;

        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) throw updateError;
      } else {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token_hash: currentTokenHash, password }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.detail || 'This reset link is invalid or has expired.');
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-[#F4F5F7] ${theme === 'dark' ? 'bg-[#0A051B]' : 'bg-[#F5F3FB] text-[#250C77]'}`}>
      <div className="relative hidden lg:flex lg:w-[50%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet yard"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.80] contrast-[1.15] animate-cinematic-crane"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A051B]/95 via-[#180B4A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A051B]/90 via-transparent to-[#0A051B]/30" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-[45%] h-full bg-gradient-to-r from-transparent via-[#ED642B]/10 to-transparent animate-anamorphic-flare blur-xl" />
        </div>
        <AnimatedFleetBackground />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Secure your account.<br />
              <span className="text-[#ED642B]">Reset your password.</span>
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">
              Create a new password to keep your fleet data, access controls, and dispatch workflows protected.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck size={14} className="text-status-good" />
            <span>Protected by secure session validation and encrypted credentials</span>
          </div>
        </div>
      </div>

      <div className={`relative flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto ${theme === 'dark' ? 'bg-[#0E0724]/90' : 'bg-white/90'}`}>
        <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="absolute right-6 top-6 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 hover:text-white cursor-pointer">{theme === 'dark' ? '☾' : '☀'}</button>
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[400px]">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-status-good/15 border border-status-good/30 text-status-good">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Password updated</h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your password has been reset successfully. You can now sign in with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
              >
                Continue to login <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Create new password</h2>
                <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                  Choose a secure password for your Turnaround account.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a new password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                    />
                    <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                    />
                    <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-[11px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || (!tokenHash && !accessToken && !refreshToken)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Updating password…' : 'Update password'}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-text-tertiary">
                Need help?{' '}
                <Link to="/login" className="font-bold text-[#ED642B] hover:underline transition-colors">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
