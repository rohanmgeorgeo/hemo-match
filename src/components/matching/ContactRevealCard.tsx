'use client';

import React, { useState } from 'react';
import type { MatchStatus } from '@/types/matches';

export interface RevealedContactInfo {
  name: string;
  phone: string;
}

export interface ContactRevealCardProps {
  matchId: string;
  candidateStatus?: MatchStatus;
  revealedContact?: RevealedContactInfo;
  isRevealing: boolean;
  revealError?: string | null;
  onReveal: (matchId: string) => void;
  className?: string;
}

export function ContactRevealCard({
  matchId,
  candidateStatus,
  revealedContact,
  isRevealing,
  revealError,
  onReveal,
  className = '',
}: ContactRevealCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!revealedContact?.phone) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(revealedContact.phone);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: clipboard permission denied or unavailable
    }
  };

  // State C: Authorized Reveal
  if (revealedContact) {
    return (
      <div
        className={`mt-4 p-4 sm:p-5 rounded-2xl liquid-glass-emerald border border-emerald-300/90 dark:border-emerald-700/80 shadow-xs transition-all animate-unmask specular-rim ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200/80 dark:border-emerald-800/60 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200">
            <div className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span>Contact Unlocked for Coordination</span>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide text-emerald-800 dark:text-emerald-300 liquid-glass-pill border border-emerald-300/80 dark:border-emerald-700/80">
            Authorized Reveal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] block font-medium mb-1">
              Donor Name
            </span>
            <span className="font-bold text-neutral-950 dark:text-neutral-100 text-base">
              {revealedContact.name}
            </span>
          </div>

          <div>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] block font-medium mb-1">
              Authorized Phone
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-base tabular-nums font-mono">
                {revealedContact.phone}
              </span>

              <a
                href={`tel:${revealedContact.phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]"
                aria-label={`Call donor at ${revealedContact.phone}`}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <span>Call</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-full text-xs font-semibold liquid-glass-pill hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700/80 transition-colors cursor-pointer"
                title="Copy phone number"
                aria-label="Copy phone number"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-900/90 dark:text-emerald-300/80 leading-relaxed">
          Minimum donor contact revealed after authorized requester action. Final clinical qualification occurs at the blood center.
        </div>
      </div>
    );
  }

  // State B: Accepted but Locked (The crucial privacy proof)
  if (candidateStatus === 'accepted') {
    return (
      <div
        className={`mt-4 p-4 sm:p-5 rounded-2xl liquid-glass border border-amber-300/80 dark:border-amber-700/60 shadow-xs transition-all ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Donor Accepted Request • Coordination Authorized</span>
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 flex-wrap">
              <span className="font-sans text-neutral-700 dark:text-neutral-300 font-medium">Phone:</span>
              <span className="inline-flex items-center gap-1.5 liquid-glass-pill text-neutral-800 dark:text-neutral-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-widest border border-neutral-300/70 dark:border-white/10">
                <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                ••••••••••
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-sans font-semibold bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300/70 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                Protected Until Explicit Reveal
              </span>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed max-w-lg">
              Donor accepted. Contact remains strictly protected. Click Reveal Contact below to authorize coordination.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onReveal(matchId)}
              disabled={isRevealing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:border dark:border-neutral-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs hover:shadow ring-2 ring-emerald-600/30 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 group"
            >
              {isRevealing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Authorizing Reveal...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 text-emerald-400 dark:text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  <span>Reveal Contact</span>
                </>
              )}
            </button>
          </div>
        </div>

        {revealError && (
          <div
            role="alert"
            className="mt-2.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[11px]"
          >
            {revealError}
          </div>
        )}
      </div>
    );
  }

  // Declined state
  if (candidateStatus === 'declined') {
    return (
      <div
        className={`mt-4 p-3.5 rounded-2xl liquid-glass border border-neutral-200/70 dark:border-white/10 transition-colors ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
            <span>Donor Unavailable / Declined</span>
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-medium">
            Contact Protected
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
          This donor was unable to proceed with this request. Contact details remain confidential.
        </p>
      </div>
    );
  }

  // State A: Notified / Awaiting Response
  return (
    <div
      className={`mt-4 p-3.5 rounded-2xl liquid-glass border border-neutral-200/70 dark:border-neutral-800 transition-colors ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-mono">
          <span className="font-sans text-neutral-600 dark:text-neutral-400 font-medium">Phone:</span>
          <span className="liquid-glass-pill text-neutral-700 dark:text-neutral-300 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold tracking-widest border border-neutral-200/80 dark:border-white/10">
            ••••••••••
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-sans font-semibold tracking-wide">
            (Hidden)
          </span>
        </div>

        {candidateStatus === 'notified' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Notified — Awaiting Response
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
            Awaiting Notification
          </span>
        )}
      </div>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
        Contact protected. Donor contact remains hidden while awaiting a response.
      </p>
    </div>
  );
}
