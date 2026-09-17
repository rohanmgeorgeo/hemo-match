import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Top Navigation */}
      <header className="w-full border-b border-neutral-200/70 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shadow-xs">
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
              <span className="font-semibold text-lg tracking-tight text-neutral-950">
                Hemo Match
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200/80">
                SC-12
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              District Network Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 flex flex-col justify-center">
        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50/80 border border-rose-200/70 px-3 py-1 text-xs font-medium text-rose-800 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            District Blood Donor Matching
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-950 leading-[1.15] mb-5">
            Rapid blood matching,{' '}
            <span className="text-rose-600">built for life.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-8 sm:mb-10 font-normal">
            Hemo Match connects urgent blood requests directly with verified,
            eligible donors across your district—safeguarding donor privacy
            through structured two-way contact reveal.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto">
            <Link
              href="/requests/new"
              id="request-blood-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 cursor-pointer"
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
              Request Blood
            </Link>

            <Link
              href="/donors/register"
              id="find-donors-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 transition-all duration-150 shadow-xs hover:shadow-sm active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 cursor-pointer"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-neutral-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              Find Donors
            </Link>
          </div>
        </section>

        {/* Apple Health-Inspired Modular Metric/Feature Cards */}
        <section
          aria-label="Core Capabilities"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Card 1 */}
          <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-7 shadow-xs hover:border-neutral-300 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600"
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
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 mb-1">
              District Proximity
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Locality-First Matching
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed font-normal">
              Prioritizes compatible blood donors in the immediate administrative
              block and hospital cluster before widening the search radius.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-7 shadow-xs hover:border-neutral-300 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600"
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
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 mb-1">
              Donor Wellbeing
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Automated Eligibility
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed font-normal">
              Calculates mandatory interval rest periods (90-day whole blood
              cycle) to ensure safe, ethical, and responsible donor engagement.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-7 shadow-xs hover:border-neutral-300 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 mb-5">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-rose-600"
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
            <div className="text-xs font-medium tracking-wide uppercase text-neutral-400 mb-1">
              Privacy First
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Masked Contact Reveal
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed font-normal">
              Donor phone numbers remain private and masked by default until mutual
              match acceptance and explicit contact reveal approval.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-200/70 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-700">Hemo Match</span>
            <span>•</span>
            <span>Challenge SC-12: District Blood Donor Matching</span>
          </div>
          <div className="text-neutral-400">
            Foundation Milestone • Mock Auth &amp; In-App Notifications
          </div>
        </div>
      </footer>
    </div>
  );
}
