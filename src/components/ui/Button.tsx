import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'quiet' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:focus-visible:outline-rose-400 select-none';

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs dark:bg-rose-600 dark:hover:bg-rose-500 border border-transparent',
    secondary:
      'bg-neutral-950 hover:bg-neutral-800 text-white shadow-xs dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border-neutral-700 border border-transparent',
    outline:
      'liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/10 shadow-xs',
    quiet:
      'bg-transparent hover:bg-neutral-100/80 text-neutral-700 dark:hover:bg-neutral-800/80 dark:text-neutral-300 dark:hover:text-white border border-transparent',
    destructive:
      'bg-red-700 hover:bg-red-800 text-white shadow-xs dark:bg-red-600 dark:hover:bg-red-500 border border-transparent',

  }[variant];

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="w-4 h-4 animate-spin shrink-0 text-current"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
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
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
