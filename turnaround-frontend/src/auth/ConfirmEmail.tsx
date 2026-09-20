import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../lib/ThemeContext';

export const ConfirmEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [state, setState] = useState<'ready' | 'confirming' | 'confirmed' | 'error'>('ready');
  const [message, setMessage] = useState('Click below to confirm your email address and activate your account.');
  const [tokenHash, setTokenHash] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const errorDescription = searchParams.get('error_description');

    if (errorDescription) {
      setState('error');
      setMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      return;
    }

    setTokenHash(tokenHash);
  }, [searchParams]);

  const handleConfirm = async () => {
    setState('confirming');
    setMessage('Confirming your email address...');
    try {
      // When Supabase has already verified its hosted link, no token remains
      // in the redirect URL. A token_hash is handled through our backend.
      if (tokenHash) await apiClient.confirmEmail(tokenHash);
      setState('confirmed');
      setMessage('Your email address has been confirmed.');
    } catch (error: unknown) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'This confirmation link is invalid or has expired.');
    }
  };

  return (
    <main className={`flex min-h-screen items-center justify-center px-6 py-10 ${theme === 'dark' ? 'bg-[#0A051B]' : 'bg-[#F5F3FB]'}`}>
      <section className={`w-full max-w-md rounded-2xl border p-8 text-center shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-[#0B0928]' : 'border-[#250C77]/15 bg-white'}`}>
        <Link to="/" className="mb-8 inline-flex justify-center">
          <BrandLogo size={38} showText />
        </Link>

        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${state === 'confirmed' ? 'bg-emerald-500/15 text-emerald-500' : state === 'error' ? 'bg-red-500/15 text-red-500' : 'bg-[#ED642B]/15 text-[#ED642B]'}`}>
          {(state === 'ready' || state === 'confirming') && <Loader2 size={28} className={state === 'confirming' ? 'animate-spin' : ''} />}
          {state === 'confirmed' && <CheckCircle2 size={30} />}
          {state === 'error' && <MailWarning size={30} />}
        </div>

        <h1 className={`text-xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-[#250C77]'}`}>
          {state === 'ready' ? 'Confirm your email' : state === 'confirming' ? 'Confirming your email' : state === 'confirmed' ? 'Email confirmed' : 'Confirmation unsuccessful'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{message}</p>

        {state === 'ready' && (
          <button type="button" onClick={handleConfirm} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] py-3 text-sm font-bold text-white transition-colors hover:bg-[#D4521D]">
            Confirm email <ArrowRight size={15} />
          </button>
        )}
        {state === 'confirmed' && (
          <button type="button" onClick={() => navigate('/login')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED642B] py-3 text-sm font-bold text-white transition-colors hover:bg-[#D4521D]">
            Continue to login <ArrowRight size={15} />
          </button>
        )}
        {state === 'error' && (
          <Link to="/login" className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-border-default py-3 text-sm font-bold text-text-primary transition-colors hover:bg-bg-surface-raised">
            Return to login <ArrowRight size={15} />
          </Link>
        )}
      </section>
    </main>
  );
};
