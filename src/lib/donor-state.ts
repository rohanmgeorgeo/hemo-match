'use client';

import { useSyncExternalStore } from 'react';

const DONOR_STORAGE_KEY = 'hemo_match_demo_donor';
export const DONOR_UPDATED_EVENT = 'hemo_match_donor_updated';

function subscribeDonor(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(DONOR_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(DONOR_UPDATED_EVENT, callback);
  };
}

function getDonorSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DONOR_STORAGE_KEY);
    return Boolean(raw);
  } catch {
    return false;
  }
}

function getDonorServerSnapshot(): boolean {
  return false;
}

/**
 * Hook returning whether a demo donor profile exists in localStorage.
 * Reactively updates when a donor registers without requiring manual reload.
 */
export function useHasDonorProfile(): boolean {
  return useSyncExternalStore(subscribeDonor, getDonorSnapshot, getDonorServerSnapshot);
}

/**
 * Dispatches an event to notify the application that donor registration status changed.
 */
export function notifyDonorUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DONOR_UPDATED_EVENT));
  window.dispatchEvent(new Event('storage'));
}
