'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { DonorProfile } from '@/types';
import type { PublicDonorNotification } from '@/lib/db/notifications';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

function getSnapshot(): string | null {
  return window.localStorage.getItem('hemo_match_demo_donor');
}

function getServerSnapshot(): string | null {
  return null;
}

export default function DonorNotificationsPage() {
  const storedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const profile = useMemo<DonorProfile | null>(() => {
    if (!storedJson) return null;
    try {
      return JSON.parse(storedJson) as DonorProfile;
    } catch {
      return null;
    }
  }, [storedJson]);

  const [fetchState, setFetchState] = useState<{
    donorId: string;
    retry: number;
    notifications: PublicDonorNotification[] | null;
    error: string | null;
  } | null>(null);

  const [retryTrigger, setRetryTrigger] = useState(0);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const donorId = profile?.id ?? null;

  const isLoading = Boolean(
    donorId &&
      (fetchState?.donorId !== donorId || fetchState?.retry !== retryTrigger)
  );

  const notifications =
    fetchState?.donorId === donorId && fetchState?.retry === retryTrigger
      ? fetchState.notifications
      : null;

  const error =
    fetchState?.donorId === donorId && fetchState?.retry === retryTrigger
      ? fetchState.error
      : null;

  // Fetch notifications for the authenticated/demo donor
  useEffect(() => {
    if (!donorId) {
      return;
    }

    let isSubscribed = true;

    async function fetchInbox() {
      try {
        const res = await fetch(
          `/api/donors/notifications?donorId=${encodeURIComponent(donorId!)}`
        );
        const json = await res.json().catch(() => null);

        if (!isSubscribed) return;

        if (res.ok && json?.success && Array.isArray(json.notifications)) {
          setFetchState({
            donorId: donorId!,
            retry: retryTrigger,
            notifications: json.notifications,
            error: null,
          });
        } else {
          setFetchState({
            donorId: donorId!,
            retry: retryTrigger,
            notifications: null,
            error:
              json?.message || 'Unable to load notifications at this time.',
          });
        }
      } catch {
        if (isSubscribed) {
          setFetchState({
            donorId: donorId!,
            retry: retryTrigger,
            notifications: null,
            error:
              'Network error. Please check your connection and try again.',
          });
        }
      }
    }

    void fetchInbox();

    return () => {
      isSubscribed = false;
    };
  }, [donorId, retryTrigger]);

  const handleMarkRead = async (notificationId: string) => {
    if (!donorId || markingReadId) return;

    setMarkingReadId(notificationId);
    try {
      const res = await fetch('/api/donors/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          donorId,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFetchState((prev) => {
          if (!prev || !prev.notifications) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === notificationId
                ? {
                    ...n,
                    status: 'read',
                    readAt: json.readAt || new Date().toISOString(),
                  }
                : n
            ),
          };
        });
      }
    } catch {
      // Keep existing state on error
    } finally {
      setMarkingReadId(null);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'Not specified';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => n.status !== 'read').length ?? 0;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900 pb-20">
      {/* Header */}
      <header className="w-full border-b border-neutral-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/donors/profile"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors py-2 pr-3 -ml-2 rounded-lg"
            >
              <svg
                className="w-4 h-4 text-neutral-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Profile
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Notifications Inbox
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Missing Profile State */}
        {!profile ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
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
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-950 mb-2">No Donor Identity Found</h1>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6 leading-relaxed">
              Register as a donor or view your donor profile to access your district blood match notifications inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/donors/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all shadow-xs"
              >
                Register as Donor
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs"
              >
                Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Donor Demo Identity Banner */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center shrink-0">
                  <span className="text-lg font-black text-rose-600">
                    {profile.bloodGroup}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900">
                    {profile.fullName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {profile.districtName || profile.districtId} {profile.approximateArea ? `• ${profile.approximateArea}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Notifications Active
                </span>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white rounded-3xl border border-neutral-200/80 p-10 text-center shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100 animate-pulse">
                  <svg
                    className="w-6 h-6 text-rose-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.75"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-600">Loading donor notifications...</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="bg-white rounded-3xl border border-rose-200/80 p-8 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-neutral-900 mb-1">Unable to Load Notifications</h2>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-5">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryTrigger((r) => r + 1)}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-all shadow-xs"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty Inbox State */}
            {!isLoading && !error && notifications && notifications.length === 0 && (
              <div className="bg-white rounded-3xl border border-neutral-200/80 p-10 sm:p-14 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
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
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-neutral-900 mb-2">Your Inbox is Empty</h2>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6 leading-relaxed">
                  You have no pending blood request notifications. When an urgent compatible request in your district matches your profile, it will appear here.
                </p>
                <Link
                  href="/donors/profile"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition-all shadow-xs"
                >
                  View Profile Settings
                </Link>
              </div>
            )}

            {/* Populated Notifications List */}
            {!isLoading && !error && notifications && notifications.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      Match Notifications
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Preliminary compatibility matches based on your district profile.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                    {notifications.length} Total
                  </span>
                </div>

                <div className="space-y-4">
                  {notifications.map((item) => {
                    const isUnread = item.status !== 'read';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-3xl border transition-all p-6 sm:p-7 shadow-xs ${
                          isUnread
                            ? 'bg-white border-rose-300 ring-1 ring-rose-200/60'
                            : 'bg-white/90 border-neutral-200/80 text-neutral-700'
                        }`}
                      >
                        {/* Notification Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center font-black text-rose-600 text-base shrink-0">
                              {item.bloodGroup}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900">
                                  Urgent Blood Match Required
                                </span>
                                {isUnread ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    NEW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                    READ
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-neutral-500 mt-0.5">
                                Received {formatDateTime(item.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                item.urgency === 'critical'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.urgency === 'critical' ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                                }`}
                              />
                              {item.urgency.toUpperCase()}
                            </span>

                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              {item.compatibilityType === 'homologous'
                                ? 'Exact ABO/Rh'
                                : 'Compatible Match'}
                            </span>
                          </div>
                        </div>

                        {/* Request Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs text-neutral-600">
                          <div>
                            <span className="block font-medium text-neutral-400 uppercase tracking-wider text-[10px] mb-0.5">
                              Component &amp; Units
                            </span>
                            <span className="font-semibold text-neutral-800 text-sm">
                              {item.component} • {item.unitsNeeded} {item.unitsNeeded === 1 ? 'Unit' : 'Units'}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 uppercase tracking-wider text-[10px] mb-0.5">
                              Hospital / Blood Centre
                            </span>
                            <span className="font-semibold text-neutral-800 text-sm">
                              {item.hospitalName}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 uppercase tracking-wider text-[10px] mb-0.5">
                              District &amp; Locality
                            </span>
                            <span className="font-semibold text-neutral-800">
                              {item.districtName} {item.approximateArea ? `(${item.approximateArea})` : ''}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 uppercase tracking-wider text-[10px] mb-0.5">
                              Required By
                            </span>
                            <span className="font-semibold text-neutral-800">
                              {formatDateTime(item.requiredBy)}
                            </span>
                          </div>
                        </div>

                        {/* Privacy Statement Card */}
                        <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 mb-4 flex items-center justify-between text-xs text-blue-900">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            <span className="font-medium">Your contact details are still private.</span>
                          </div>
                          <span className="text-[11px] text-blue-700/80 hidden sm:inline">
                            Masked by default
                          </span>
                        </div>

                        {/* Actions / Future Step Placeholder */}
                        <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {isUnread && (
                              <button
                                type="button"
                                disabled={markingReadId === item.id}
                                onClick={() => handleMarkRead(item.id)}
                                className="px-4 py-2 rounded-full bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold border border-neutral-200 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {markingReadId === item.id ? 'Marking...' : 'Mark as Read'}
                              </button>
                            )}

                            {item.readAt && (
                              <span className="text-[11px] text-neutral-400">
                                Read on {formatDateTime(item.readAt)}
                              </span>
                            )}
                          </div>

                          {/* Placeholder for Next Step (Accept/Decline) */}
                          <div className="w-full sm:w-auto text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200/80">
                              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              Response available in the next step
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                Hemo Match coordinates donor discovery and preliminary matching only. Final donor eligibility and transfusion compatibility are determined by qualified blood-bank or clinical personnel. Receiving a notification does not imply final medical approval to donate.
              </span>
            </div>

            {/* Navigation links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/donors/profile"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:shadow-sm text-center transition-all"
              >
                Donor Profile
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
