'use client';

import React from 'react';

export interface RequestLifecycleProps {
  hasRequest: boolean;
  hasMatches: boolean;
  isNotified: boolean;
  hasResponse: boolean;
  hasRevealed: boolean;
  className?: string;
}

interface StepItem {
  id: number;
  label: string;
  sublabel: string;
  isCompleted: boolean;
  isActive: boolean;
}

export function RequestLifecycle({
  hasRequest,
  hasMatches,
  isNotified,
  hasResponse,
  hasRevealed,
  className = '',
}: RequestLifecycleProps) {
  const steps: StepItem[] = [
    {
      id: 1,
      label: 'Request',
      sublabel: 'Submitted',
      isCompleted: hasRequest,
      isActive: hasRequest && !hasMatches,
    },
    {
      id: 2,
      label: 'Match',
      sublabel: 'Evaluated',
      isCompleted: hasMatches,
      isActive: hasMatches && !isNotified,
    },
    {
      id: 3,
      label: 'Notify',
      sublabel: 'In-app alert',
      isCompleted: isNotified,
      isActive: isNotified && !hasResponse,
    },
    {
      id: 4,
      label: 'Response',
      sublabel: 'Donor feedback',
      isCompleted: hasResponse,
      isActive: hasResponse && !hasRevealed,
    },
    {
      id: 5,
      label: 'Reveal',
      sublabel: 'Authorized',
      isCompleted: hasRevealed,
      isActive: hasRevealed,
    },
  ];

  return (
    <nav
      aria-label="Request Coordination Progress"
      className={`rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-neutral-800 p-3 sm:p-4 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step.isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : step.isActive
                      ? 'bg-rose-600 text-white ring-2 ring-rose-500/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {step.isCompleted ? (
                    <svg
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"
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
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                <span
                  className={`text-[11px] sm:text-xs font-semibold mt-1.5 truncate max-w-full ${
                    step.isCompleted
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : step.isActive
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {step.label}
                </span>

                <span className="hidden md:block text-[10px] text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-full">
                  {step.sublabel}
                </span>
              </div>

              {!isLast && (
                <div
                  aria-hidden="true"
                  className={`h-0.5 flex-1 max-w-[32px] sm:max-w-[48px] -mt-4 sm:-mt-5 transition-colors ${
                    step.isCompleted
                      ? 'bg-emerald-500 dark:bg-emerald-600'
                      : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
