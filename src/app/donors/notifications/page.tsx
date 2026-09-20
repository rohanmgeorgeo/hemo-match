'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
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
  const [submittingResponseId, setSubmittingResponseId] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<{ notificationId: string; message: string } | null>(null);
  const [activeModal, setActiveModal] = useState<{
    notification: PublicDonorNotification;
    action: 'accepted' | 'declined';
  } | null>(null);

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

  // Fetch notifications for the demo donor
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

  const handleConfirmResponse = async () => {
    if (!donorId || !activeModal || submittingResponseId) return;

    const { notification, action } = activeModal;
    setSubmittingResponseId(notification.id);
    setResponseError(null);

    try {
      const res = await fetch('/api/donors/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId,
          notificationId: notification.id,
          response: action,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        // Update local state to reflect response and read status
        setFetchState((prev) => {
          if (!prev || !prev.notifications) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === notification.id
                ? {
                    ...n,
                    response: action,
                    status: 'read',
                    readAt: n.readAt || new Date().toISOString(),
                  }
                : n
            ),
          };
        });
        setActiveModal(null);
      } else {
        setResponseError({
          notificationId: notification.id,
          message: json?.message || 'Unable to record response. Please try again.',
        });
      }
    } catch {
      setResponseError({
        notificationId: notification.id,
        message: 'Network error. Please verify your connection and try again.',
      });
    } finally {
      setSubmittingResponseId(null);
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
    <div className="min-h-screen bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      {/* Global App Header */}
      <AppHeader />

      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Subtle ambient emerald/crimson radial wash */}
        <div
          className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.15),rgba(225,29,72,0.04)_50%,transparent_70%)]" />
        </div>
        {/* Missing Profile State */}
        {!profile ? (
          <Card variant="default" className="p-8 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
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
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">No Donor Identity Found</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Register as a donor or view your donor profile to access your district blood match notifications inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/donors/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-xs"
              >
                Register as Donor
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header & Inbox Context Card */}
            <Card variant="default" glow="elevated" className="p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    Volunteer Donor Workspace
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                    Incoming Blood Requests
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Matching your registered blood group ({profile.bloodGroup}) and district ({profile.districtName || profile.districtId}).
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRetryTrigger((prev) => prev + 1)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#171717] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/90 dark:border-neutral-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ${isLoading ? 'animate-spin' : ''}`}
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
                    <span>Refresh Inbox</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Content States */}
            {isLoading ? (
              <Card variant="default" className="p-12 text-center shadow-xs">
                <div className="inline-block w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  Checking for incoming match alerts...
                </p>
              </Card>
            ) : error ? (
              <Card variant="default" className="p-8 text-center shadow-xs border-rose-200 dark:border-rose-900">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center mx-auto mb-3 text-rose-600 dark:text-rose-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-1">Failed to Load Inbox</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Retry
                </button>
              </Card>
            ) : notifications && notifications.length === 0 ? (
              <Card variant="default" className="p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-1">Your Inbox is Clear</h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  No blood requests currently require matching for your blood group and district. You will be notified in-app as soon as a compatible need arises.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRetryTrigger((prev) => prev + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Check for Updates
                  </button>
                  <Link
                    href="/donors/profile"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white hover:bg-neutral-50 dark:bg-[#171717] dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs border border-neutral-200 dark:border-neutral-700 shadow-xs transition-colors"
                  >
                    View Donor Profile
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Incoming Match Requests ({notifications?.length ?? 0})
                  </h2>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {unreadCount} Unread
                  </span>
                </div>

                <div className="space-y-4">
                  {notifications?.map((item) => {
                    const isUnread = item.status !== 'read';

                    return (
                      <Card
                        key={item.id}
                        variant="default"
                        glow="subtle"
                        className={`transition-all p-5 sm:p-6 shadow-xs ${
                          isUnread
                            ? 'border-rose-300/90 dark:border-rose-800 ring-1 ring-rose-100 dark:ring-rose-950/40'
                            : 'border-neutral-200/80 dark:border-neutral-800'
                        }`}
                      >
                        {/* Notification Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl liquid-glass-pill border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center font-black text-rose-600 dark:text-rose-400 text-base shrink-0 shadow-xs">
                              {item.bloodGroup}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                                  Urgent Blood Match Required
                                </span>
                                {isUnread ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    NEW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                    READ
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                Received {formatDateTime(item.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                item.urgency === 'critical'
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.urgency === 'critical' ? 'bg-rose-600 dark:bg-rose-400' : 'bg-amber-500 dark:bg-amber-400'
                                }`}
                              />
                              {item.urgency.toUpperCase()}
                            </span>

                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {item.compatibilityType === 'homologous'
                                ? 'Exact ABO/Rh'
                                : 'Compatible Match'}
                            </span>
                          </div>
                        </div>

                        {/* Request Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs text-neutral-600 dark:text-neutral-400">
                          <div>
                            <span className="block font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px] mb-0.5">
                              Component &amp; Units
                            </span>
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                              {item.component} • {item.unitsNeeded} {item.unitsNeeded === 1 ? 'Unit' : 'Units'}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px] mb-0.5">
                              Hospital / Blood Centre
                            </span>
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                              {item.hospitalName}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px] mb-0.5">
                              District &amp; Locality
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {item.districtName} {item.approximateArea ? `(${item.approximateArea})` : ''}
                            </span>
                          </div>

                          <div>
                            <span className="block font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px] mb-0.5">
                              Required By
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {formatDateTime(item.requiredBy)}
                            </span>
                          </div>
                        </div>

                        {/* Privacy Statement Callout */}
                        <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 p-3 mb-4 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            <span className="font-medium">Your contact details are protected.</span>
                          </div>
                          <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 hidden sm:inline">
                            Masked until authorized reveal
                          </span>
                        </div>

                        {/* Error notice if response failed */}
                        {responseError?.notificationId === item.id && (
                          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
                            <span>{responseError.message}</span>
                            <button
                              type="button"
                              onClick={() => setResponseError(null)}
                              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 font-semibold cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {/* Response Status & Actions */}
                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {isUnread && (
                              <button
                                type="button"
                                disabled={markingReadId === item.id}
                                onClick={() => handleMarkRead(item.id)}
                                className="px-4 py-2 rounded-full bg-white dark:bg-[#171717] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {markingReadId === item.id ? 'Marking...' : 'Mark as Read'}
                              </button>
                            )}

                            {item.readAt && (
                              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                Read on {formatDateTime(item.readAt)}
                              </span>
                            )}
                          </div>

                          {/* Actionable Controls or Persisted Response State */}
                          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                            {item.response === 'accepted' ? (
                              <div className="flex flex-col sm:items-end gap-1">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                  <span>Request Accepted</span>
                                </div>
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 text-right">
                                  Your contact is still protected. The requester must explicitly reveal it before coordination details become visible.
                                </span>
                              </div>
                            ) : item.response === 'declined' ? (
                              <div className="flex flex-col sm:items-end gap-1">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                  <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                  <span>Request Declined</span>
                                </div>
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                  You opted out of this request. Contact details remain confidential.
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  type="button"
                                  disabled={submittingResponseId === item.id}
                                  onClick={() => setActiveModal({ notification: item, action: 'declined' })}
                                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-white dark:bg-[#171717] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200/90 dark:border-neutral-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                                >
                                  Decline
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingResponseId === item.id}
                                  onClick={() => setActiveModal({ notification: item, action: 'accepted' })}
                                  className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                                >
                                  Accept &amp; Volunteer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

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
                Hemo Match coordinates donor discovery and preliminary matching only. Final donor eligibility and transfusion compatibility are determined by qualified blood-bank or clinical personnel. Receiving an alert does not imply final medical approval to donate.
              </span>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-center pt-2">
              <Link
                href="/donors/profile"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-neutral-50 dark:bg-[#171717] dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs sm:text-sm border border-neutral-200/90 dark:border-neutral-800 shadow-xs hover:shadow-sm text-center transition-all"
              >
                Donor Profile
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Accept / Decline Confirmation Modal */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
        >
          <div className="liquid-glass-elevated specular-rim rounded-3xl border border-neutral-200/80 dark:border-white/10 max-w-md w-full p-6 shadow-2xl space-y-5 text-neutral-900 dark:text-neutral-100 animate-unmask">
            {activeModal.action === 'accepted' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="modal-title" className="text-base font-bold text-neutral-950 dark:text-white">
                      Accept this request?
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Voluntary donor participation confirmation</p>
                  </div>
                </div>

                <div className="liquid-glass rounded-2xl p-4 border border-neutral-200/80 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Request:</span>
                    <span className="font-bold">{activeModal.notification.unitsNeeded} unit(s) of {activeModal.notification.component} ({activeModal.notification.bloodGroup})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Hospital:</span>
                    <span className="font-semibold">{activeModal.notification.hospitalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Urgency:</span>
                    <span className="font-bold uppercase text-rose-600 dark:text-rose-400">{activeModal.notification.urgency}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed liquid-glass border border-neutral-200/70 dark:border-white/10 rounded-2xl p-4">
                  <p className="font-bold text-neutral-950 dark:text-neutral-100">
                    Important Safety &amp; Privacy Notice:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>You are confirming that you are available to coordinate for this blood request.</li>
                    <li>This is NOT a determination of final medical eligibility. Clinical qualification is performed by blood-centre personnel.</li>
                    <li>Your phone number remains protected after acceptance and can only be revealed if the requester explicitly authorizes coordination.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submittingResponseId !== null}
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200/80 dark:border-white/10 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingResponseId !== null}
                    onClick={handleConfirmResponse}
                    className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {submittingResponseId ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Confirm Acceptance</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-bold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="modal-title" className="text-base font-bold text-neutral-950 dark:text-white">
                      Decline Request
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Opt out of this emergency request</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  You are declining this blood request. Your decision is fully respected, and you will not receive further alerts for this match.
                </p>

                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 p-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Your contact details remain completely private and are never shared.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submittingResponseId !== null}
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 cursor-pointer disabled:opacity-50"
                  >
                    Keep in Inbox
                  </button>
                  <button
                    type="button"
                    disabled={submittingResponseId !== null}
                    onClick={handleConfirmResponse}
                    className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {submittingResponseId ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Declining...</span>
                      </>
                    ) : (
                      <span>Confirm Decline</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
