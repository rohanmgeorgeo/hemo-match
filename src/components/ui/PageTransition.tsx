import React from "react";

export interface PageTransitionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Reusable page entrance wrapper.
 * Provides a subtle 6px translateY -> 0 and opacity 0 -> 1 over 240ms cubic-bezier.
 * Bypassed completely when prefers-reduced-motion is active.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`page-enter ${className}`} {...props}>
      {children}
    </div>
  );
};
