import React from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected system error occurred.';
  let statusCode = '500';

  if (isRouteErrorResponse(error)) {
    statusCode = String(error.status);
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#07080A] text-[#F4F5F7] px-6 py-12">
      <div className="max-w-md w-full rounded-2xl border border-white/15 bg-[#121317] p-8 shadow-2xl space-y-6 text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30">
          <AlertTriangle size={28} className="text-red-400" />
        </div>

        <div className="space-y-2">
          <span className="font-['IBM_Plex_Mono'] text-xs font-bold text-red-400 uppercase tracking-wider">
            Error {statusCode}
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Navigation Route Exception
          </h1>
          <p className="text-xs text-[#9CA3AF] leading-relaxed break-words font-mono bg-black/40 p-3 rounded-lg border border-white/5">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#4F7CFF] hover:bg-[#6E92FF] py-2.5 text-xs font-bold text-white shadow-lg shadow-[#4F7CFF]/20 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
            Reload Page
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={13} />
            Go Back
          </button>
        </div>

        <div className="pt-2 border-t border-white/10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E92FF] hover:underline">
            <Home size={12} /> Return to Operations Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
