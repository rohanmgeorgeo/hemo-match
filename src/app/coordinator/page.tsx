'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { GlowSurface } from '@/components/ui/GlowSurface';
import { Badge } from '@/components/ui/Badge';
import type {
  CoordinatorMetrics,
  CoordinatorOverviewApiResponse,
  CoordinatorRequestSummary,
} from '@/types/coordinator';

type FilterStatus = 'all' | 'active' | 'notified' | 'needs_attention' | 'fulfilled' | 'expired';

function formatRequiredByDate(requiredBy: string): string {
  try {
    const date = new Date(requiredBy);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return requiredBy;
  }
}

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState<CoordinatorOverviewApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const handleRefresh = () => {
    setIsLoading(true);
    setRetryTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isSubscribed = true;

    async function loadOverview() {
      try {
        const res = await fetch('/api/coordinator/overview', {
          cache: 'no-store',
        });
        const json: CoordinatorOverviewApiResponse | null = await res.json().catch(() => null);

        if (!isSubscribed) return;

        if (res.ok && json?.success) {
          setData(json);
          setError(null);
        } else {
          setError(json?.error || `Failed to load coordinator data (${res.status})`);
        }
      } catch (err) {
        if (!isSubscribed) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to coordinator service');
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      isSubscribed = false;
    };
  }, [retryTrigger]);

  const allRequests = data?.requests ?? [];

  // Client-side filtering across existing records
  const filteredRequests = allRequests.filter((req) => {
    // 1. Status Filter
    if (statusFilter === 'active') {
      if (!['active', 'matching'].includes(req.status)) return false;
    } else if (statusFilter === 'notified') {
      if (req.status !== 'notified') return false;
    } else if (statusFilter === 'needs_attention') {
      if (!req.needsAttention) return false;
    } else if (statusFilter === 'fulfilled') {
      if (req.status !== 'fulfilled') return false;
    } else if (statusFilter === 'expired') {
      if (req.status !== 'expired') return false;
    }

    // 2. Search Query (hospital, area, district, blood group)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesHospital = req.hospitalName.toLowerCase().includes(query);
      const matchesArea = req.approximateArea.toLowerCase().includes(query);
      const matchesDistrict = req.districtName.toLowerCase().includes(query);
      const matchesBloodGroup = req.bloodGroup.toLowerCase().includes(query);
      const matchesComponent = req.component.toLowerCase().includes(query);

      if (
        !matchesHospital &&
        !matchesArea &&
        !matchesDistrict &&
        !matchesBloodGroup &&
        !matchesComponent
      ) {
        return false;
      }
    }

    return true;
  });

  const metrics: CoordinatorMetrics = data?.metrics ?? {
    totalRequests: 0,
    activeRequests: 0,
    needsAttentionCount: 0,
    totalMatches: 0,
    totalNotified: 0,
    totalAccepted: 0,
    totalDeclined: 0,
    fulfilledRequests: 0,
  };

  return (
    <div className="min-h-screen bg-transparent text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors pb-24 md:pb-12">
      <AppHeader roleContext="overview" />

      <main className="relative flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Subtle ambient radial wash */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.16),rgba(59,130,246,0.03)_45%,transparent_70%)]" />
        </div>
        {/* Operations Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 liquid-glass-pill shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                Operations Workspace • Coordinator Overview
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100/90 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10 liquid-glass-pill shadow-xs">
                Read-Only MVP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
              Coordinator Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Live district blood request lifecycle, matching discovery, and donor response monitoring.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 active:scale-[0.98] transition-all border border-neutral-200/80 dark:border-white/10 shadow-xs cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            aria-label="Refresh dashboard data"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}
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
            <span>{isLoading ? 'Refreshing…' : 'Refresh State'}</span>
          </button>
        </div>

        {/* Top-Level Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Active Requests */}
          <GlowSurface variant="subtle" className="rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Active Requests
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-neutral-950 dark:text-white">
              {isLoading ? '…' : metrics.activeRequests}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              {metrics.totalRequests} total recorded
            </div>
          </GlowSurface>

          {/* Needs Attention */}
          <GlowSurface variant="subtle" className="rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Needs Attention
              </span>
              {metrics.needsAttentionCount > 0 ? (
                <span className="relative flex h-2 w-2" aria-label="Attention required">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 ring-2 ring-amber-400/40" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-amber-600 dark:text-amber-400">
              {isLoading ? '…' : metrics.needsAttentionCount}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Zero matches or awaiting responses
            </div>
          </GlowSurface>

          {/* Donor Acceptances */}
          <GlowSurface variant="subtle" className="rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Donor Acceptances
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-emerald-600 dark:text-emerald-400">
              {isLoading ? '…' : metrics.totalAccepted}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              From {metrics.totalNotified} notifications
            </div>
          </GlowSurface>

          {/* Fulfilled */}
          <GlowSurface variant="subtle" className="rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Fulfilled Requests
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-neutral-950 dark:text-white">
              {isLoading ? '…' : metrics.fulfilledRequests}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Successfully completed
            </div>
          </GlowSurface>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-4 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg
                className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by hospital, area, district, blood group…"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200/80 dark:border-white/10 liquid-glass text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'notified', label: 'Notified' },
                  { id: 'needs_attention', label: 'Needs Attention' },
                  { id: 'fulfilled', label: 'Fulfilled' },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'liquid-glass-pill text-neutral-950 dark:text-white font-bold shadow-xs border border-neutral-200/80 dark:border-white/10'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 border border-transparent font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <div>
              <p className="font-semibold">Unable to load coordinator operational data</p>
              <p className="mt-0.5 opacity-90">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-400 underline hover:no-underline cursor-pointer"
              >
                Retry request
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-neutral-200/80 dark:border-white/10 liquid-glass animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
                <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-8 w-full bg-neutral-100 dark:bg-neutral-800/40 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRequests.length === 0 && (
          <Card className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl liquid-glass-pill border border-neutral-200/80 dark:border-white/10 mx-auto flex items-center justify-center text-neutral-400 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
              {data?.requests.length === 0 ? 'No blood requests recorded yet' : 'No requests match your filter'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              {data?.requests.length === 0
                ? 'Blood requests created through the public intake form will appear here in real time with operational metrics.'
                : 'Try adjusting your search query or status filter to see other operational requests.'}
            </p>
            {data?.requests.length === 0 ? (
              <div className="pt-2">
                <Link
                  href="/requests/new"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs"
                >
                  Create a Blood Request
                </Link>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/10 shadow-xs transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Requests List */}
        {!isLoading && filteredRequests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
              <span>
                Showing {filteredRequests.length} request{filteredRequests.length > 1 ? 's' : ''}
              </span>
              <span>Sorted by latest creation</span>
            </div>

            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
          </div>
        )}

        {/* Footer Security / Architecture Notice */}
        <div className="pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60 text-center text-xs text-neutral-400 dark:text-neutral-500 space-y-1">
          <p>
            Coordinator Operations View • Read-only operational monitor backed by real database state.
          </p>
          <p className="text-[11px] opacity-80">
            Production deployment would require authenticated, authorized coordinator access.
          </p>
        </div>
      </main>
    </div>
  );
}

function RequestCard({ req }: { req: CoordinatorRequestSummary }) {
  const formattedRequiredBy = formatRequiredByDate(req.requiredBy);

  return (
    <Card className="p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
      <div className="space-y-3.5">
        {/* Top Header: Blood Group, Hospital, Status Badges */}
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            {/* Blood Group Badge */}
            <div className="w-10 h-10 rounded-xl liquid-glass-pill border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center font-bold text-base text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
              {req.bloodGroup}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                  {req.hospitalName}
                </h2>
                {req.hasCoordinates && (
                  <span
                    title="Request coordinates captured for ~5 km proximity matching"
                    className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-sky-50/90 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-900/60 font-semibold liquid-glass-pill shadow-xs"
                  >
                    GPS Proximity
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {req.approximateArea} • {req.districtName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Urgency Badge */}
            <Badge
              variant={
                req.urgency === 'critical' || req.urgency === 'urgent'
                  ? 'accent'
                  : 'neutral'
              }
              size="sm"
            >
              {req.urgency.toUpperCase()}
            </Badge>

            {/* Lifecycle Status Badge */}
            <StatusBadge status={req.status} />
          </div>
        </div>

        {/* Needs Attention Alert Pill (if applicable) */}
        {req.needsAttention && req.attentionReasons.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-500 shrink-0"
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
            <span className="font-semibold">Needs Attention:</span>
            <span>{req.attentionReasons.join(' • ')}</span>
          </div>
        )}

        {/* Middle: Request Specifications & Deadlines */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs border-t border-neutral-100 dark:border-neutral-800/60 text-neutral-600 dark:text-neutral-300">
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-medium">Component</span>
            <span className="font-medium">{req.component}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-medium">Quantity</span>
            <span className="font-medium">
              {req.unitsNeeded} unit{req.unitsNeeded > 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-medium">Required By</span>
            <span className="font-medium">{formattedRequiredBy}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-medium">Contact Reveal</span>
            <span className="font-medium">
              {req.isContactRevealed ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Revealed to Requester</span>
              ) : (
                <span className="text-neutral-400">Protected</span>
              )}
            </span>
          </div>
        </div>

        {/* Bottom Operational Pipeline Stats & Detail CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full liquid-glass-pill border border-neutral-200/70 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-medium text-[11px] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              {req.matchCount} candidate{req.matchCount === 1 ? '' : 's'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full liquid-glass-pill border border-neutral-200/70 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-medium text-[11px] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {req.notificationCount} notified
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full liquid-glass-pill border border-neutral-200/70 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-medium text-[11px] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {req.acceptedCount} accepted
            </span>

            {req.declinedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full liquid-glass-pill border border-neutral-200/70 dark:border-white/10 text-neutral-500 dark:text-neutral-400 font-medium text-[11px] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                {req.declinedCount} declined
              </span>
            )}
          </div>

          <Link
            href={`/coordinator/requests/${req.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors p-1"
          >
            <span>View Workflow Lifecycle</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: CoordinatorRequestSummary['status'] }) {
  switch (status) {
    case 'active':
    case 'open':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Active
        </span>
      );
    case 'notified':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Notified
        </span>
      );
    case 'fulfilled':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Fulfilled
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100/90 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border border-neutral-200/90 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          Expired
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100/90 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 border border-neutral-200/90 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {status}
        </span>
      );
  }
}
