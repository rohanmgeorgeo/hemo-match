'use client';

import React, { useSyncExternalStore, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { notifyDonorUpdated } from '@/lib/donor-state';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { GlowSurface } from '@/components/ui/GlowSurface';
import type { DonorProfile } from '@/types';

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

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••••••';
  const visible = digits.slice(-4);
  return `••••••${visible}`;
}

const AVAILABILITY_LABELS: Record<
  DonorProfile['availability'],
  { label: string; color: string; dot: string }
> = {
  available: { label: 'Available', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  temporarily_unavailable: { label: 'Temporarily Unavailable', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  paused: { label: 'Paused', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700', dot: 'bg-neutral-400' },
};

export default function DonorProfilePage() {
  const router = useRouter();
  const storedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleExitDonorMode = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('hemo_match_demo_donor');
    notifyDonorUpdated();
    router.push('/');
  };



  const profile = useMemo<DonorProfile | null>(() => {
    if (!storedJson) return null;
    try {
      return JSON.parse(storedJson) as DonorProfile;
    } catch {
      return null;
    }
  }, [storedJson]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not provided';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const lastDonationDate = profile?.lastDonationDate;

  // Safe evaluation of 120-day interval
  const intervalStatus = useMemo(() => {
    if (!lastDonationDate) {
      return {
        known: false,
        satisfied: false,
        message: 'Donation history unknown — excluded from preliminary matching under current application policy.',
      };
    }

    try {
      const lastDate = new Date(lastDonationDate + 'T00:00:00');
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 120) {
        return {
          known: true,
          satisfied: true,
          diffDays,
          message: `120-day matching interval satisfied (${diffDays} days since last donation).`,
        };
      } else {
        return {
          known: true,
          satisfied: false,
          diffDays,
          message: `Preliminary matching interval not yet satisfied (${diffDays} of 120 days).`,
        };
      }
    } catch {
      return {
        known: false,
        satisfied: false,
        message: 'Unable to calculate donation interval.',
      };
    }
  }, [lastDonationDate]);

  return (
    <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      {/* Global App Header */}
      <AppHeader />

      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 page-enter">
        {/* Subtle ambient emerald radial wash */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.16),rgba(16,185,129,0.03)_45%,transparent_70%)]" />
        </div>
        {!profile ? (
          /* Empty State */
          <Card variant="default" className="p-10 sm:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">No Donor Profile Found</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Register as a volunteer donor to create your profile and be considered for future district blood requests.
            </p>
            <Link
              href="/donors/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-xs"
            >
              Register as Donor
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header / Intro */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-900/60 liquid-glass-pill shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  Volunteer Donor Workspace • Profile Card
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                Volunteer Donor Profile
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Your volunteer identity is used for preliminary district matching. Contact details remain confidential.
              </p>
            </div>

            {/* Legacy Missing Date Notice */}
            {!profile.lastDonationDate && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Last donation date required
                    </h3>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      Add your last donation date to participate in preliminary donor matching.
                    </p>
                  </div>
                </div>
                <Link
                  href="/donors/profile/edit"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  Update Profile
                </Link>
              </div>
            )}

            {/* Profile Hero Card */}
            <GlowSurface variant="elevated" className="rounded-2xl sm:rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Blood Group Avatar — Strongest Identifier */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl liquid-glass-pill border border-rose-200/80 dark:border-rose-900/60 flex flex-col items-center justify-center shrink-0 shadow-xs">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-500">
                    {profile.bloodGroup}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400 -mt-1">
                    Blood
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white truncate">
                      {profile.fullName}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {profile.districtName || profile.districtId}
                    </span>
                    {profile.approximateArea && (
                      <>
                        <span>•</span>
                        <span>{profile.approximateArea}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Availability Badge */}
                {(() => {
                  const avail = AVAILABILITY_LABELS[profile.availability];
                  return (
                    <div className="shrink-0 self-start sm:self-center">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border liquid-glass-pill shadow-xs ${avail.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                        {avail.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </GlowSurface>

            {/* Profile Attributes & 120-Day Policy Card */}
            <Card variant="default" glow="default" className="p-6 sm:p-7 shadow-xs">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-5 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                Coordination &amp; Recovery Attributes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <span className="block text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Blood Group
                  </span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-500">
                    {profile.bloodGroup}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    District Locality
                  </span>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">
                      {profile.districtName || profile.districtId}
                    </span>
                    {profile.locationLatitude != null && profile.locationLongitude != null && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Location available for private nearby matching
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    Last Recorded Donation
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatDate(profile.lastDonationDate)}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                    In-App Notifications
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-block ${
                    profile.notificationPreference === 'enabled'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                  }`}>
                    {profile.notificationPreference === 'enabled' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {/* 120-Day Policy Evaluation */}
                <div className="sm:col-span-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  <span className="block text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    120-Day Application Recovery Interval
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {intervalStatus.known ? (
                      intervalStatus.satisfied ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          120-day matching interval satisfied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Preliminary matching interval not yet satisfied
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                        Donation history unknown
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {intervalStatus.message} This is preliminary application matching logic only; final medical qualification is confirmed by clinical personnel at the blood center.
                  </p>
                </div>
              </div>
            </Card>

            {/* Privacy Protection Card */}
            <Card variant="default" glow="subtle" className="p-6 sm:p-7 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200/80 dark:border-neutral-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>

                <div className="space-y-2 flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Structured Contact Protection
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 tracking-widest">
                        {maskPhone(profile.phoneNumber)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        Masked
                      </span>
                    </div>
                  </div>

                  <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 pt-1">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-neutral-400" />
                      Contact details stay hidden during preliminary candidate discovery.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-neutral-400" />
                      Contact details stay hidden when match notifications are dispatched.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-neutral-400" />
                      Contact remains protected immediately after you accept a request.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-neutral-400" />
                      The requester must explicitly authorize contact reveal for final coordination.
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/donors/notifications"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-xs text-center transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <span>Donor Notifications Inbox</span>
              </Link>
              <Link
                href="/donors/profile/edit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 font-semibold text-xs sm:text-sm border border-neutral-200/80 dark:border-white/10 shadow-xs text-center transition-all cursor-pointer"
              >
                Update Profile
              </Link>
              <button
                type="button"
                onClick={handleExitDonorMode}
                title="Exit volunteer donor mode on this browser for this demo"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-semibold text-xs sm:text-sm border border-neutral-200/80 dark:border-white/10 shadow-xs text-center transition-all cursor-pointer"
              >
                Exit Donor Mode
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
