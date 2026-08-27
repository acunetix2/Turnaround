import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { BrandLogo } from '../components/common/BrandLogo';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your work email address.');
      return;
    }
    setError('');
    setSubmitting(true);

    // Simulate password recovery dispatch
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B0D]">

      {/* ── LEFT PANEL: Hero photography + animated moving fleet ── */}
      <div className="relative hidden lg:flex lg:w-[50%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet yard"
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

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
              Secure account recovery<br />
              <span className="text-[#4F7CFF]">for fleet operations.</span>
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              We protect your dispatch data with enterprise-grade authorization and encrypted session tokens.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Encrypted password resets · Zero unauthorized credential exposure</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Recovery form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[400px]">
          {sent ? (
            <div className="space-y-6 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Check your email</h2>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  We've sent password reset instructions to <span className="text-white font-medium">{email}</span>.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] transition-all cursor-pointer"
                >
                  <ArrowLeft size={15} /> Back to sign in
                </Link>

                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                >
                  Didn't receive instructions? Try another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#F4F5F7] tracking-tight">Reset your password</h2>
                <p className="mt-1.5 text-sm text-[#9CA3AF] leading-relaxed">
                  Enter your registered work email and we'll send you instructions to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-[#F0464C]/25 bg-[#F0464C]/10 px-4 py-3 text-xs text-[#F0464C]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Work email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dispatcher@bollore-logistics.com"
                      className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 pl-10 text-sm text-[#F4F5F7] placeholder:text-[#4B5563] focus:border-[#4F7CFF]/60 focus:bg-white/[0.06] focus:outline-none transition-colors"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#6E92FF] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                      Sending reset link…
                    </>
                  ) : (
                    <>
                      Send reset instructions <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[#6B7280]">
                Remembered your password?{' '}
                <Link to="/login" className="font-semibold text-[#4F7CFF] hover:text-[#6E92FF] hover:underline transition-colors">
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
