'use client';

import React, { useSyncExternalStore, useMemo } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
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

const AVAILABILITY_LABELS: Record<DonorProfile['availability'], { label: string; color: string; dot: string }> = {
  available: { label: 'Available', color: 'text-emerald-700', dot: 'bg-emerald-500' },
  temporarily_unavailable: { label: 'Temporarily Unavailable', color: 'text-amber-700', dot: 'bg-amber-500' },
  paused: { label: 'Paused', color: 'text-neutral-600', dot: 'bg-neutral-400' },
};

export default function DonorProfilePage() {
  const storedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#0B0B0C] text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-20">
      {/* Global App Header with Volunteer Donor Context */}
      <AppHeader roleContext="donor" backHref="/" backLabel="Home" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {!profile ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-10 sm:p-14 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">No Donor Profile Found</h2>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-7">
              Register as a donor to create your profile and be considered for future district blood requests.
            </p>
            <Link
              href="/donors/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all shadow-xs"
            >
              Register as Donor
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile Hero */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-rose-600">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold tracking-tight text-neutral-950 truncate">
                      {profile.fullName}
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/70">
                      {profile.bloodGroup}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span>{profile.districtName || profile.districtId}</span>
                    {profile.approximateArea && (
                      <>
                        <span>·</span>
                        <span>{profile.approximateArea}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Availability badge */}
                {(() => {
                  const avail = AVAILABILITY_LABELS[profile.availability];
                  return (
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        profile.availability === 'available'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : profile.availability === 'temporarily_unavailable'
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                        {avail.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Contact Privacy Card */}
            <div className="rounded-2xl bg-blue-50/60 border border-blue-200/80 p-4 sm:p-5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">Contact details protected</p>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  Your full phone number is not revealed to blood requesters during matching. Contact information
                  is only unlocked if you accept an urgent request and the requester explicitly performs an authorized contact reveal.
                  Final donor eligibility is determined by qualified blood-centre or clinical personnel.
                </p>
              </div>
            </div>

            {/* Profile Details Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <h2 className="text-sm font-semibold text-neutral-900 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Profile Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Blood Group</span>
                  <span className="text-xl font-black text-rose-600">{profile.bloodGroup}</span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">District</span>
                  <span className="text-sm font-semibold text-neutral-800">{profile.districtName || profile.districtId}</span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Approximate Area</span>
                  <span className="text-sm font-semibold text-neutral-800">{profile.approximateArea}</span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Last Donation Date</span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {formatDate(profile.lastDonationDate)}
                  </span>
                </div>

                {/* Masked phone */}
                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Phone Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-neutral-800 tracking-widest">
                      {maskPhone(profile.phoneNumber)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Private
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Notifications</span>
                  <span className={`text-sm font-semibold ${profile.notificationPreference === 'enabled' ? 'text-emerald-700' : 'text-neutral-500'}`}>
                    {profile.notificationPreference === 'enabled' ? '🔔 Enabled' : '🔕 Disabled'}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-neutral-100 mt-1">
                  <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Registered</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(profile.createdAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/donors/notifications"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm shadow-xs text-center transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                View Notifications
              </Link>
              <Link
                href="/donors/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:shadow-sm text-center transition-all"
              >
                Update Profile
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
