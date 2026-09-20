'use client';

import React from 'react';
import type { PublicMatchCandidate } from '@/types/matches';
import { getCompatibilityBadgeDetails } from '@/lib/matching/ui-helpers';
import { GlowSurface } from '@/components/ui/GlowSurface';
import {
  ContactRevealCard,
  type RevealedContactInfo,
} from './ContactRevealCard';

export interface CandidateCardProps {
  candidate: PublicMatchCandidate;
  revealedContact?: RevealedContactInfo;
  isRevealing: boolean;
  revealError?: string | null;
  onReveal: (matchId: string) => void;
  className?: string;
}

export function CandidateCard({
  candidate,
  revealedContact,
  isRevealing,
  revealError,
  onReveal,
  className = '',
}: CandidateCardProps) {
  const badge = getCompatibilityBadgeDetails(candidate.compatibilityType);

  return (
    <GlowSurface
      variant="subtle"
      className={`liquid-glass rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs hover:border-neutral-300/90 dark:hover:border-neutral-700/80 hover:shadow-sm transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl liquid-glass-pill border border-rose-200/70 dark:border-rose-900/60 flex items-center justify-center font-black text-rose-600 dark:text-rose-400 text-sm shadow-xs">
            {candidate.bloodGroup}
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {candidate.anonymizedDonorRef}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <svg
                className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Proximity / District Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium liquid-glass-pill text-neutral-700 dark:text-neutral-300 border border-neutral-200/70 dark:border-white/10 shadow-xs">
            <svg
              className="w-3 h-3 text-neutral-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {candidate.distanceKm != null
              ? `${candidate.distanceKm < 0.1 ? '<0.1' : `~${candidate.distanceKm.toFixed(1)}`} km away`
              : 'Same district'}
          </span>

          {/* Compatibility Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              badge.isHomologous
                ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                : 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-300/80 dark:border-blue-800/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                badge.isHomologous
                  ? 'bg-emerald-600 dark:bg-emerald-400'
                  : 'bg-blue-600 dark:bg-blue-400'
              }`}
            />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Factual Match Reasons */}
      {candidate.factualMatchReasons && candidate.factualMatchReasons.length > 0 && (
        <div className="pt-3">
          <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            Preliminary Match Criteria
          </div>
          <ul className="space-y-1.5">
            {candidate.factualMatchReasons.map((reason, rIdx) => (
              <li
                key={rIdx}
                className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  aria-hidden="true"
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

      {/* Signature Contact Reveal Component */}
      <ContactRevealCard
        matchId={candidate.matchId}
        candidateStatus={candidate.status}
        revealedContact={revealedContact}
        isRevealing={isRevealing}
        revealError={revealError}
        onReveal={onReveal}
      />
    </GlowSurface>
  );
}
