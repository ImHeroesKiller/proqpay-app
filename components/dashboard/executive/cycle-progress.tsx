"use client";

import { CYCLE_STAGES } from "@/lib/data/executive-command";

const COMPLETED = CYCLE_STAGES.find((s) => s.id === "completed")!;
const R = 54;
const C = 2 * Math.PI * R;

export function CycleProgress() {
  const offset = C * (1 - COMPLETED.pct / 100);

  return (
    <div className="surface-premium flex h-full flex-col p-5">
      <div className="mb-2">
        <h2 className="font-heading text-sm font-semibold">Payroll Cycle Progress</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Active multinational cycles · August close cohort
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-2">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="#E8EEF5"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="#0B3A6E"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="#10B981"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - 0.18)}
              opacity={0.35}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="kpi-value text-3xl font-bold text-navy">
              {COMPLETED.pct}%
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </span>
          </div>
        </div>
      </div>

      <ol className="mt-1 space-y-2">
        {CYCLE_STAGES.filter((s) => s.id !== "completed").map((stage, i) => (
          <li key={stage.id} className="flex items-center gap-2.5 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-navy">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {stage.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {stage.count}
            </span>
            <span className="w-10 text-right tabular-nums font-semibold text-navy">
              {stage.pct}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
