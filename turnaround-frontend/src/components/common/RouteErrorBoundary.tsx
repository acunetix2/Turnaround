import React from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected system error occurred while processing fleet operations.';
  let statusCode = '500';

  if (isRouteErrorResponse(error)) {
    statusCode = String(error.status);
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg-canvas)' }}
    >
      <div className="max-w-md w-full rounded-2xl border border-border-strong bg-bg-surface p-8 shadow-2xl space-y-6 text-center">
        {/* Error icon badge in Express Orange / Purple */}
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-[#ED642B]/15 border border-[#ED642B]/30 text-[#ED642B]">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <span className="font-numeric text-xs font-bold text-[#ED642B] uppercase tracking-wider px-2 py-0.5 rounded bg-[#ED642B]/10">
            System Notice · Status {statusCode}
          </span>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
            Navigation Interruption
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed break-words font-mono bg-bg-surface-raised p-3 rounded-xl border border-border-default">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] py-2.5 text-xs font-bold text-white shadow-md shadow-[#ED642B]/20 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
            Reload View
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface-raised hover:bg-bg-surface py-2.5 text-xs font-semibold text-text-primary transition-all cursor-pointer"
          >
            <ArrowLeft size={13} />
            Go Back
          </button>
        </div>

        <div className="pt-3 border-t border-border-default">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ED642B] hover:underline"
          >
            <Home size={13} /> Return to Operations Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
