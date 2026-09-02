/**
 * Theme context — wraps next-themes and exposes a simple { theme, toggleTheme } API
 * used throughout the app for dark/light mode chart colours and class variants.
 */
import React, { createContext, useContext } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

/** Inner component that has access to next-themes context. */
const ThemeContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: rawTheme, setTheme } = useNextTheme();

  const theme: 'dark' | 'light' = rawTheme === 'light' ? 'light' : 'dark';
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
};

/** App-level ThemeProvider — wraps both next-themes and our own context. */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
  >
    <ThemeContextBridge>{children}</ThemeContextBridge>
  </NextThemesProvider>
);

/**
 * Hook — use this everywhere in the app instead of importing next-themes directly.
 * const { theme, toggleTheme } = useTheme();
 */
export const useTheme = () => useContext(ThemeCtx);
