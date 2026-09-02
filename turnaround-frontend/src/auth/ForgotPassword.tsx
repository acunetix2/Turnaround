import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A051B] text-[#F4F5F7]">

      {/* ── LEFT PANEL: Hero photography + animated moving fleet ── */}
      <div className="relative hidden lg:flex lg:w-[50%] flex-col overflow-hidden">
        <img
          src="/hero-fleet.jpg"
          alt="Turnaround fleet yard"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.80] contrast-[1.15] animate-cinematic-crane"
        />
        {/* Gradients & Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A051B]/95 via-[#180B4A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A051B]/90 via-transparent to-[#0A051B]/30" />

        {/* Subtle Anamorphic Optical Flare Sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-[45%] h-full bg-gradient-to-r from-transparent via-[#ED642B]/10 to-transparent animate-anamorphic-flare blur-xl" />
        </div>

        {/* Live animated fleet background */}
        <AnimatedFleetBackground />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="group w-fit">
            <BrandLogo size={38} showText={true} textSize="text-lg" />
          </Link>

          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Secure account recovery<br />
              <span className="text-[#ED642B]">for fleet operations.</span>
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">
              We protect your dispatch data with enterprise-grade authorization and encrypted session tokens.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck size={14} className="text-status-good" />
            <span>Encrypted password resets · Zero unauthorized credential exposure</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Recovery form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 overflow-y-auto bg-[#0E0724]/90">
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <BrandLogo size={34} showText={true} />
        </Link>

        <div className="w-full max-w-[400px]">
          {sent ? (
            <div className="space-y-6 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-status-good/15 border border-status-good/30 text-status-good">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Check your email</h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  We've sent password reset instructions to <span className="text-white font-bold">{email}</span>.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
                >
                  <ArrowLeft size={15} /> Back to sign in
                </Link>

                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs text-text-secondary hover:text-white transition-colors cursor-pointer"
                >
                  Didn't receive instructions? Try another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset your password</h2>
                <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                  Enter your registered work email and we'll send you instructions to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Work email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dispatcher@haulage.co.ke"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-text-tertiary focus:border-[#ED642B] focus:bg-white/10 focus:outline-none transition-colors"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/25 disabled:opacity-50 transition-all cursor-pointer"
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

              <p className="mt-8 text-center text-sm text-text-tertiary">
                Remembered your password?{' '}
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
