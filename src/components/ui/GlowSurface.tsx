'use client';

import React from "react";

export interface GlowSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  variant?: "default" | "subtle" | "elevated";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<"default" | "subtle" | "elevated", string> = {
  default:
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
  subtle:
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
  elevated:
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_6px_20px_-4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_-4px_rgba(0,0,0,0.4)]",
};

/**
 * GlowSurface - Spatial healthcare surface primitive with specular edge lighting
 * and restrained gradient depth, complementing global ambient lighting.
 */
export const GlowSurface: React.FC<GlowSurfaceProps> = ({
  as: Component = "div",
  variant = "default",
  children,
  className = "",
  ...props
}) => {
  return (
    <Component
      className={`relative transition-all duration-150 ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
