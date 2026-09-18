'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { PublicMatchCandidate } from '@/types/matches';
import {
  validateStoredRequest,
  parseMatchApiResponse,
  getCompatibilityBadgeDetails,
  type MatchUiState,
} from '@/lib/matching/ui-helpers';
import {
  parseDispatchApiResponse,
  type DispatchUiState,
} from '@/lib/validation/notifications';

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

  const { isValid, requestId, request } = useMemo(
    () => validateStoredRequest(storedJson),
    [storedJson]
  );

  const [dataState, setDataState] = useState<{
    id: string;
    count: number;
    result: MatchUiState;
  } | null>(null);

  const [retryCounter, setRetryCounter] = useState(0);

  const isLoading = Boolean(
    isValid &&
      requestId &&
      (dataState?.id !== requestId || dataState?.count !== retryCounter)
  );

  const matchState: MatchUiState | null =
    dataState?.id === requestId && dataState?.count === retryCounter
      ? dataState.result
      : null;

  // Asynchronously query matches when valid requestId or retryCounter changes
  useEffect(() => {
    if (!isValid || !requestId) {
      return;
    }

    const currentRequestId = requestId;
    let isSubscribed = true;

    async function runSearch() {
      try {
        const response = await fetch('/api/requests/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId: currentRequestId }),
        });

        const data: unknown = await response.json().catch(() => null);
        if (isSubscribed) {
          const result = parseMatchApiResponse(response.status, data);
          setDataState({
            id: currentRequestId,
            count: retryCounter,
            result,
          });
        }
      } catch {
        if (isSubscribed) {
          setDataState({
            id: currentRequestId,
            count: retryCounter,
            result: {
              status: 'error',
              message:
                'Unable to connect to matching service. Please check your connection and try again.',
            },
          });
        }
      }
    }

    void runSearch();

    return () => {
      isSubscribed = false;
    };
  }, [isValid, requestId, retryCounter]);

  const handleRetry = () => {
    if (requestId && !isLoading) {
      setRetryCounter((c) => c + 1);
    }
  };

  const [dispatchState, setDispatchState] = useState<DispatchUiState>({
    status: 'idle',
  });

  const handleDispatch = async () => {
    if (
      !requestId ||
      dispatchState.status === 'dispatching' ||
      dispatchState.status === 'success'
    ) {
      return;
    }

    setDispatchState({ status: 'dispatching' });

    try {
      const response = await fetch('/api/requests/notifications/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      const data: unknown = await response.json().catch(() => null);
      const parsed = parseDispatchApiResponse(response.status, data);
      setDispatchState(parsed);
    } catch {
      setDispatchState({
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    }
  };

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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              Automated Match Discovery
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {!isValid || !request ? (
          /* Empty / Missing Request State */
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg
                className="w-7 h-7"
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
            <h1 className="text-xl font-bold text-neutral-950 mb-2">
              No active blood request found
            </h1>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto mb-6 leading-relaxed">
              Create a new blood request to experience preliminary district donor matching backed by the authoritative verification engine.
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
            {/* Request Context Summary */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Active Blood Request
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-5 text-left">
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
                    Approximate Area
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {request.approximateArea}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    Hospital / Facility
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
              </div>
            </div>

            {/* Matching Engine States */}
            {isLoading && (
              <div className="rounded-3xl bg-white border border-neutral-200/80 p-8 sm:p-12 shadow-xs text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />
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

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 mb-2">
                  Finding eligible donors
                </h2>

                <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  Checking blood-group compatibility, district availability, and configured donation-interval rules.
                </p>

                <div className="mt-8 space-y-3 max-w-md mx-auto">
                  <div className="h-16 rounded-2xl bg-neutral-100/70 animate-pulse" />
                  <div className="h-16 rounded-2xl bg-neutral-100/40 animate-pulse" />
                </div>
              </div>
            )}

            {!isLoading && matchState?.status === 'zero_matches' && (
              <div className="rounded-3xl bg-white border border-neutral-200/80 p-8 sm:p-10 shadow-xs text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-4 border border-neutral-200/80">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 mb-2">
                  No eligible candidate donors currently found in this district.
                </h2>

                <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed mb-6">
                  Matching applies preliminary blood-group compatibility, availability, district, consent, and configured donation-interval rules.
                </p>

                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-xs"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Re-evaluate Matches
                </button>
              </div>
            )}

            {!isLoading && matchState?.status === 'error' && (
              <div className="rounded-3xl bg-white border border-rose-200/80 p-8 sm:p-10 shadow-xs text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 mb-2">
                  Unable to find matches
                </h2>

                <p className="text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed mb-6">
                  {matchState.message}
                </p>

                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-xs"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && matchState?.status === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      Eligible donor matches
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Evaluated against compatibility, recovery intervals, and district locality.
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {matchState.totalMatches} {matchState.totalMatches === 1 ? 'candidate' : 'candidates'}
                  </span>
                </div>

                <div className="space-y-3">
                  {matchState.matches.map((candidate: PublicMatchCandidate) => {
                    const badge = getCompatibilityBadgeDetails(candidate.compatibilityType);

                    return (
                      <div
                        key={candidate.matchId}
                        className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs transition-all hover:border-neutral-300"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center font-black text-rose-600 text-sm">
                              {candidate.bloodGroup}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-neutral-900 tracking-tight">
                                {candidate.anonymizedDonorRef}
                              </div>
                              <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                <svg
                                  className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
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
                                <span>
                                  {candidate.districtName}
                                  {candidate.approximateArea ? ` • ${candidate.approximateArea}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                                badge.isHomologous
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  badge.isHomologous ? 'bg-emerald-600' : 'bg-blue-600'
                                }`}
                              />
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Factual Match Reasons */}
                        {candidate.factualMatchReasons && candidate.factualMatchReasons.length > 0 && (
                          <div className="pt-3">
                            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                              Verified Preliminary Criteria
                            </div>
                            <ul className="space-y-1.5">
                              {candidate.factualMatchReasons.map((reason, rIdx) => (
                                <li
                                  key={rIdx}
                                  className="text-xs text-neutral-600 flex items-center gap-2"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.5"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m4.5 12.75 6 6 9-13.5"
                                    />
                                  </svg>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Candidate Status Footer */}
                        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                          <span className="capitalize font-medium text-neutral-500">
                            Status: {candidate.status}
                          </span>
                          <span>Contact details protected</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 7: Explicit Requester Action — Notify Eligible Donors */}
                {matchState.matches.length > 0 && (
                  <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                          In-App Notification Dispatch
                        </div>
                        <h3 className="text-base font-bold text-neutral-950">
                          Notify Eligible Donors
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Dispatches authoritative in-app notifications to candidate donors in this district.
                        </p>
                      </div>

                      <div className="shrink-0">
                        {dispatchState.status === 'idle' && (
                          <button
                            type="button"
                            onClick={handleDispatch}
                            id="notify-eligible-donors-btn"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4 text-white/90"
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
                            Notify Eligible Donors
                          </button>
                        )}

                        {dispatchState.status === 'dispatching' && (
                          <button
                            type="button"
                            disabled
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-400 text-white font-medium text-xs sm:text-sm cursor-not-allowed opacity-80"
                          >
                            <svg
                              className="w-4 h-4 animate-spin text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Sending Notifications...
                          </button>
                        )}

                        {dispatchState.status === 'success' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <svg
                              className="w-4 h-4 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 12.75 6 6 9-13.5"
                              />
                            </svg>
                            In-App Notifications Sent
                          </div>
                        )}

                        {dispatchState.status === 'already_notified' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-semibold">
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
                                d="m4.5 12.75 6 6 9-13.5"
                              />
                            </svg>
                            Already Notified
                          </div>
                        )}

                        {dispatchState.status === 'zero_notifications' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                            0 Notifications Dispatched
                          </div>
                        )}

                        {dispatchState.status === 'error' && (
                          <button
                            type="button"
                            onClick={handleDispatch}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-all shadow-xs cursor-pointer"
                          >
                            Retry Dispatch
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Aggregate Outcome Display */}
                    {dispatchState.status === 'success' && (
                      <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
                        <div className="font-bold mb-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          {dispatchState.count} eligible donor{dispatchState.count === 1 ? '' : 's'} notified
                        </div>
                        <p className="text-emerald-800/90">
                          In-app notifications sent. Candidate donors have been alerted within their private inboxes. Contact details remain confidential until a donor explicitly accepts the request in the subsequent step.
                        </p>
                      </div>
                    )}

                    {dispatchState.status === 'zero_notifications' && (
                      <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                        <div className="font-bold mb-1">Notice: Zero notifications dispatched</div>
                        <p className="text-amber-800/90">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'already_notified' && (
                      <div className="mt-4 p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                        <div className="font-bold mb-1">Request Already Notified</div>
                        <p className="text-neutral-600">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'error' && (
                      <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
                        <div className="font-bold mb-1">Dispatch Error</div>
                        <p className="text-rose-700">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'idle' && (
                      <div className="mt-3 text-xs text-neutral-400 flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                          />
                        </svg>
                        <span>
                          In-app notification only. No SMS or WhatsApp messages are sent. Donor identities remain masked.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Shield Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 border border-neutral-200/80">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">
                    Contact details stay private
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Donor names and phone numbers remain hidden during matching. Contact details are revealed only after the donor accepts.
                  </p>
                </div>
              </div>
            </div>

            {/* Safety & Clinical Disclaimer */}
            <div className="p-4 rounded-2xl bg-neutral-100/80 border border-neutral-200/80 text-xs text-neutral-500 leading-relaxed text-center sm:text-left flex items-start gap-3">
              <svg
                className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
              <span>
                Hemo Match supports donor discovery and coordination only. Final donor eligibility and transfusion compatibility are determined by qualified blood-bank or clinical personnel.
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/requests/new"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:shadow-sm text-center transition-all"
              >
                Create Another Request
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-xs text-center transition-all"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
