"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/lib/domain/payroll-pipeline";

export type { PipelineStage, PipelineStageStatus } from "@/lib/domain/payroll-pipeline";

export function PayrollPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-[720px] items-stretch gap-0" aria-label="Payroll pipeline">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.key} className="relative flex flex-1 flex-col items-center">
              {!isLast ? (
                <div
                  className={cn(
                    "absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 h-0.5",
                    stage.status === "done" || stage.status === "current"
                      ? "bg-gradient-to-r from-orange/80 to-orange/30"
                      : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                title={stage.tooltip}
                className={cn(
                  "group relative z-10 flex w-full flex-col items-center gap-2 px-1",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-soft transition-all duration-200 group-hover:scale-110 group-hover:shadow-lift",
                    stage.status === "done" &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
                    stage.status === "current" &&
                      "border-orange/40 bg-orange/15 text-orange ring-4 ring-orange/10",
                    stage.status === "upcoming" &&
                      "border-border bg-card text-muted-foreground",
                    stage.status === "warning" &&
                      "border-amber-300 bg-amber-50 text-amber-700 ring-4 ring-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    stage.status === "critical" &&
                      "border-red-300 bg-red-50 text-red-700 ring-4 ring-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold leading-tight text-foreground">
                    {stage.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {stage.status === "done"
                      ? stage.completedAt ?? "Done"
                      : stage.status === "current"
                        ? "In progress"
                        : stage.status === "warning"
                          ? "Needs attention"
                          : stage.status === "critical"
                            ? "Critical"
                            : "Queued"}
                  </p>
                  {stage.owner ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {stage.owner}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
