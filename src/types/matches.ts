/**
 * Hemo Match - Match Domain & API Response Types
 *
 * Privacy-safe types for matching candidates and API responses.
 * These types are safe for both client and server consumption.
 * They deliberately contain NO donor identification, phone, or PII fields.
 */

import type { BloodGroup } from './index';

export type CompatibilityType = 'homologous' | 'compatible';

export type MatchStatus =
  | 'candidate'
  | 'notified'
  | 'responded'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired';

/**
 * Privacy-safe public candidate returned by POST /api/requests/matches.
 * Contains no private donor credentials or raw donor identifiers.
 */
export interface PublicMatchCandidate {
  matchId: string;
  requestId: string;
  anonymizedDonorRef: string;
  bloodGroup: BloodGroup;
  districtName: string;
  approximateArea: string;
  compatibilityType: CompatibilityType;
  factualMatchReasons: string[];
  status: MatchStatus;
  createdAt: string;
}

export interface MatchApiResponseSuccess {
  success: true;
  requestId: string;
  totalMatches: number;
  matches: PublicMatchCandidate[];
  message?: string;
}

export interface MatchApiResponseError {
  success: false;
  error: string;
  message: string;
  errors?: Record<string, string>;
}

export type MatchApiResponse = MatchApiResponseSuccess | MatchApiResponseError;
