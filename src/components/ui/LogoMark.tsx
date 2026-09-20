import React from "react";

export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Authoritative Hemo Match visual brand mark.
 * Shares identical geometry, proportions, and colors with the favicon (/icon.svg).
 * Uses solid crimson (#E11D48) rounded rect background with pure white blood droplet silhouette.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({
  size = 32,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#E11D48" />
      <path
        d="M16 25.5c-4.142 0-7.5-3.358-7.5-7.5 0-3.309 3.428-7.697 6.54-11.233a1.25 1.25 0 0 1 1.92 0C19.072 10.303 22.5 14.691 22.5 18c0 4.142-3.358 7.5-7.5 7.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
