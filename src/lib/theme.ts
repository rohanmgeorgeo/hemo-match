'use client';

import { useSyncExternalStore, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'hemo_match_theme';
const THEME_CHANGE_EVENT = 'hemo_match_theme_change';

function emptySubscribe() {
  return () => {};
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
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
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isDocDark =
    mounted && typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false;

  const resolvedTheme: 'light' | 'dark' = mounted
    ? isDocDark
      ? 'dark'
      : 'light'
    : theme === 'system'
    ? getSystemTheme()
    : theme === 'dark'
    ? 'dark'
    : 'light';

  const isDark = resolvedTheme === 'dark';

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    if (typeof document === 'undefined') return;
    const currentlyDark = document.documentElement.classList.contains('dark');
    const next: Theme = currentlyDark ? 'light' : 'dark';
    applyTheme(next);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark,
    mounted,
  };
}
