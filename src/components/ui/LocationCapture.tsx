'use client';

import React, { useState, useCallback } from 'react';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationCaptureProps {
  value: LocationCoordinates | null;
  onChange: (coords: LocationCoordinates | null) => void;
  context: 'requester' | 'donor';
  className?: string;
  disabled?: boolean;
}

type GeolocationStatus = 'idle' | 'requesting' | 'captured' | 'error';

/**
 * Reusable Privacy-Safe Location Capture Control.
 *
 * Requirements:
 * - Client-side navigator.geolocation triggered ONLY by explicit user gesture.
 * - Never displays raw numeric coordinates in user-facing UI.
 * - Reassures user regarding privacy boundaries and server-side matching use.
 * - Graceful fallback to manual district & approximate area on denial, timeout, or error.
 *
 * Architectural Note (Google Maps / Places preparation):
 * - Coordinates are modeled as generic { latitude, longitude } pairs.
 * - A future Google Places Autocomplete or map-picker component can seamlessly
 *   supply the same structure through onChange() without altering downstream logic.
 */
export function LocationCapture({
  value,
  onChange,
  context,
  className = '',
  disabled = false,
}: LocationCaptureProps) {
  const [status, setStatus] = useState<GeolocationStatus>(value ? 'captured' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error');
      setErrorMessage(
        'Geolocation is not supported by your browser. Matching will use your district and locality.'
      );
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (
          typeof lat === 'number' &&
          typeof lon === 'number' &&
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180
        ) {
          onChange({ latitude: lat, longitude: lon });
          setStatus('captured');
          setErrorMessage(null);
        } else {
          setStatus('error');
          setErrorMessage(
            'Received invalid location coordinates. Please use district selection.'
          );
        }
      },
      (error) => {
        setStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage(
              'Location permission was denied. Matching will seamlessly use your district and approximate area.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage(
              'Location information is temporarily unavailable. Matching will use your district.'
            );
            break;
          case error.TIMEOUT:
            setErrorMessage(
              'Location request timed out. You can try again or proceed with district selection.'
            );
            break;
          default:
            setErrorMessage(
              'Unable to retrieve current location. District and approximate area will be used.'
            );
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, [onChange]);

  const handleClearLocation = useCallback(() => {
    onChange(null);
    setStatus('idle');
    setErrorMessage(null);
  }, [onChange]);

  const isRequester = context === 'requester';

  return (
    <div
      className={`rounded-2xl border transition-all p-4 sm:p-5 ${
        value
          ? 'liquid-glass-emerald border-emerald-300/80 dark:border-emerald-700/60 specular-rim shadow-xs'
          : status === 'error'
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/60 shadow-xs'
          : 'liquid-glass border-neutral-200/80 dark:border-white/10 shadow-xs'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                value
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'error'
                  ? 'bg-amber-500'
                  : 'bg-neutral-400 dark:bg-neutral-500'
              }`}
            />
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              {isRequester ? 'Proximity Matching Location' : 'Private Proximity Location'}
            </label>
            {value && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                5 km Radius Active
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed max-w-lg">
            {isRequester
              ? 'Capture your current location to match nearby donors within a 5 km radius. Hospital/centre name remains the coordination destination.'
              : 'Share your location privately to be discovered for nearby requests within a 5 km radius. Raw coordinates are never shared with requesters.'}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={handleClearLocation}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all active:scale-[0.98]"
            >
              <svg
                className="w-3.5 h-3.5 text-neutral-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span>Clear</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={disabled || status === 'requesting'}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-2xs ${
                status === 'requesting'
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 cursor-wait'
                  : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white'
              }`}
            >
              {status === 'requesting' ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 animate-spin text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-rose-500 dark:text-rose-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
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
                  <span>Use current location</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Captured Badge / Status */}
      {value && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <svg
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>
            Location captured securely for server-side proximity matching. District and locality details remain active.
          </span>
        </div>
      )}

      {/* Non-fatal Error / Fallback Notice */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300">
          <svg
            className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z"
            />
          </svg>
          <div className="flex-1">
            <span>{errorMessage}</span>
            <div className="mt-1">
              <button
                type="button"
                onClick={handleRequestLocation}
                className="text-xs font-bold underline hover:no-underline text-amber-800 dark:text-amber-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
