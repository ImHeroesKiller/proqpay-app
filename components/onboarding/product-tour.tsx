"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { tourKeyForRole } from "@/lib/hooks/use-onboarding";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

type TourStep = {
  id: string;
  title: string;
  body: string;
  /** data-tour attribute target */
  target?: string;
};

function stepsForTourKey(key: string): TourStep[] {
  const common: TourStep[] = [
    {
      id: "welcome",
      title: "Welcome to ProQPay",
      body: "Enterprise Payroll Operating System for MSG. You manage payroll operations, approvals, payment instructions, and confirmation — with full auditability.",
    },
    {
      id: "sidebar",
      title: "Navigation by business context",
      body: "Menus are grouped: Payroll operations, Finance, Commercial, Governance, and Administration. Items respect your role permissions.",
      target: "sidebar",
    },
    {
      id: "topbar",
      title: "Orientation bar",
      body: "Breadcrumb and page title keep you oriented. Use search (⌘/Ctrl+K) and Help anytime.",
      target: "topbar",
    },
    {
      id: "command",
      title: "Command palette",
      body: "Jump to pages and quick actions without hunting the sidebar. Results are filtered by your role.",
      target: "command-trigger",
    },
  ];

  if (key === "director") {
    return [
      ...common,
      {
        id: "dashboard",
        title: "Executive visibility",
        body: "Dashboard emphasizes payroll value, completion, client activity, funding exposure, and operational risk — not consumer widgets.",
        target: "nav-dashboard",
      },
      {
        id: "workflow",
        title: "Governance chain",
        body: "Track multilevel approval, payment confirmation, and audit trail. Capital and commercial modules remain confidential.",
        target: "nav-audit",
      },
    ];
  }

  if (key === "finance") {
    return [
      ...common,
      {
        id: "wc",
        title: "Working capital & settlement",
        body: "Monitor funding requests, exposure, and settlement. Partner capital goes to client bank — never directly to employees.",
        target: "nav-working_capital",
      },
      {
        id: "pi",
        title: "Payment instructions",
        body: "After approval, instructions enable client bank transfers. Confirm proofs before period close.",
        target: "nav-payment_instructions",
      },
    ];
  }

  if (key === "payroll") {
    return [
      ...common,
      {
        id: "payroll",
        title: "Payroll command work",
        body: "Prepare periods, validate data, submit for approval, generate instructions, and chase confirmation queues.",
        target: "nav-payroll",
      },
      {
        id: "confirm",
        title: "Confirmation queue",
        body: "When clients transfer and upload proof, verify amounts and documents here before closing payroll.",
        target: "nav-payment_confirmation",
      },
    ];
  }

  return [
    ...common,
    {
      id: "reports",
      title: "Reports & visibility",
      body: "Use reports for operational overview. Sensitive commercial modules appear only if your role allows.",
      target: "nav-reports",
    },
  ];
}

export function ProductTour({
  open,
  onComplete,
  onSkip,
}: {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const tourKey = tourKeyForRole(role);
  const steps = useMemo(() => stepsForTourKey(tourKey), [tourKey]);
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSkip, steps.length]);

  if (!open) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onSkip} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "absolute left-1/2 top-[20%] z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-card p-5 shadow-xl",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Product tour · {index + 1}/{steps.length}
          </p>
          <h2 id="tour-title" className="mt-1 text-lg font-semibold">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
          {step.target ? (
            <p className="mt-3 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              Highlight: look for the{" "}
              <span className="font-medium text-foreground">
                {step.target.replace("nav-", "").replaceAll("_", " ")}
              </span>{" "}
              area in the shell.
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip tour
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                Back
              </Button>
              {isLast ? (
                <Button size="sm" variant="accent" onClick={onComplete}>
                  Finish
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function FirstLoginOnboarding({
  open,
  onContinue,
  onSkip,
}: {
  open: boolean;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const reduceMotion = useReducedMotion();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          ProQPay · MSG
        </p>
        <h2 id="onboard-title" className="mt-2 text-xl font-bold tracking-tight">
          Enterprise Payroll Operating System
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          ProQPay helps your team run payroll operations with multilevel
          approval, payment instructions, client transfer confirmation, working
          capital governance, and a full audit trail.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            Use the grouped sidebar for Payroll, Finance, Commercial, and
            Governance.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            Follow the payroll lifecycle through approval → instruction → client
            transfer → verification.
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            Open Help anytime or press ⌘/Ctrl+K for the command palette.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip for now
          </Button>
          <Button variant="accent" size="sm" onClick={onContinue}>
            Continue to tour
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
