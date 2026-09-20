'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { GlowSurface } from '@/components/ui/GlowSurface';
import { useHasDonorProfile } from '@/lib/donor-state';

export default function HomePage() {
  const [activeStage, setActiveStage] = useState<'match' | 'accepted' | 'revealed'>('accepted');
  const hasDonorProfile = useHasDonorProfile();

  return (
    <div className="flex-1 flex flex-col justify-between bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200">
      {/* Global App Header */}
      <AppHeader />

      {/* Main Content Area */}
      <main className="relative flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        {/* Subtle ambient crimson radial wash behind hero */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.16),rgba(225,29,72,0.03)_45%,transparent_70%)]" />
        </div>
        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3 py-1 text-xs font-semibold text-rose-800 dark:text-rose-300 mb-4 liquid-glass-pill shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            District blood donor matching
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-tight text-neutral-950 dark:text-white leading-[1.2] mb-3">
            Rapid blood matching,<br className="hidden sm:inline" />{' '}
            <span className="text-rose-600 dark:text-rose-500">protected by design.</span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6 font-normal max-w-xl mx-auto">
            Hemo Match privately coordinates district donors and protects contact numbers
            until voluntary donor acceptance and explicit requester authorization.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/requests/new"
              id="request-blood-btn"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-white/90"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Request Blood</span>
            </Link>

            <Link
              href={hasDonorProfile ? "/donors/notifications" : "/donors/register"}
              id="donor-notifications-btn"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 active:scale-[0.98] text-neutral-900 dark:text-neutral-100 font-semibold text-xs sm:text-sm border border-neutral-200/80 dark:border-white/10 shadow-xs hover:shadow-xs transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-neutral-700 dark:text-neutral-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                {hasDonorProfile ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5 0-3.309 3.428-7.697 6.54-11.233a1.25 1.25 0 0 1 1.92 0C16.072 6.303 19.5 10.691 19.5 14c0 4.142-3.358 7.5-7.5 7.5z"
                  />
                )}
              </svg>
              <span>{hasDonorProfile ? 'Donor Inbox' : 'Become a Donor'}</span>
            </Link>
          </div>
        </section>

        {/* Signature Privacy Architecture Showcase (Desktop Cursor Reactive) */}
        <section aria-label="Signature Privacy Architecture Showcase" className="mb-14">
          <GlowSurface variant="elevated" className="rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Signature Coordination Flow
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white mt-1">
                  Protected Contact Coordination Mechanism
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  How Hemo Match eliminates public broadcasts and keeps donor phone numbers locked until voluntary acceptance.
                </p>
              </div>

              {/* Interactive Stage Selector */}
              <div
                role="tablist"
                aria-label="Demonstration Stages"
                className="flex items-center gap-1.5 p-1 bg-neutral-200/60 dark:bg-neutral-800/80 rounded-full shrink-0 border border-neutral-200/60 dark:border-neutral-700/60"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStage === 'match'}
                  onClick={() => setActiveStage('match')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeStage === 'match'
                      ? 'liquid-glass-pill text-neutral-950 dark:text-white font-bold shadow-xs border border-white/80 dark:border-white/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-700/40 font-medium'
                  }`}
                >
                  1. Discovery
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStage === 'accepted'}
                  onClick={() => setActiveStage('accepted')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeStage === 'accepted'
                      ? 'liquid-glass-pill text-neutral-950 dark:text-white font-bold shadow-xs border border-white/80 dark:border-white/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-700/40 font-medium'
                  }`}
                >
                  2. Accepted (Locked)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStage === 'revealed'}
                  onClick={() => setActiveStage('revealed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeStage === 'revealed'
                      ? 'liquid-glass-pill text-neutral-950 dark:text-white font-bold shadow-xs border border-white/80 dark:border-white/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-700/40 font-medium'
                  }`}
                >
                  3. Explicit Reveal
                </button>
              </div>
            </div>

            {/* Visual Architecture Demonstration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-center">
              {/* Left explanation of current stage */}
              <div className="lg:col-span-6 space-y-4">
                {activeStage === 'match' && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                      Stage 1: Algorithmic Discovery
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Candidates Matched Anonymously
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Compatible donors in the same district are evaluated against blood group compatibility
                      and the 120-day donation interval. Previews display only anonymized identifiers like <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Donor •••• 9B4F</code>. Phone numbers are never exposed.
                    </p>
                    <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                        Zero broadcast SMS or public phone group alerts
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                        Anonymized candidate listings visible to requester
                      </li>
                    </ul>
                  </div>
                )}

                {activeStage === 'accepted' && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Stage 2: Acceptance Without Exposure
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Donor Confirms Availability — Contact Stays Protected
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      When a notified donor confirms availability, their response is securely recorded with database atomicity. Crucially, acceptance alone does <strong>not</strong> disclose their phone number. The record remains strictly locked.
                    </p>
                    <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        Phone number remains masked (<code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">••••••••••</code>)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        Requires deliberate requester action to authorize coordination
                      </li>
                    </ul>
                  </div>
                )}

                {activeStage === 'revealed' && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      Stage 3: Minimum Authorized Reveal
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Deliberate Requester Unlock for Hospital Coordination
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Only when the requester explicitly clicks Reveal Contact does the atomic authorization RPC execute. It unlocks strictly the minimum necessary coordination details (donor name and phone number) with zero PII audit logging.
                    </p>
                    <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        Direct one-touch call button for blood bank coordination
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        No address, coordinates, email, or health history ever released
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Right interactive representation card */}
              <div className="lg:col-span-6">
                <div className="p-5 rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 transition-all">
                  {/* Card Header Preview */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-500 font-black text-sm flex items-center justify-center">
                        O+
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                          {activeStage === 'revealed' ? 'Kavita M.' : 'Donor •••• 4A8F'}
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          Ernakulam • Kaloor East
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Exact ABO/Rh
                    </span>
                  </div>

                  {/* Dynamic Reveal Simulation State */}
                  <div className="mt-4 pt-1">
                    {activeStage === 'match' && (
                      <div className="p-3.5 rounded-xl liquid-glass border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400 dark:text-neutral-500 font-medium">Contact:</span>
                          <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px] text-neutral-600 dark:text-neutral-400 font-semibold tracking-widest">
                            ••••••••••
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          Candidate Discovered
                        </span>
                      </div>
                    )}

                    {activeStage === 'accepted' && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Donor Accepted</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100/90 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800">
                            Locked State
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="inline-flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-widest border border-neutral-300/70 dark:border-neutral-700">
                            <svg className="w-3 h-3 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            ••••••••••
                          </span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 rounded-full shadow-2xs">
                            Reveal Contact →
                          </span>
                        </div>
                      </div>
                    )}

                    {activeStage === 'revealed' && (
                      <div className="p-3.5 rounded-xl liquid-glass-emerald border border-emerald-300/90 dark:border-emerald-800/80 space-y-2 animate-unmask">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-950 dark:text-emerald-200 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Contact Unlocked</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                            Authorized
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-mono font-bold text-neutral-950 dark:text-white text-sm">
                            +91 98765 43210
                          </span>
                          <span className="text-xs font-bold text-white bg-emerald-600 px-3 py-1 rounded-full shadow-xs">
                            Call Donor
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlowSurface>
        </section>

        {/* Role Launchpad: Requester vs Donor Distinction */}
        <section aria-label="Role Pathways" className="mb-14">
          <div className="text-center mb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Two-Role Coordination Pathways
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Requester Role Card */}
            <GlowSurface variant="elevated" className="rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                    Requester Workspace
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                    Phase 1
                  </span>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-1">
                  Request Blood
                </h2>
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2.5">
                  Create Request → Match → Notify → Coordinate
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-normal">
                  Submit an urgent district blood requirement, evaluate compatible candidate donors
                  in your district, and dispatch targeted in-app alerts without broadcasting contact details.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <Link
                  href="/requests/new"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>Start Blood Request</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                <Link
                  href="/requests/matching-demo"
                  className="w-full inline-flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                >
                  View active matching dashboard →
                </Link>
              </div>
            </GlowSurface>

            {/* Donor Role Card */}
            <GlowSurface variant="elevated" className="rounded-3xl liquid-glass-elevated border border-neutral-200/80 dark:border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    Volunteer Donor Workspace
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    Phase 2
                  </span>
                </div>

                <h2 className="text-lg font-bold text-neutral-950 dark:text-white mb-1">
                  Volunteer Responses
                </h2>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5">
                  Receive Relevant Request → Review → Accept / Decline
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-normal">
                  Receive relevant match notifications in your district inbox. Review clinical urgency
                  and volunteer safely while your phone number stays protected.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <Link
                  href={hasDonorProfile ? "/donors/notifications" : "/donors/register"}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 dark:text-white text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>{hasDonorProfile ? 'Open Donor Inbox' : 'Become a Volunteer Donor'}</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                <Link
                  href={hasDonorProfile ? "/donors/profile" : "/donors/notifications"}
                  id="find-donors-btn"
                  className="w-full inline-flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-medium py-1 transition-colors"
                >
                  {hasDonorProfile ? 'View volunteer donor profile →' : 'Already registered? Open Inbox →'}
                </Link>
              </div>
            </GlowSurface>
          </div>
        </section>

        {/* Product Principles: Grouped Clean Surface (Reduces Card Clutter) */}
        <section aria-label="Core Coordination Principles" className="mb-12">
          <GlowSurface variant="subtle" className="rounded-3xl liquid-glass border border-neutral-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Domain Principles
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-950 dark:text-white mt-0.5">
                Engineered for Clinical &amp; Privacy Integrity
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-neutral-100 dark:divide-neutral-800">
              {/* Pillar 1 */}
              <div className="pt-4 md:pt-0 md:pr-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-3">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-rose-600 dark:text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.75"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 mb-1">
                  District Boundary
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">
                  District-Level Scope
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                  Matches eligible donors within the same administrative district, ensuring locality
                  relevance without requiring live GPS or continuous personal location tracking.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="pt-6 md:pt-0 md:px-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-3">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-rose-600 dark:text-rose-400"
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
                <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 mb-1">
                  Donor Wellbeing
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">
                  120-Day Matching Policy
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                  Applies Hemo Match&apos;s conservative 120-day application matching policy for this MVP. Final donor eligibility is determined by qualified blood-bank/clinical personnel.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="pt-6 md:pt-0 md:pl-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-3">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-rose-600 dark:text-rose-400"
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
                <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 mb-1">
                  Privacy First
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">
                  Protected Contact Reveal
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                  Donor phone numbers stay locked after matching and acceptance. Minimum contact is unlocked only when the requester explicitly initiates reveal.
                </p>
              </div>
            </div>
          </GlowSurface>
        </section>

        {/* Clinical Disclaimer Callout */}
        <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed text-center sm:text-left flex items-start gap-3">
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
            Hemo Match is an emergency coordination tool for preliminary donor discovery. Final donor eligibility,
            cross-matching, and transfusion compatibility must be confirmed by qualified blood-bank or hospital personnel.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-[#121214] py-6 pb-24 md:pb-6 transition-colors mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Hemo Match</span>
            <span>•</span>
            <span>District Blood Donor Matching</span>
          </div>
          <div className="text-neutral-400 dark:text-neutral-500">
            Privacy-First Preliminary District Blood Donor Discovery
          </div>
        </div>
      </footer>
    </div>
  );
}
