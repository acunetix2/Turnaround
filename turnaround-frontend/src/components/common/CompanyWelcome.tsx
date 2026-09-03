import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useCompany } from '../../lib/CompanyContext';
import { useAuth } from '../../auth/AuthProvider';

export const CompanyWelcome: React.FC = () => {
  const { config } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissedForUser, setDismissedForUser] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const isBrowserReload = navigationEntry?.type === 'reload';
  const visible = Boolean(user && countdown > 0 && !isBrowserReload && dismissedForUser !== user.id && sessionStorage.getItem('turnaround:show-welcome-on-login') === '1');
  const shouldNavigate = Boolean(user && countdown <= 0 && !isBrowserReload && sessionStorage.getItem('turnaround:show-welcome-on-login') === '1');

  useEffect(() => {
    if (!visible || !config?.welcome_media_url) return;
    const timer = window.setInterval(() => setCountdown(value => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [visible, config?.welcome_media_url]);

  useEffect(() => {
    if (!shouldNavigate) return;
    sessionStorage.removeItem('turnaround:show-welcome-on-login');
    navigate('/dashboard', { replace: true });
  }, [countdown, navigate, shouldNavigate]);

  if (!visible) return null;
  if (!config) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A051B] text-sm font-semibold text-white">Loading your company welcome...</div>;
  if (!config.welcome_media_url) return null;

  const close = () => {
    sessionStorage.setItem(`turnaround:welcome-seen:${config.id}`, '1');
    sessionStorage.removeItem('turnaround:show-welcome-on-login');
    setDismissedForUser(user?.id || null);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100] animate-[welcome-in_500ms_ease-out] bg-[#0A051B] text-white">
      <button type="button" onClick={close} aria-label="Close welcome message" className="absolute right-5 top-5 z-20 rounded-full border border-white/20 bg-black/35 p-2.5 text-white/75 backdrop-blur hover:text-white cursor-pointer"><X size={18} /></button>
      <div className="grid h-full min-h-screen md:grid-cols-[1.55fr_0.95fr]">
        <div className="relative min-h-[52vh] overflow-hidden bg-black md:min-h-screen">
          {config.welcome_media_type === 'video' ? <video src={config.welcome_media_url} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : <img src={config.welcome_media_url} alt={`${config.name} welcome`} className="h-full w-full object-cover" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A051B]/55 via-transparent to-transparent" />
        </div>
        <div className="flex flex-col justify-center bg-[#140938] px-8 py-12 sm:px-14 md:px-12 lg:px-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ED642B]">Welcome, {user?.name || 'there'}</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{config.name}</h2>
          {config.welcome_motto && <p className="mt-5 max-w-md text-base leading-7 text-white/70">{config.welcome_motto}</p>}
          <p className="mt-4 max-w-md text-sm leading-6 text-white/45">Your workspace is ready. We are glad to have you here.</p>
          <button type="button" onClick={close} className="mt-9 inline-flex w-fit items-center gap-2 rounded-lg bg-[#ED642B] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/20 hover:bg-[#D4521D] cursor-pointer">Go to workspace <ArrowRight size={16} /></button>
          <p className="mt-4 text-xs text-white/45">Taking you to your dashboard in {countdown}s</p>
        </div>
      </div>
    </div>
  );
};
