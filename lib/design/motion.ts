"use client";

import type { Transition, Variants } from "framer-motion";

/** Enterprise motion tokens — soft, short, professional. */
export const duration = {
  micro: 0.15,
  panel: 0.22,
  page: 0.28,
} as const;

export const easeOut = [0.16, 1, 0.3, 1] as const;

export const microTransition: Transition = {
  duration: duration.micro,
  ease: easeOut,
};

export const panelTransition: Transition = {
  duration: duration.panel,
  ease: easeOut,
};

export const pageTransition: Transition = {
  duration: duration.page,
  ease: easeOut,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: microTransition },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: microTransition },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
