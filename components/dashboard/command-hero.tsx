"use client";

import { motion } from "framer-motion";
import { ProQIntelligencePanel } from "@/components/dashboard/proq-intelligence-panel";
import type { ProQIntelligencePayload } from "@/lib/ai/proq-intelligence";

export function CommandHero({
  periodName,
  healthLabel,
  healthTone,
  initialIntelligence,
}: {
  periodName?: string;
  healthLabel: string;
  healthTone: "good" | "watch" | "critical";
  initialIntelligence?: ProQIntelligencePayload | null;
}) {
  const toneClass =
    healthTone === "good"
      ? "bg-emerald-400/20 text-emerald-200 ring-emerald-400/30"
      : healthTone === "watch"
        ? "bg-amber-400/20 text-amber-100 ring-amber-400/30"
        : "bg-red-400/20 text-red-100 ring-red-400/30";

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+4px)] gradient-navy text-white shadow-lift">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-orange/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#0b3a6e]/60 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative grid gap-6 p-6 lg:grid-cols-[1.15fr_1fr] lg:p-8">
        <div className="flex flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange"
          >
            Payroll Command Center
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            What is happening now
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 max-w-xl text-sm leading-relaxed text-white/70"
          >
            Executive view of payroll service operations — pipeline health,
            exceptions, and the next best action. Not HRIS. Not ERP. Payroll OS.
          </motion.p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClass}`}
            >
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
              {healthLabel}
            </span>
            {periodName ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                Active · {periodName}
              </span>
            ) : null}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <ProQIntelligencePanel initial={initialIntelligence} />
        </motion.div>
      </div>
    </section>
  );
}
