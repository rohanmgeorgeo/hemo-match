'use client';

import { useSyncExternalStore, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'hemo_match_theme';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    mql.removeEventListener('change', callback);
  };
}

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {
    // Ignore storage errors
  }
  return 'system';
}

export function getStoredTheme(): Theme {
  return getSnapshot();
}

function getServerSnapshot(): Theme {
  return 'system';
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? getSystemTheme() : theme;

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    mounted: true,
  };
}
