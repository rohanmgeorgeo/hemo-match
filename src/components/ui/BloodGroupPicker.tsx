import React from 'react';
import type { BloodGroup } from '@/types';
import { VALID_BLOOD_GROUPS } from '@/lib/validation';

export interface BloodGroupPickerProps {
  value?: BloodGroup;
  onChange: (group: BloodGroup) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  className?: string;
}

export const BloodGroupPicker: React.FC<BloodGroupPickerProps> = ({
  value,
  onChange,
  disabled = false,
  id,
  error,
  className = '',
}) => {
  return (
    <div id={id} className={`w-full ${className}`.trim()}>
      <div
        role="radiogroup"
        aria-label="Blood Group Selection"
        aria-invalid={Boolean(error)}
        className="grid grid-cols-4 sm:grid-cols-8 gap-2"
      >
        {VALID_BLOOD_GROUPS.map((bg) => {
          const isSelected = value === bg;
          return (
            <button
              key={bg}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(bg)}
              className={`h-12 rounded-xl text-sm transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer border select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/30 dark:ring-rose-500/40 font-bold scale-[1.02]'
                  : 'bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 dark:bg-neutral-800/80 dark:hover:bg-neutral-750 dark:hover:border-neutral-600 text-neutral-800 dark:text-neutral-200 border-neutral-200/90 dark:border-neutral-700 font-semibold'
              }`}
            >
              <span className="tabular-nums">{bg}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};
