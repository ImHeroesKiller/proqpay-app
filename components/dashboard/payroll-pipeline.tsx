"use client";

import { motion } from "framer-motion";
import {
  Database,
  ShieldCheck,
  Calculator,
  GitBranch,
  Banknote,
  PartyPopper,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PipelineIconKey,
  PipelineStage,
} from "@/lib/domain/payroll-pipeline";

export type {
  PipelineStage,
  PipelineStageStatus,
  PipelineIconKey,
} from "@/lib/domain/payroll-pipeline";

const ICONS: Record<PipelineIconKey, LucideIcon> = {
  attendance: Database,
  validation: ShieldCheck,
  calculation: Calculator,
  approval: GitBranch,
  instruction: Banknote,
  confirmation: Banknote,
  payment: Banknote,
  completed: PartyPopper,
};

export function PayrollPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol
        className="flex min-w-[860px] items-stretch gap-0 px-1"
        aria-label="Progress payroll"
      >
        {stages.map((stage, index) => {
          const Icon = ICONS[stage.iconKey] ?? Database;
          const isLast = index === stages.length - 1;
          const percent = stage.percent ?? 0;

          return (
            <li
              key={stage.key}
              className="relative flex flex-1 flex-col items-center"
            >
              {!isLast ? (
                <div
                  className="absolute left-[calc(50%+28px)] right-[calc(-50%+28px)] top-7 flex items-center"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      stage.status === "done"
                        ? "bg-emerald-400"
                        : stage.status === "current" ||
                            stage.status === "warning"
                          ? "bg-gradient-to-r from-orange/80 to-border"
                          : "bg-border",
                    )}
                  />
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0",
                      stage.status === "done"
                        ? "text-emerald-500"
                        : "text-muted-foreground/50",
                    )}
                  />
                </div>
              ) : null}

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                title={stage.tooltip}
                className="group relative z-10 flex w-full flex-col items-center gap-2.5 px-2"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-soft transition-all duration-200 group-hover:scale-105 group-hover:shadow-lift",
                    stage.status === "done" &&
                      "border-emerald-300 bg-emerald-50 text-emerald-700",
                    stage.status === "current" &&
                      "border-orange bg-orange/10 text-orange ring-4 ring-orange/15",
                    stage.status === "upcoming" &&
                      "border-border bg-white text-muted-foreground",
                    stage.status === "warning" &&
                      "border-amber-400 bg-amber-50 text-amber-700 ring-4 ring-amber-100",
                    stage.status === "critical" &&
                      "border-red-400 bg-red-50 text-red-700 ring-4 ring-red-100",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.85} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold leading-tight text-navy">
                    {stage.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-xl font-bold tabular-nums",
                      stage.status === "done" && "text-emerald-600",
                      stage.status === "current" && "text-orange",
                      stage.status === "upcoming" && "text-muted-foreground",
                      stage.status === "warning" && "text-amber-600",
                      stage.status === "critical" && "text-red-600",
                    )}
                  >
                    {percent}%
                  </p>
                  {stage.countLabel ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stage.countLabel}
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
