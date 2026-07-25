"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock3, Target, CheckCircle2 } from "lucide-react";

const ProQAvatar = dynamic(
  () =>
    import("@/components/ai/proq-avatar").then((m) => m.ProQAvatar),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-white/10" />
    ),
  },
);

export function CommandHero({
  periodName,
  userName,
  cutOffDate,
  payrollDate,
  slaLabel = "92% On Track",
  insightCount = 3,
}: {
  periodName?: string;
  userName?: string | null;
  cutOffDate?: string;
  payrollDate?: string;
  slaLabel?: string;
  insightCount?: number;
}) {
  const first = userName?.split(" ")[0] ?? "Siti";
  const period = periodName ?? "Juli 2026";

  return (
    <section className="relative min-h-[190px] overflow-hidden rounded-[20px] bg-gradient-to-br from-[#061422] via-[#0b1f33] to-[#0b4aaa] text-white shadow-lift lg:min-h-[200px]">
      {/* Abstract glowing lines */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl"
          animate={{ x: [0, 24, 0], y: [0, 16, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-[20%] h-64 w-64 rounded-full bg-orange/15 blur-3xl"
          animate={{ x: [0, -16, 0], y: [0, -12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f28c28" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,140 C200,40 400,220 700,90 S1100,160 1400,60"
            fill="none"
            stroke="url(#heroLine)"
            strokeWidth="1.5"
          />
          <path
            d="M0,180 C280,100 480,200 780,120 S1200,180 1600,100"
            fill="none"
            stroke="url(#heroLine)"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="relative grid items-center gap-4 p-6 sm:p-7 lg:grid-cols-[1fr_0.55fr] lg:gap-2 lg:p-8">
        <div className="min-w-0">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold tracking-tight sm:text-[28px]"
          >
            Payroll Command Center
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-[15px]"
          >
            Ringkasan eksekutif real-time untuk siklus payroll {period}
          </motion.p>

          <div className="mt-5 flex flex-wrap gap-2">
            <MetaChip
              icon={CalendarDays}
              label="Periode Aktif"
              value={period}
            />
            <MetaChip
              icon={Clock3}
              label="Cut-off Date"
              value={cutOffDate ?? "—"}
            />
            <MetaChip
              icon={Target}
              label="Payroll Date"
              value={payrollDate ?? "—"}
            />
            <MetaChip
              icon={CheckCircle2}
              label="SLA Payroll"
              value={slaLabel}
              accent
            />
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-end gap-3 sm:flex-row sm:items-end lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="relative z-10 order-2 max-w-[260px] rounded-2xl rounded-br-md bg-white px-4 py-3 text-navy shadow-lift sm:order-1"
          >
            <p className="text-sm font-semibold">Hai {first}!</p>
            <p className="mt-1 text-[13px] leading-snug text-navy/80">
              Payroll {period} berjalan baik.
              <br />
              Ada {insightCount} hal yang perlu Anda perhatikan hari ini.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-3 h-8 rounded-lg bg-orange px-3 text-xs font-semibold text-white hover:bg-orange/90"
            >
              <Link href="#business-insight">Lihat Insight</Link>
            </Button>
            <span
              className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 bg-white sm:right-auto sm:-right-1.5 sm:bottom-5 sm:left-auto"
              aria-hidden
            />
          </motion.div>

          <div className="order-1 -mb-3 flex justify-center sm:order-2 sm:justify-end">
            <ProQAvatar state="wave" size={200} className="lg:!h-[220px] lg:!w-[220px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
        accent
          ? "bg-emerald-400/15 text-emerald-100 ring-emerald-400/30"
          : "bg-white/10 text-white/85 ring-white/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5 opacity-80" strokeWidth={1.85} />
      <span className="opacity-70">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
