import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { Toaster } from './components/ui/Sonner';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './lib/ThemeContext';
import { CompanyProvider } from './lib/CompanyContext';
import { router } from './app/routes';
import { versionLabel } from './lib/version';

function normalizeSupabaseAuthRedirect() {
  if (typeof window === 'undefined') return;

  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');
  const tokenHash = params.get('token_hash');

  if (!accessToken && !refreshToken && !tokenHash) return;

  let nextPath = window.location.pathname;

  if (type === 'recovery' && accessToken && refreshToken) {
    nextPath = `/reset-password?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=${encodeURIComponent(type)}`;
  } else if ((type === 'signup' || type === 'email') && (accessToken || tokenHash)) {
    const confirmParams = new URLSearchParams();
    if (tokenHash) confirmParams.set('token_hash', tokenHash);
    if (accessToken) confirmParams.set('access_token', accessToken);
    if (refreshToken) confirmParams.set('refresh_token', refreshToken);
    if (type) confirmParams.set('type', type);
    nextPath = `/confirm-email?${confirmParams.toString()}`;
  }

  if (nextPath !== window.location.pathname + window.location.search) {
    window.history.replaceState({}, '', nextPath);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function App() {
  normalizeSupabaseAuthRedirect();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CompanyProvider>
            <ToastProvider>
              <RouterProvider router={router} />
              <Toaster />
              <div className="fixed bottom-3 right-3 z-50 rounded-full border border-border-default bg-bg-surface/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-text-secondary shadow-sm backdrop-blur-sm">
                {versionLabel()}
              </div>
            </ToastProvider>
          </CompanyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
