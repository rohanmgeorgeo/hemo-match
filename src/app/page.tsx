import React from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F7F5] dark:bg-[#0B0B0C] text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200">
      {/* Global App Header */}
      <AppHeader roleContext="overview" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-300 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            Privacy-first district blood coordination
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white leading-[1.15] mb-4">
            Rapid blood matching,{' '}
            <span className="text-rose-600 dark:text-rose-500">protected by design.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6 font-normal max-w-2xl mx-auto">
            Broad blood broadcasts disturb dozens of donors and expose contact numbers.
            Hemo Match privately matches district donors and protects contact information
            until donor acceptance and explicit requester authorization.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/requests/new"
              id="request-blood-btn"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-white/90"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Request Blood</span>
            </Link>

            <Link
              href="/donors/notifications"
              id="donor-notifications-btn"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-white dark:bg-[#171717] hover:bg-neutral-50 dark:hover:bg-neutral-850 active:scale-[0.98] text-neutral-900 dark:text-neutral-100 font-semibold text-xs sm:text-sm border border-neutral-200/90 dark:border-neutral-800 shadow-xs hover:shadow-xs transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-neutral-700 dark:text-neutral-300"
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
          </div>
        </section>

        {/* Role Launchpad: Requester vs Donor Distinction */}
        <section aria-label="Role Pathways" className="mb-14">
          <div className="text-center mb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Two-Role Coordination Pathways
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Requester Role Card */}
            <Card
              variant="default"
              className="p-6 sm:p-7 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                    Requester Workspace
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                    Phase 1
                  </span>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-1">
                  Request Blood
                </h2>
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2.5">
                  Create Request → Match → Notify → Coordinate
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-normal">
                  Submit an urgent district blood requirement, evaluate compatible candidate donors
                  in your district, and dispatch targeted in-app alerts without broadcasting contact details.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <Link
                  href="/requests/new"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>Start Blood Request</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                <Link
                  href="/requests/matching-demo"
                  className="w-full inline-flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                >
                  View active matching dashboard →
                </Link>
              </div>
            </Card>

            {/* Donor Role Card */}
            <Card
              variant="default"
              className="p-6 sm:p-7 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    Volunteer Donor Workspace
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    Phase 2
                  </span>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-1">
                  Volunteer Responses
                </h2>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5">
                  Receive Relevant Request → Review → Accept / Decline
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-normal">
                  Receive relevant match notifications in your district inbox. Review clinical urgency
                  and volunteer safely while your phone number stays protected.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <Link
                  href="/donors/notifications"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>Open Donor Inbox</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                <Link
                  href="/donors/register"
                  id="find-donors-btn"
                  className="w-full inline-flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                >
                  Register volunteer donor profile →
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* Privacy Story: Compact Visual Sequence */}
        <section aria-label="Privacy Coordination Sequence" className="mb-14">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              The 4-Step Privacy Guarantee
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 dark:text-white mt-1">
              How Protected Contact Coordination Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs mb-3">
                01
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Private Match
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                Relevant donors are discovered algorithmically in the district. Identity and phone numbers remain masked.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs mb-3">
                02
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Targeted Alert
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                Only appropriate candidates receive in-app notification. No public broadcasts or spam calls.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs mb-3">
                03
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Donor Confirms
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                Donor reviews requirement and accepts. Contact information is still locked and protected.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs mb-3">
                04
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Explicit Reveal
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                Requester clicks Reveal Contact to unlock minimum coordination details (name and phone).
              </p>
            </div>
          </div>
        </section>

        {/* Product Principles: Actual Differentiators */}
        <section aria-label="Core Differentiators" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {/* Card 1 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-4">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mb-1">
              District Boundary
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
              District-Level Scope
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Matches eligible donors within the same administrative district, providing locality
              relevance without requiring live GPS tracking or continuous location collection.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-4">
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
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
              120-Day Recovery Rule
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Applies a conservative 120-calendar-day donation recovery interval during matching discovery,
              ensuring safe, responsible volunteer donor engagement.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-4">
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
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
              Structured Reveal
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              Donor phone numbers remain private by default until a donor confirms acceptance and the
              requester explicitly chooses to reveal contact for final coordination.
            </p>
          </div>
        </section>

        {/* Clinical Disclaimer Callout */}
        <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed text-center sm:text-left flex items-start gap-3">
          <svg
            className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
          <span>
            Hemo Match is an emergency coordination tool for preliminary donor discovery. Final donor eligibility,
            cross-matching, and transfusion compatibility must be confirmed by qualified blood-bank or hospital personnel.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-[#121214] py-6 transition-colors mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Hemo Match</span>
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
