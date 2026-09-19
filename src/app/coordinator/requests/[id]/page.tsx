'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { GlowSurface } from '@/components/ui/GlowSurface';
import { Badge } from '@/components/ui/Badge';
import type {
  CoordinatorDetailApiResponse,
  CoordinatorRequestDetail,
} from '@/types/coordinator';

function formatDetailDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function CoordinatorRequestDetailPage() {
  const params = useParams();
  const requestId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [data, setData] = useState<CoordinatorRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const handleRetry = () => {
    setIsLoading(true);
    setRetryTrigger((r) => r + 1);
  };

  useEffect(() => {
    if (!requestId) return;
    let isSubscribed = true;

    async function loadDetail() {
      try {
        const res = await fetch(`/api/coordinator/requests/${requestId}`, {
          cache: 'no-store',
        });
        const json: CoordinatorDetailApiResponse | null = await res.json().catch(() => null);

        if (!isSubscribed) return;

        if (res.ok && json?.success && json.request) {
          setData(json.request);
          setError(null);
        } else {
          setError(
            json?.error ||
              (res.status === 404
                ? 'Blood request not found'
                : `Failed to load request details (${res.status})`)
          );
        }
      } catch (err) {
        if (!isSubscribed) return;
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isSubscribed = false;
    };
  }, [requestId, retryTrigger]);

  const formattedRequiredBy = formatDetailDate(data?.requiredBy);
  const formattedCreatedAt = formatDetailDate(data?.createdAt);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors pb-24 md:pb-12">
      <AppHeader roleContext="overview" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/coordinator"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Coordinator Operations</span>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-28 rounded-2xl bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 animate-pulse" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 mx-auto flex items-center justify-center text-rose-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Unable to load request lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              {error}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
              <Link
                href="/coordinator"
                className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </Card>
        )}

        {/* Content View */}
        {data && !isLoading && (
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center font-black text-xl text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
                    {data.bloodGroup}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-bold text-neutral-950 dark:text-white">
                        {data.hospitalName}
                      </h1>
                      {data.hasCoordinates ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60 font-semibold">
                          GPS Proximity Active (~5 km)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                          District Fallback
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {data.approximateArea} • {data.districtName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      data.urgency === 'critical' || data.urgency === 'urgent'
                        ? 'accent'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {data.urgency.toUpperCase()}
                  </Badge>
                  <DetailStatusBadge status={data.status} />
                </div>
              </div>

              {/* Needs Attention Warning */}
              {data.needsAttention && data.attentionReasons.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                  <div>
                    <span className="font-bold">Attention Required: </span>
                    <span>{data.attentionReasons.join(' • ')}</span>
                  </div>
                </div>
              )}

              {/* Request Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    Component
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {data.component}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    Units Needed
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {data.unitsNeeded} unit{data.unitsNeeded > 1 ? 's' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    Required By
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formattedRequiredBy}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    Created At
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formattedCreatedAt}
                  </span>
                </div>
              </div>

              {data.notes && (
                <div className="pt-2 text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-500 block text-[10px] uppercase">Notes:</span>
                  <p className="mt-0.5 italic">{data.notes}</p>
                </div>
              )}
            </Card>

            {/* Operational Pipeline Metrics (4 Stages) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <GlowSurface className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#141414]/70">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                  1. Discovery
                </span>
                <div className="text-xl font-bold mt-1 text-neutral-950 dark:text-white">
                  {data.matchCount} Match{data.matchCount === 1 ? '' : 'es'}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">Discovered candidates</p>
              </GlowSurface>

              <GlowSurface className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#141414]/70">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                  2. Dispatched
                </span>
                <div className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {data.notificationCount} Notified
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">In-app notifications sent</p>
              </GlowSurface>

              <GlowSurface className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#141414]/70">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                  3. Responses
                </span>
                <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {data.acceptedCount} Accepted
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {data.declinedCount} declined
                </p>
              </GlowSurface>

              <GlowSurface className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#141414]/70">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                  4. Privacy Reveal
                </span>
                <div className="text-xl font-bold mt-1 text-neutral-950 dark:text-white">
                  {data.isContactRevealed ? 'Revealed' : 'Locked'}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {data.isContactRevealed ? 'Requester unmasked' : 'Protected'}
                </p>
              </GlowSurface>
            </div>

            {/* Candidate Matching Roster (Strictly Anonymized) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                    Candidate Roster ({data.candidates.length})
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Privacy-safe operational view. Phone numbers and coordinates are never exposed.
                  </p>
                </div>
              </div>

              {data.candidates.length === 0 ? (
                <Card className="p-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  No candidate donors have been matched for this request yet.
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {data.candidates.map((cand) => (
                    <Card key={cand.matchId} className="p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                            {cand.bloodGroup}
                          </div>
                          <div>
                            <span className="font-mono text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white">
                              {cand.anonymizedDonorId}
                            </span>
                            <span className="text-xs text-neutral-500 block">
                              Area: {cand.approximateArea}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {/* Match status */}
                          <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                            Match: {cand.matchStatus}
                          </span>

                          {/* Response status */}
                          {cand.responseStatus === 'accepted' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 font-semibold">
                              ✓ Accepted
                            </span>
                          )}
                          {cand.responseStatus === 'declined' && (
                            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium">
                              Declined
                            </span>
                          )}
                          {!cand.responseStatus && (
                            <span className="px-2 py-0.5 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-400 font-medium">
                              Awaiting response
                            </span>
                          )}

                          {/* Contact reveal status */}
                          {cand.isContactRevealed && (
                            <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60 font-semibold">
                              Contact Unmasked by Requester
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                Operational Lifecycle Timeline
              </h2>

              <Card className="p-5">
                {data.timeline.length === 0 ? (
                  <p className="text-xs text-neutral-500">No lifecycle events recorded yet.</p>
                ) : (
                  <div className="relative border-l-2 border-neutral-200 dark:border-neutral-800 ml-3 space-y-6 py-2">
                    {data.timeline.map((event, idx) => (
                      <div key={idx} className="relative pl-6">
                        {/* Dot indicator */}
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#141414] bg-rose-500" />
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <span className="font-semibold text-xs sm:text-sm text-neutral-950 dark:text-white">
                            {event.label}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            • {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {event.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Privacy Assurance Banner */}
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-900/30 text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                Coordinator Privacy & Authorization Guarantee
              </span>
              <p>
                Donor contact details (phone number, email, and exact coordinates) are never projected to coordinator views.
                Contact reveal is an explicit, audited action initiated solely by the verified requester for accepted donors.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailStatusBadge({ status }: { status: CoordinatorRequestDetail['status'] }) {
  switch (status) {
    case 'active':
    case 'open':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Active
        </span>
      );
    case 'notified':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Notified
        </span>
      );
    case 'fulfilled':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Fulfilled
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          Expired
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-300 dark:border-neutral-700">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {status}
        </span>
      );
  }
}
