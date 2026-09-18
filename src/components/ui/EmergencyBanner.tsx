import React from 'react';

export type BannerTone = 'notice' | 'privacy' | 'alert' | 'success';

export interface EmergencyBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: BannerTone;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  tone = 'notice',
  title,
  icon,
  className = '',
  children,
  ...props
}) => {
  const toneClasses = {
    notice:
      'bg-amber-50/80 border-amber-200/80 text-amber-900/90 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-200',
    privacy:
      'bg-blue-50/80 border-blue-200/80 text-blue-900/90 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-200',
    alert:
      'bg-rose-50/80 border-rose-200/80 text-rose-900/90 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-200',
    success:
      'bg-emerald-50/80 border-emerald-200/80 text-emerald-900/90 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-200',
  }[tone];

  const titleClasses = {
    notice: 'text-amber-950 dark:text-amber-100',
    privacy: 'text-blue-950 dark:text-blue-100',
    alert: 'text-rose-950 dark:text-rose-100',
    success: 'text-emerald-950 dark:text-emerald-100',
  }[tone];

  const iconBgClasses = {
    notice: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    privacy: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    alert: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  }[tone];

  const defaultIcon = {
    notice: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002A11.959 11.959 0 0 1 12 2.964ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    privacy: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    alert: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  }[tone];

  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={`rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 shadow-xs transition-colors ${toneClasses} ${className}`.trim()}
      {...props}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBgClasses}`}
        aria-hidden="true"
      >
        {icon || defaultIcon}
      </div>
      <div className="text-xs sm:text-sm leading-relaxed flex-1 min-w-0">
        {title && (
          <strong className={`font-semibold block mb-1 ${titleClasses}`}>
            {title}
          </strong>
        )}
        <div className="font-normal">{children}</div>
      </div>
    </div>
  );
};
