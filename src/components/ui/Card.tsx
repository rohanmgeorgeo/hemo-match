import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  variant?: 'default' | 'subtle' | 'interactive' | 'accent' | 'success';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean | 'default' | 'subtle' | 'elevated';
  children: React.ReactNode;
}

const PADDING_MAP = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  glow = false,
  className = '',
  children,
  ...props
}) => {
  const isGlowActive = Boolean(glow);
  const glowHoverClass = isGlowActive
    ? 'hover:border-neutral-300 dark:hover:border-neutral-700'
    : '';

  const baseClasses =
    'rounded-2xl sm:rounded-3xl transition-all duration-150 relative';

  const variantClasses = {
    default:
      'bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.35)] text-neutral-900 dark:text-neutral-100',
    subtle:
      'bg-neutral-50/90 dark:bg-[#1a1a1d] border border-neutral-200/70 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-neutral-800 dark:text-neutral-200',
    interactive:
      'bg-white dark:bg-[#171717] border border-neutral-200/80 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.35)] hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-900 dark:text-neutral-100 cursor-pointer',
    accent:
      'bg-white dark:bg-[#171717] border border-rose-200/80 dark:border-rose-900/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.35)] text-neutral-900 dark:text-neutral-100',
    success:
      'bg-white dark:bg-[#171717] border border-emerald-200/90 dark:border-emerald-900/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.35)] text-neutral-900 dark:text-neutral-100',
  }[variant];

  const paddingClass = PADDING_MAP[padding];

  return (
    <Component
      className={`${baseClasses} ${variantClasses} ${paddingClass} ${glowHoverClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
