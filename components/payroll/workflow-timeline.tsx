import type { WorkflowStep } from "@/types";
import { Check, Circle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="space-y-0">
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
              <div className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" />
            ) : null}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                step.state === "done" &&
                  "border-emerald-500 bg-emerald-50 text-emerald-700",
                step.state === "current" &&
                  "border-amber-500 bg-amber-50 text-amber-800",
                step.state === "upcoming" &&
                  "border-border bg-muted text-muted-foreground",
                step.state === "skipped" &&
                  "border-border bg-background text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <div className="pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {step.state}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
