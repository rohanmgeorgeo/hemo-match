import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
  }[size];

  const variantClasses = {
    neutral:
      'bg-neutral-100/90 text-neutral-700 border-neutral-200/90 dark:bg-neutral-800/80 dark:text-neutral-200 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    accent:
      'bg-rose-50/90 text-rose-800 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    success:
      'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    warning:
      'bg-amber-50/90 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    info:
      'bg-blue-50/90 text-blue-800 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
  }[variant];

  const dotClasses = {
    neutral: 'bg-neutral-400 dark:bg-neutral-400',
    accent: 'bg-rose-600 dark:bg-rose-400',
    success: 'bg-emerald-600 dark:bg-emerald-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    info: 'bg-blue-600 dark:bg-blue-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide transition-colors ${sizeClasses} ${variantClasses} ${className}`.trim()}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
