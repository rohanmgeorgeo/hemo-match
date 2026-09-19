'use client';

import React, { useEffect, useRef } from 'react';

/**
 * AmbientPointerLight - Root-level subtle ambient pointer illumination.
 *
 * Implements a single, high-performance, non-intrusive light source behind
 * application content. Translucent glass surfaces (headers, floating controls)
 * naturally catch and soften this light.
 *
 * Performance & Accessibility:
 * - Mounted once in root layout
 * - Desktop fine-pointer only (never tracks touch devices)
 * - Zero React state updates / zero re-renders on pointermove
 * - requestAnimationFrame coalesced CSS custom property updates
 * - pointer-events: none (never intercepts clicks or gestures)
 * - prefers-reduced-motion: reduce disables tracking completely
 */
export const AmbientPointerLight: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const isEligible = () => finePointerQuery.matches && !reducedMotionQuery.matches;

    let rafId: number | null = null;
    let latestX = -9999;
    let latestY = -9999;
    let listenersActive = false;

    const updateGlowPosition = () => {
      rafId = null;
      if (containerRef.current) {
        containerRef.current.style.setProperty('--global-pointer-x', `${latestX}px`);
        containerRef.current.style.setProperty('--global-pointer-y', `${latestY}px`);
        containerRef.current.style.setProperty('--global-pointer-active', '1');
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore touch and pen emulation
      if (e.pointerType && e.pointerType !== 'mouse') return;
      latestX = e.clientX;
      latestY = e.clientY;

      if (rafId === null) {
        rafId = requestAnimationFrame(updateGlowPosition);
      }
    };

    const handlePointerLeave = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (containerRef.current) {
        containerRef.current.style.setProperty('--global-pointer-active', '0');
      }
    };

    const handlePointerEnter = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      latestX = e.clientX;
      latestY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateGlowPosition);
      }
    };

    const setupListeners = () => {
      if (isEligible() && !listenersActive) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        document.addEventListener('mouseleave', handlePointerLeave);
        document.addEventListener('mouseenter', handlePointerEnter as EventListener, { passive: true });
        window.addEventListener('blur', handlePointerLeave);
        listenersActive = true;
      } else if (!isEligible() && listenersActive) {
        removeListeners();
      }
    };

    const removeListeners = () => {
      if (listenersActive) {
        window.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('mouseleave', handlePointerLeave);
        document.removeEventListener('mouseenter', handlePointerEnter as EventListener);
        window.removeEventListener('blur', handlePointerLeave);
        listenersActive = false;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (containerRef.current) {
        containerRef.current.style.setProperty('--global-pointer-active', '0');
      }
    };

    setupListeners();

    // Listen for media query changes (e.g. user toggles reduced-motion or changes display mode)
    const handleMediaChange = () => {
      setupListeners();
    };

    finePointerQuery.addEventListener('change', handleMediaChange);
    reducedMotionQuery.addEventListener('change', handleMediaChange);

    return () => {
      removeListeners();
      finePointerQuery.removeEventListener('change', handleMediaChange);
      reducedMotionQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="ambient-pointer-container fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      <div className="ambient-pointer-glow" />
    </div>
  );
};
