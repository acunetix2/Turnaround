import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; bg: string; border: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle size={16} />,
    bg: 'bg-[#121317]',
    border: 'border-[#22C55E]/30',
    iconColor: 'text-[#22C55E]',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-[#121317]',
    border: 'border-[#F5A524]/30',
    iconColor: 'text-[#F5A524]',
  },
  error: {
    icon: <XCircle size={16} />,
    bg: 'bg-[#121317]',
    border: 'border-[#F0464C]/30',
    iconColor: 'text-[#F0464C]',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'bg-[#121317]',
    border: 'border-[#4F7CFF]/30',
    iconColor: 'text-[#4F7CFF]',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const cfg = variantConfig[t.variant];
          return (
            <div
              key={t.id}
              role="alert"
              className={[
                'flex items-start gap-3 p-4 rounded-xl border',
                'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
                cfg.bg,
                cfg.border,
              ].join(' ')}
            >
              <span className={['mt-0.5 shrink-0', cfg.iconColor].join(' ')}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F4F5F7]">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{t.message}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded text-[#6B7280] hover:text-[#F4F5F7]"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
