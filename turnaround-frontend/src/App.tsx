import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { Toaster } from './components/ui/Sonner';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './lib/ThemeContext';
import { CompanyProvider } from './lib/CompanyContext';
import { router } from './app/routes';
import { versionLabel } from './lib/version';

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
