'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { GlowSurface } from '@/components/ui/GlowSurface';
import { RequestLifecycle, CandidateCard } from '@/components/matching';
import type { PublicMatchCandidate } from '@/types/matches';
import {
  validateStoredRequest,
  parseMatchApiResponse,
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
        // 1. First try fetching existing matches via GET (preserves notified/accepted states)
        const getRes = await fetch(`/api/requests/matches?requestId=${currentRequestId}`);
        if (getRes.ok) {
          const getData: unknown = await getRes.json().catch(() => null);
          const parsedGet = parseMatchApiResponse(getRes.status, getData);
          if (parsedGet.status === 'success' && parsedGet.matches.length > 0) {
            if (isSubscribed) {
              setDataState({
                id: currentRequestId,
                count: retryCounter,
                result: parsedGet,
              });
            }
            return;
          }
        }

        // 2. Otherwise generate/evaluate matches via POST
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

  const [revealedContacts, setRevealedContacts] = useState<
    Record<string, { name: string; phone: string }>
  >({});
  const [revealingMatchId, setRevealingMatchId] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<{ matchId: string; message: string } | null>(null);

  const handleRevealContact = async (matchId: string) => {
    if (!requestId || revealingMatchId) return;

    setRevealingMatchId(matchId);
    setRevealError(null);

    try {
      const response = await fetch('/api/requests/contact-reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, matchId }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (
        response.ok &&
        data &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === true &&
        'contact' in data &&
        data.contact &&
        typeof data.contact === 'object' &&
        'name' in data.contact &&
        'phone' in data.contact
      ) {
        const contact = data.contact as { name: string; phone: string };
        setRevealedContacts((prev) => ({
          ...prev,
          [matchId]: contact,
        }));
      } else {
        const errorMsg =
          data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
            ? data.message
            : 'Unable to authorize contact reveal. Please try again.';
        setRevealError({ matchId, message: errorMsg });
      }
    } catch {
      setRevealError({
        matchId,
        message: 'Network error while requesting contact reveal.',
      });
    } finally {
      setRevealingMatchId(null);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            Critical Urgency
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Urgent (12–24h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            Routine Scheduled
          </span>
        );
    }
  };

  // Lifecycle state calculations
  const lifecycleStates = useMemo(() => {
    const hasReq = Boolean(isValid && request);
    const hasMatches = Boolean(
      matchState?.status === 'success' && matchState.matches.length > 0
    );
    const isNotified = Boolean(
      dispatchState.status === 'success' ||
        dispatchState.status === 'already_notified' ||
        (matchState?.status === 'success' &&
          matchState.matches.some(
            (m) => m.status === 'notified' || m.status === 'accepted'
          ))
    );
    const hasResp = Boolean(
      matchState?.status === 'success' &&
        matchState.matches.some(
          (m) => m.status === 'accepted' || m.status === 'declined'
        )
    );
    const hasRev = Boolean(Object.keys(revealedContacts).length > 0);

    return {
      hasRequest: hasReq,
      hasMatches,
      isNotified,
      hasResponse: hasResp,
      hasRevealed: hasRev,
    };
  }, [isValid, request, matchState, dispatchState, revealedContacts]);

  const canEditRequest = !lifecycleStates.hasResponse && !lifecycleStates.hasRevealed;

  return (
    <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      {/* Global App Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 page-enter">
        {/* Subtle ambient crimson radial wash */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.16),rgba(225,29,72,0.03)_45%,transparent_70%)]" />
        </div>
        {!isValid || !request ? (
          /* Empty / Missing Request State */
          <Card variant="default" className="p-8 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
              No active blood request found
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Create a new blood request to experience preliminary district donor matching backed by the authoritative verification engine.
            </p>
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-xs"
            >
              Create Blood Request
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 liquid-glass-pill shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                  Requester Workspace • Step 2: Match &amp; Coordinate
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                District Match Discovery
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Discover compatible district donors, send in-app notifications, and unlock authorized contacts after donor acceptance.
              </p>
            </div>

            {/* Request Lifecycle Stepper */}
            <RequestLifecycle {...lifecycleStates} />

            {/* Request Command Header (with subtle desktop cursor illumination) */}
            <GlowSurface variant="elevated" className="rounded-2xl sm:rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                    Active Blood Requirement
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-500">
                      {request.bloodGroup}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {request.component}
                    </span>
                    <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                      ({request.unitsNeeded} {request.unitsNeeded === 1 ? 'Unit' : 'Units'})
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Status: {request.status === 'open' ? 'Active Requirement' : request.status.toUpperCase()}
                  </span>
                  {getUrgencyBadge(request.urgency)}
                  {canEditRequest ? (
                    <Link
                      href="/requests/new?mode=edit"
                      id="edit-request-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/80 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
                      title="Edit this active blood requirement"
                    >
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                      <span>Edit Request</span>
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100/60 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-800"
                      title="Request editing is locked once a donor accepts or contact reveal is initiated to maintain coordination integrity"
                    >
                      <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-left">
                <div>
                  <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    District
                  </span>
                  <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    {request.districtName || request.districtId}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Approximate Area
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {request.approximateArea}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Hospital / Facility
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {request.hospitalName}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                    Required By
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatDateTime(request.requiredByDate, request.requiredByTime)}
                  </span>
                </div>
              </div>
            </GlowSurface>

            {/* Matching Engine States */}
            {isLoading && (
              <Card variant="default" className="p-8 sm:p-12 text-center relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7 text-rose-600 dark:text-rose-500 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white mb-2">
                  Evaluating district matches...
                </h2>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Evaluating blood-group compatibility, district locality, and the 120-day donation interval rule.
                </p>

                <div className="mt-6 space-y-3 max-w-md mx-auto">
                  <div className="h-16 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 animate-pulse" />
                  <div className="h-16 rounded-2xl bg-neutral-100/40 dark:bg-neutral-800/40 animate-pulse" />
                </div>
              </Card>
            )}

            {!isLoading && matchState?.status === 'zero_matches' && (
              <Card variant="default" className="p-8 sm:p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-neutral-200/80 dark:border-neutral-700">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                  No Currently Eligible Donors Found
                </h2>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed mb-6">
                  Volunteer donors may be registered in this district, but none currently satisfy all preliminary matching constraints for this requirement.
                </p>

                {/* Clear, privacy-preserving explanation of preliminary exclusion criteria */}
                <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
                  <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/80 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      120-Day Donation Interval
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                      Donors who donated recently (&lt;120 days) or whose history is unrecorded are held in recovery to protect volunteer health.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/80 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      ABO/Rh Compatibility
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                      Matches strictly enforce medical compatibility for recipient blood group ({request?.bloodGroup ?? "requirement"}).
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/80 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      Volunteer Availability
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                      Donors marked as paused or temporarily unavailable are excluded from active matching dispatch.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/80 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      District &amp; Proximity
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                      Evaluates volunteer candidates within 5 km proximity radius or the designated hospital district.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    <span>Re-evaluate Matches</span>
                  </button>
                  {canEditRequest && (
                    <Link
                      href="/requests/new?mode=edit"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 font-semibold text-xs border border-neutral-200/80 dark:border-white/10 shadow-xs transition-all"
                    >
                      <span>Edit Request Details</span>
                    </Link>
                  )}
                </div>
              </Card>
            )}

            {!isLoading && matchState?.status === 'error' && (
              <Card variant="default" className="p-8 sm:p-10 text-center border-rose-200 dark:border-rose-900">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                  {matchState.errorCode === 'request_expired'
                    ? 'Blood Request Expired'
                    : 'Unable to find matches'}
                </h2>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed mb-6">
                  {matchState.message}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {matchState.errorCode === 'request_expired' ? (
                    <Link
                      href="/requests/new"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs"
                    >
                      Create New Request
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </Card>
            )}

            {!isLoading && matchState?.status === 'success' && (
              <div className="space-y-5">
                {/* Candidates List Header & Refresh Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
                      Eligible Donor Matches
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Evaluated against compatibility, 120-day donation interval policy, and locality.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 active:scale-[0.98] transition-all border border-neutral-300/80 dark:border-white/10 shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                      title="Check for updated donor responses and reveal status"
                    >
                      <svg
                        className={`w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 ${isLoading ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                      <span>Refresh Status</span>
                    </button>

                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 liquid-glass-pill shadow-xs">
                      {matchState.totalMatches} {matchState.totalMatches === 1 ? 'candidate' : 'candidates'}
                    </span>
                  </div>
                </div>

                {/* Candidate Cards */}
                <div className="space-y-3">
                  {matchState.matches.map((candidate: PublicMatchCandidate) => (
                    <CandidateCard
                      key={candidate.matchId}
                      candidate={candidate}
                      revealedContact={revealedContacts[candidate.matchId]}
                      isRevealing={revealingMatchId === candidate.matchId}
                      revealError={
                        revealError?.matchId === candidate.matchId
                          ? revealError.message
                          : null
                      }
                      onReveal={handleRevealContact}
                    />
                  ))}
                </div>

                {/* Step 3: Highly Visible Coordination Action Panel — Notify Eligible Donors */}
                {matchState.matches.length > 0 && (
                  <GlowSurface variant="elevated" className="rounded-2xl sm:rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-5 sm:p-7 shadow-sm mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                          In-App Notification Dispatch
                        </div>
                        <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                          Notify Eligible Donors
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Dispatches in-app notifications only to candidates permitted by notification delivery rules.
                        </p>
                      </div>

                      <div className="shrink-0">
                        {dispatchState.status === 'idle' && (
                          <button
                            type="button"
                            onClick={handleDispatch}
                            id="notify-eligible-donors-btn"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                          >
                            <svg
                              className="w-4 h-4 text-white/90"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                              />
                            </svg>
                            <span>Notify Eligible Donors</span>
                          </button>
                        )}

                        {dispatchState.status === 'dispatching' && (
                          <button
                            type="button"
                            disabled
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-400 text-white font-semibold text-xs sm:text-sm cursor-not-allowed opacity-80"
                          >
                            <svg
                              className="w-4 h-4 animate-spin text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Sending Notifications...</span>
                          </button>
                        )}

                        {dispatchState.status === 'success' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            <span>In-App Notifications Sent</span>
                          </div>
                        )}

                        {dispatchState.status === 'already_notified' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
                            <span>Already Notified</span>
                          </div>
                        )}

                        {dispatchState.status === 'zero_notifications' && (
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                            <span>0 Notifications Dispatched</span>
                          </div>
                        )}

                        {dispatchState.status === 'error' && (
                          <button
                            type="button"
                            onClick={handleDispatch}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                          >
                            Retry Dispatch
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Aggregate Outcome Display */}
                    {dispatchState.status === 'success' && (
                      <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        <div className="font-bold mb-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                          {dispatchState.count} eligible donor{dispatchState.count === 1 ? '' : 's'} notified
                        </div>
                        <p className="text-emerald-800/90 dark:text-emerald-300/80">
                          In-app notifications sent. Candidate donors have been alerted within their private inboxes. Contact details remain confidential until a donor explicitly accepts the request and contact is revealed.
                        </p>
                      </div>
                    )}

                    {/* Next-Step Guidance for Live Demo Flow */}
                    {(dispatchState.status === 'success' || dispatchState.status === 'already_notified') && (
                      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
                              →
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200">
                              Next Demo Step: Donor Response
                            </span>
                          </div>
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-lg">
                            Eligible donors have received in-app match alerts. Open the <strong>Donor Notifications</strong> inbox in another tab or window to accept or decline as the donor.
                          </p>
                          <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 font-medium">
                            After the donor accepts, return here and click <strong>Refresh Status</strong> to unlock authorized contact reveal.
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Link
                            href="/donors/notifications"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <span>Open Donor Inbox</span>
                            <svg className="w-3.5 h-3.5 text-white/70 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    )}

                    {dispatchState.status === 'zero_notifications' && (
                      <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <div className="font-bold mb-1">Notice: Zero notifications dispatched</div>
                        <p className="text-amber-800/90 dark:text-amber-300/80">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'already_notified' && (
                      <div className="mt-4 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        <div className="font-bold mb-1">Request Already Notified</div>
                        <p className="text-neutral-600 dark:text-neutral-400">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'error' && (
                      <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                        <div className="font-bold mb-1">Dispatch Error</div>
                        <p className="text-rose-700 dark:text-rose-300">{dispatchState.message}</p>
                      </div>
                    )}

                    {dispatchState.status === 'idle' && (
                      <div className="mt-3 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                          />
                        </svg>
                        <span>
                          In-app notification only. No external broadcasts. Donor phone numbers remain masked.
                        </span>
                      </div>
                    )}
                  </GlowSurface>
                )}
              </div>
            )}

            {/* Privacy Shield Card */}
            <Card variant="default" glow="subtle" className="p-5 sm:p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200/80 dark:border-neutral-700">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                    Contact details stay private
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                    Donor names and phone numbers remain masked during candidate matching and alert dispatch. Contact details are revealed only after a donor explicitly accepts and the requester clicks Reveal Contact.
                  </p>
                </div>
              </div>
            </Card>

            {/* Safety & Clinical Disclaimer */}
            <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed text-center sm:text-left flex items-start gap-3">
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
                Hemo Match supports donor discovery and coordination only. Final donor eligibility and transfusion compatibility are determined by qualified blood-bank or clinical personnel.
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/requests/new"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-neutral-50 dark:bg-[#171717] dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs sm:text-sm border border-neutral-200/90 dark:border-neutral-800 shadow-xs text-center transition-all"
              >
                Create Another Request
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-neutral-950 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 text-white font-semibold text-xs sm:text-sm shadow-xs text-center transition-all"
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
