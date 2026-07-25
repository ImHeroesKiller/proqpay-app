"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  Wallet,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ProjectMission = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  site?: string | null;
  location?: string | null;
  assignments: number;
  payrollPeriods: number;
  score: number;
  grade: string;
  scoreWhy: string;
  risks: {
    key: string;
    label: string;
    level: "low" | "medium" | "high";
    detail: string;
  }[];
  health: "healthy" | "watch" | "critical";
  insight: string;
};

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 75) return "text-sky-600 dark:text-sky-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const riskTone = {
  low: "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  medium:
    "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  high: "border-red-200 bg-red-50/80 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
};

export function ProjectMissionCard({
  project,
  index = 0,
}: {
  project: ProjectMission;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3 }}
    >
      <Card className="overflow-hidden">
        <div
          className={cn(
            "h-1.5 w-full",
            project.health === "healthy" && "bg-emerald-500",
            project.health === "watch" && "bg-amber-500",
            project.health === "critical" && "bg-red-500",
          )}
        />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Payroll contract · {project.code}
              </p>
              <CardTitle className="mt-1 font-display text-lg">
                {project.name}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Client · {project.clientName}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-display text-3xl font-bold tabular-nums",
                  scoreColor(project.score),
                )}
              >
                {project.grade}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                {project.score}/100
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{project.status}</Badge>
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" strokeWidth={1.85} />
              {project.assignments} assignments
            </Badge>
            <Badge variant="outline">
              <Wallet className="mr-1 h-3 w-3" strokeWidth={1.85} />
              {project.payrollPeriods} periods
            </Badge>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.85} />
              ProQ AI insight
            </div>
            <p className="mt-1.5 text-sm">{project.insight}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Score drivers: {project.scoreWhy}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Risk radar
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {project.risks.map((risk) => (
                <div
                  key={risk.key}
                  className={cn(
                    "rounded-2xl border p-2.5 text-xs",
                    riskTone[risk.level],
                  )}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {risk.level === "high" ? (
                      <AlertTriangle className="h-3 w-3" strokeWidth={1.85} />
                    ) : risk.level === "medium" ? (
                      <Clock className="h-3 w-3" strokeWidth={1.85} />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" strokeWidth={1.85} />
                    )}
                    {risk.label}
                  </div>
                  <p className="mt-1 opacity-85">{risk.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm">
              <Link href="/payroll">
                <Activity className="h-3.5 w-3.5" strokeWidth={1.85} />
                Open payroll
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/attendance">Attendance</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/reports">
                <Shield className="h-3.5 w-3.5" strokeWidth={1.85} />
                SLA report
              </Link>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {[project.site, project.location].filter(Boolean).join(" · ") ||
              "Site details n/a"}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function MissionControlHero({ count }: { count: number }) {
  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+4px)] gradient-navy p-6 text-white shadow-lift sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
          Payroll Mission Control
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Client payroll contracts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Each project is a live payroll mission — health, SLA, risk, and the next
          action. Not a task board.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
          {count} active mission{count === 1 ? "" : "s"}
        </div>
      </div>
    </section>
  );
}
