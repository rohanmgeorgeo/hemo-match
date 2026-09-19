'use client';

import React, { useCallback } from 'react';

export interface GlowSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  children: React.ReactNode;
  className?: string;
}

/**
 * GlowSurface - High-performance cursor-reactive surface.
 * Updates CSS custom properties (--pointer-x, --pointer-y, --pointer-active)
 * directly on the DOM node without triggering React re-renders.
 * Active only for fine desktop pointer devices; no-op on touch.
 */
export const GlowSurface: React.FC<GlowSurfaceProps> = ({
  as: Component = 'div',
  children,
  className = '',
  onPointerMove,
  onPointerLeave,
  ...props
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--pointer-x', `${x}px`);
        e.currentTarget.style.setProperty('--pointer-y', `${y}px`);
        e.currentTarget.style.setProperty('--pointer-active', '1');
      }
      onPointerMove?.(e);
    },
    [onPointerMove]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.style.setProperty('--pointer-active', '0');
      onPointerLeave?.(e);
    },
    [onPointerLeave]
  );

  return (
    <Component
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`cursor-glow-surface ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
