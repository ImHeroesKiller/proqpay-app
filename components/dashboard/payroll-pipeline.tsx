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
import type { PipelineIconKey, PipelineStage } from "@/lib/domain/payroll-pipeline";

export type { PipelineStage, PipelineStageStatus, PipelineIconKey } from "@/lib/domain/payroll-pipeline";

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

const stageTone = (stage: PipelineStage, index: number) => {
  if (stage.status === "critical") return { ring: "border-rose-400 bg-rose-50 text-rose-700 ring-rose-100", value: "text-rose-600", line: "bg-rose-300" };
  if (stage.status === "warning") return { ring: "border-amber-400 bg-amber-50 text-amber-700 ring-amber-100", value: "text-amber-600", line: "bg-amber-300" };
  if (stage.status === "current") return { ring: "border-orange bg-orange/10 text-orange ring-orange/15", value: "text-orange", line: "bg-gradient-to-r from-orange to-amber-200" };
  if (stage.status === "done") {
    const doneTones = [
      "border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-100",
      "border-teal-300 bg-teal-50 text-teal-700 ring-teal-100",
      "border-cyan-300 bg-cyan-50 text-cyan-700 ring-cyan-100",
      "border-blue-300 bg-blue-50 text-blue-700 ring-blue-100",
    ];
    const valueTones = ["text-emerald-600", "text-teal-600", "text-cyan-600", "text-blue-600"];
    return { ring: doneTones[index % doneTones.length], value: valueTones[index % valueTones.length], line: "bg-emerald-400" };
  }
  return { ring: "border-slate-200 bg-slate-50 text-slate-400 ring-slate-100", value: "text-slate-400", line: "bg-slate-200" };
};

export function PayrollPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="w-full overflow-x-auto pb-2 pt-2">
      <ol className="flex min-w-[900px] items-stretch px-2" aria-label="Progress payroll">
        {stages.map((stage, index) => {
          const Icon = ICONS[stage.iconKey] ?? Database;
          const isLast = index === stages.length - 1;
          const percent = stage.percent ?? 0;
          const tone = stageTone(stage, index);
          const isCurrent = stage.status === "current" || stage.status === "warning" || stage.status === "critical";

          return (
            <li key={stage.key} className="relative flex flex-1 flex-col items-center">
              {!isLast ? (
                <div className="absolute left-[calc(50%+31px)] right-[calc(-50%+31px)] top-[31px] flex items-center" aria-hidden>
                  <div className={cn("h-[3px] flex-1 rounded-full", tone.line)} />
                  <ChevronRight className={cn("h-4 w-4 shrink-0", stage.status === "done" ? "text-emerald-500" : "text-slate-300")} />
                </div>
              ) : null}

              <div className="group relative z-10 flex w-full flex-col items-center gap-3 px-2" title={stage.tooltip}>
                <div className={cn("flex items-center justify-center rounded-full border-2 shadow-sm ring-4 transition-transform duration-200 group-hover:scale-105", isCurrent ? "h-16 w-16" : "h-[60px] w-[60px]", tone.ring)}>
                  <Icon className={isCurrent ? "h-7 w-7" : "h-6 w-6"} strokeWidth={1.9} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold leading-tight text-navy">{index + 1}. {stage.label}</p>
                  {stage.countLabel ? <p className="mt-2 text-xs font-medium text-slate-500">{stage.countLabel}</p> : null}
                  <p className={cn("mt-1 font-display text-xl font-extrabold tabular-nums", tone.value)}>{percent}%</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
