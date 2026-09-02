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

const variantStyles: Record<ToastVariant, { accent: string; icon: React.ReactNode }> = {
  success: { accent: '#10B981', icon: <CheckCircle size={15} /> },
  warning: { accent: '#F59E0B', icon: <AlertTriangle size={15} /> },
  error:   { accent: '#EF4444', icon: <XCircle size={15} /> },
  info:    { accent: '#1B6BF5', icon: <Info size={15} /> },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...opts, id }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 w-[320px] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => {
          const { accent, icon } = variantStyles[t.variant];
          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg"
              style={{
                backgroundColor: 'var(--toast-bg, var(--color-bg-surface-raised))',
                borderColor: `${accent}30`,
                borderLeftColor: accent,
                borderLeftWidth: '3px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <span style={{ color: accent }} className="mt-0.5 shrink-0">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {t.title}
                </p>
                {t.message && (
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded cursor-pointer transition-opacity opacity-50 hover:opacity-100"
                style={{ color: 'var(--color-text-primary)' }}
                aria-label="Dismiss"
              >
                <X size={13} />
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
