/**
 * Hemo Match - Matching Subsystem Entry Point
 *
 * Scope: District-level donor matching prioritizing blood group compatibility,
 * geographic district alignment, and preliminary donor donation intervals.
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final compatibility and donor screening decisions must
 * be made by qualified blood bank and clinical personnel via standard serological
 * crossmatching and laboratory testing.
 */

export * from './compatibility';
export * from './engine';

import type { BloodGroup, UrgencyLevel } from '@/types';
import type { EligibleMatchCandidate } from './engine';

// Legacy / interface support for UI components
export interface MatchFilter {
  bloodGroup: BloodGroup;
  districtId: string;
  urgency: UrgencyLevel;
  maxDistanceTier?: number;
  excludeDonorIds?: string[];
}

export interface MatchCandidate {
  donorId: string;
  bloodGroup: BloodGroup;
  districtId: string;
  districtName: string;
  compatibilityScore: number;
  isEligible: boolean;
  distanceTier: number;
}

export interface MatchResultSet {
  requestId: string;
  candidates: EligibleMatchCandidate[];
  totalFound: number;
  evaluatedAt: string;
}
