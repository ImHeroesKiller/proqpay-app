"use client";

import type { WorkflowStep } from "@/types";
import { Check, Circle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const stateLabel: Record<WorkflowStep["state"], string> = {
  done: "Completed",
  current: "Current",
  upcoming: "Upcoming",
  skipped: "Skipped",
};

export function WorkflowTimeline({
  steps,
  orientation = "vertical",
}: {
  steps: WorkflowStep[];
  orientation?: "vertical" | "horizontal";
}) {
  if (orientation === "horizontal") {
    return (
      <ol
        className="flex flex-wrap gap-2"
        aria-label="Payroll workflow progress"
      >
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
              step.state === "done" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
              step.state === "current" &&
                "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
              step.state === "upcoming" &&
                "border-border bg-muted/40 text-muted-foreground",
              step.state === "skipped" &&
                "border-border bg-background text-muted-foreground line-through",
            )}
          >
            <span className="font-semibold tabular-nums opacity-60">
              {index + 1}
            </span>
            <span className="font-medium">{step.label}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="space-y-0" aria-label="Payroll workflow progress">
      {steps.map((step, index) => {
        const Icon =
          step.state === "done"
            ? Check
            : step.state === "skipped"
              ? Minus
              : Circle;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <div
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                step.state === "done" &&
                  "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                step.state === "current" &&
                  "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
                step.state === "upcoming" &&
                  "border-border bg-muted text-muted-foreground",
                step.state === "skipped" &&
                  "border-border bg-background text-muted-foreground",
              )}
              aria-hidden
            >
              <Icon className="h-3 w-3" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" && "text-muted-foreground",
                  step.state === "current" && "text-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {stateLabel[step.state]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
