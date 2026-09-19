'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';

export type RoleContext = 'requester' | 'donor' | 'overview';

export interface AppHeaderProps {
  roleContext?: RoleContext;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ children }) => {
  const pathname = usePathname();
  const { isDark, toggleTheme, mounted } = useTheme();

  const navLinks = [
    { href: '/requests/new', label: 'Request Blood' },
    { href: '/requests/matching-demo', label: 'Matches' },
    { href: '/donors/notifications', label: 'Donor Inbox' },
    { href: '/donors/profile', label: 'Donor Profile' },
  ];

  return (
    <header className="w-full border-b border-neutral-200/80 dark:border-neutral-800/90 glass-bar sticky top-0 z-30 transition-colors duration-150">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity Strictly "Hemo Match" */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group rounded-xl p-1 -ml-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          aria-label="Hemo Match Home"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs group-hover:scale-105 transition-transform">
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5 0-3.309 3.428-7.697 6.54-11.233a1.25 1.25 0 0 1 1.92 0C16.072 6.303 19.5 10.691 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-neutral-950 dark:text-white">
            Hemo Match
          </span>
        </Link>

        {/* Center/Right: Desktop Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {children}

          <nav aria-label="Desktop Navigation" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle Button */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50 dark:bg-[#171717] hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          >
            {mounted && isDark ? (
              // Sun icon (for switching to light)
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              // Moon icon (for switching to dark)
              <svg className="w-4 h-4 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
