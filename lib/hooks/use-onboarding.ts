"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/types";

const FIRST_LOGIN_KEY = "proqpay.onboarding.firstLogin.done";
const TOUR_PREFIX = "proqpay.onboarding.tour.";

export function tourKeyForRole(role: Role): string {
  if (role === "DIRECTOR" || role === "SUPER_ADMIN") return "director";
  if (role === "FINANCE") return "finance";
  if (role === "PAYROLL_ADMIN" || role === "PAYROLL_OPERATOR") return "payroll";
  return "general";
}

export function useOnboardingState(role?: Role) {
  const [firstLoginDone, setFirstLoginDone] = useState(true);
  const [tourDone, setTourDone] = useState(true);
  const [ready, setReady] = useState(false);
  const tourKey = role ? tourKeyForRole(role) : "general";

  useEffect(() => {
    try {
      setFirstLoginDone(localStorage.getItem(FIRST_LOGIN_KEY) === "1");
      setTourDone(localStorage.getItem(`${TOUR_PREFIX}${tourKey}`) === "1");
    } catch {
      setFirstLoginDone(true);
      setTourDone(true);
    }
    setReady(true);
  }, [tourKey]);

  const completeFirstLogin = useCallback(() => {
    try {
      localStorage.setItem(FIRST_LOGIN_KEY, "1");
    } catch {
      /* ignore */
    }
    setFirstLoginDone(true);
  }, []);

  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(`${TOUR_PREFIX}${tourKey}`, "1");
    } catch {
      /* ignore */
    }
    setTourDone(true);
  }, [tourKey]);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(`${TOUR_PREFIX}${tourKey}`);
    } catch {
      /* ignore */
    }
    setTourDone(false);
  }, [tourKey]);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(FIRST_LOGIN_KEY);
      localStorage.removeItem(`${TOUR_PREFIX}${tourKey}`);
    } catch {
      /* ignore */
    }
    setFirstLoginDone(false);
    setTourDone(false);
  }, [tourKey]);

  return {
    ready,
    firstLoginDone,
    tourDone,
    tourKey,
    completeFirstLogin,
    completeTour,
    resetTour,
    resetAll,
  };
}
