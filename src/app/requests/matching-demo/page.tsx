'use client';

import React, { useSyncExternalStore, useMemo } from 'react';
import Link from 'next/link';
import type { BloodRequest } from '@/types';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): string | null {
  return window.localStorage.getItem('hemo_match_active_request');
}

function getServerSnapshot(): string | null {
  return null;
}

export default function MatchingDemoPage() {
  const storedJson = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const request = useMemo<BloodRequest | null>(() => {
    if (!storedJson) return null;
    try {
      return JSON.parse(storedJson) as BloodRequest;
    } catch {
      return null;
    }
  }, [storedJson]);

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 'Not specified';
    try {
      const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
      if (isNaN(d.getTime())) return `${dateStr} ${timeStr || ''}`;
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return `${dateStr} ${timeStr || ''}`;
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            Critical Urgency
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Urgent (12–24h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            Routine Scheduled
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900 pb-20">
      {/* Header */}
      <header className="w-full border-b border-neutral-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors py-2 pr-3 -ml-2 rounded-lg"
          >
            <svg
              className="w-4 h-4 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              Matching Stage Demo
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {!request ? (
          /* Empty / Fallback State */
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">
              No Active Request Found
            </h2>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6">
              You can create a new blood request to experience the district donor matching flow.
            </p>
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all shadow-xs"
            >
              Create Blood Request
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Matching Engine Simulator Status Card */}
            <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-8 shadow-xs text-center relative overflow-hidden">
              {/* Subtle top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />

              {/* Radar/Pulse Graphic */}
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center mx-auto mb-5 relative">
                <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                <svg
                  className="w-7 h-7 text-rose-600 relative z-10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5 0-3.309 3.428-7.697 6.54-11.233a1.25 1.25 0 0 1 1.92 0C16.072 6.303 19.5 10.691 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
                </svg>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mb-3">
                Finding eligible nearby donors...
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed mb-6 font-normal">
                We&apos;ll check blood-group compatibility, donation eligibility,
                location, availability, and notification preferences in the
                matching stage.
              </p>

              {/* Temporary Indicator Badge */}
              <div className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100/90 border border-neutral-200/80 px-4 py-2.5 text-xs text-neutral-600 max-w-lg mx-auto">
                <svg
                  className="w-4 h-4 text-neutral-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
                <span>
                  <strong>Prototype Demonstration:</strong> Actual donor matching,
                  database records, and SMS/in-app dispatches will be activated in
                  subsequent development steps.
                </span>
              </div>
            </div>

            {/* Submitted Request Summary Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Submitted Request Summary
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-rose-600">
                      {request.bloodGroup}
                    </span>
                    <span className="text-base font-semibold text-neutral-900">
                      {request.component}
                    </span>
                    <span className="text-sm text-neutral-500 font-medium">
                      ({request.unitsNeeded} {request.unitsNeeded === 1 ? 'Unit' : 'Units'})
                    </span>
                  </div>
                </div>

                <div>{getUrgencyBadge(request.urgency)}</div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-5">
                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    District
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {request.districtName || request.districtId}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    Approximate Locality
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {request.approximateArea}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    Hospital / Blood Centre
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {request.hospitalName}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    Required By
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {formatDateTime(request.requiredByDate, request.requiredByTime)}
                  </span>
                </div>

                {request.notes && (
                  <div className="sm:col-span-2 pt-2 border-t border-neutral-100">
                    <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                      Coordination Note
                    </span>
                    <p className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
                      {request.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Matching Criteria Breakdown Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Upcoming Matching Sequence
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-xs font-bold text-neutral-800 mb-3 shadow-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1">
                    Compatibility
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Evaluates ABO/Rh blood group compatibility rules against registered donors.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-xs font-bold text-neutral-800 mb-3 shadow-xs">
                    2
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1">
                    Eligibility Checks
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Donation eligibility will be evaluated during the matching stage using configured rules and qualified clinical guidance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-xs font-bold text-neutral-800 mb-3 shadow-xs">
                    3
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1">
                    Privacy Shield
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Maintains masked contact details until explicit donor and recipient consent.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/requests/new"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:shadow-sm text-center transition-all"
              >
                Edit Request Information
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-xs text-center transition-all"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
