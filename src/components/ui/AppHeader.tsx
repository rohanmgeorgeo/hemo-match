'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';

export type RoleContext = 'requester' | 'donor' | 'overview';

export interface AppHeaderProps {
  roleContext?: RoleContext;
  backHref?: string;
  backLabel?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  roleContext,
  backHref,
  backLabel = 'Back',
}) => {
  const pathname = usePathname();
  const { isDark, toggleTheme, mounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-detect roleContext if not explicitly provided
  const resolvedRole: RoleContext =
    roleContext ||
    (pathname?.startsWith('/requests')
      ? 'requester'
      : pathname?.startsWith('/donors')
      ? 'donor'
      : 'overview');

  const navLinks = [
    { href: '/requests/new', label: 'Request Blood', role: 'requester' },
    { href: '/requests/matching-demo', label: 'Active Matches', role: 'requester' },
    { href: '/donors/notifications', label: 'Donor Inbox', role: 'donor' },
    { href: '/donors/profile', label: 'Donor Profile', role: 'donor' },
  ];

  return (
    <header className="w-full border-b border-neutral-200/80 dark:border-neutral-800/90 bg-white/80 dark:bg-[#0B0B0C]/85 backdrop-blur-md sticky top-0 z-30 transition-colors duration-150">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity & Optional Back Button */}
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors py-1.5 px-2 -ml-2 rounded-lg"
              title={backLabel}
            >
              <svg
                className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-neutral-950 dark:text-white">
                Hemo Match
              </span>
            </div>
          </Link>

          {/* Role Context Pill */}
          <div className="hidden sm:flex items-center ml-1">
            {resolvedRole === 'requester' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
                <span>Requester Workspace</span>
              </span>
            ) : resolvedRole === 'donor' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
                <span>Volunteer Donor Workspace</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                <span>District Blood Matching</span>
              </span>
            )}
          </div>
        </div>

        {/* Center/Right: Desktop Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
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
            onClick={toggleTheme}
            aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'}
            className="w-9 h-9 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50 dark:bg-[#171717] hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
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

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden w-9 h-9 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50 dark:bg-[#171717] hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#121214] px-4 py-3 space-y-1 shadow-lg animate-in fade-in duration-150">
          <div className="px-2 py-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Active Context: {resolvedRole === 'requester' ? 'Requester' : resolvedRole === 'donor' ? 'Volunteer Donor' : 'Overview'}
            </span>
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
