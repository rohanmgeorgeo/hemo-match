import React from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F7F5] dark:bg-[#0B0B0C] text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200">
      {/* Global App Header */}
      <AppHeader roleContext="overview" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 px-3 py-1 text-xs font-medium text-rose-800 dark:text-rose-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            District Blood Donor Matching
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-950 dark:text-white leading-[1.15] mb-5">
            Rapid blood matching,{' '}
            <span className="text-rose-600 dark:text-rose-500">built for life.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-8 font-normal max-w-2xl mx-auto">
            Hemo Match connects urgent blood requests directly with compatible,
            volunteer donors across your district—safeguarding donor privacy
            through structured authorized contact reveal.
          </p>

          {/* Two-Role Interactive Pathways */}
          <div className="w-full text-left mt-6">
            <div className="text-center mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Two-Role Demonstration Flow
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Requester Role Card */}
              <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/90 dark:border-neutral-800 p-5 sm:p-6 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60">
                      Requester
                    </span>
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 px-2 py-0.5 rounded">
                      Step 1 → 3
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-neutral-950 dark:text-white mb-1">
                    Request Blood
                  </h2>
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
                    Request Blood → Find Matches → Notify
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5">
                    Submit an urgent district blood requirement, find compatible candidate donors, and dispatch in-app notifications.
                  </p>
                </div>
                <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <Link
                    href="/requests/new"
                    id="request-blood-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-white/90"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    <span>Request Blood</span>
                  </Link>
                  <Link
                    href="/requests/matching-demo"
                    className="w-full inline-flex items-center justify-center text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                  >
                    View active matching dashboard →
                  </Link>
                </div>
              </div>

              {/* Donor Role Card */}
              <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/90 dark:border-neutral-800 p-5 sm:p-6 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                      Volunteer Donor
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                      Step 4 → 5
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-neutral-950 dark:text-white mb-1">
                    Donor Responses
                  </h2>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Notifications → Accept / Decline
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5">
                    Review match alerts in your district inbox. Respond securely while keeping your contact details protected.
                  </p>
                </div>
                <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <Link
                    href="/donors/notifications"
                    id="donor-notifications-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-950 font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-white/90 dark:text-neutral-950/90"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                      />
                    </svg>
                    <span>Donor Inbox</span>
                  </Link>
                  <Link
                    href="/donors/register"
                    id="find-donors-btn"
                    className="w-full inline-flex items-center justify-center text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                  >
                    Register volunteer donor profile →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Apple Health-Inspired Modular Metric/Feature Cards */}
        <section
          aria-label="Core Capabilities"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Card 1 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-7 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            </div>
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mb-1">
              District Coordination
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              District-Level Matching
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Focuses on compatible volunteer blood donors within the same administrative
              district, providing locality context without requiring live GPS tracking.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-7 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                />
              </svg>
            </div>
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mb-1">
              Donor Wellbeing
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Preliminary Recovery Interval
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Uses a conservative 120-day application matching interval for
              preliminary donor discovery, ensuring safe and responsible donor
              engagement.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-7 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mb-1">
              Privacy First
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Masked Contact Reveal
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Donor phone numbers remain private and masked by default until a donor
              accepts and the requester explicitly reveals contact for coordination.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-[#121214] py-6 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Hemo Match</span>
            <span>•</span>
            <span>District Blood Donor Matching</span>
          </div>
          <div className="text-neutral-400 dark:text-neutral-500">
            Privacy-First Preliminary District Blood Donor Discovery
          </div>
        </div>
      </footer>
    </div>
  );
}
