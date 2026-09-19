'use client';

import React from 'react';

export interface GlowSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  variant?: 'default' | 'subtle' | 'elevated';
  children: React.ReactNode;
  className?: string;
}

/**
 * GlowSurface - Material surface that complements global ambient lighting.
 * Seamlessly integrates into the unified global illumination system with
 * subtle hover elevation and smooth transitions.
 */
export const GlowSurface: React.FC<GlowSurfaceProps> = ({
  as: Component = 'div',
  children,
  className = '',
  ...props
}) => {
  return (
    <Component
      className={`transition-all duration-150 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
