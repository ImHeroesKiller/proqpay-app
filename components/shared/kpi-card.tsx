"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { KpiCard as KpiCardType } from "@/types";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Users,
  Wallet,
  GitBranch,
  AlertTriangle,
  Banknote,
  Gauge,
  type LucideIcon,
} from "lucide-react";

function parseNumeric(value: string): number | null {
  // Handle "Rp 18,14 M" style compact values — skip animation
  if (/[a-zA-Z]/.test(value.replace(/Rp|IDR/gi, ""))) return null;
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function AnimatedValue({ value }: { value: string }) {
  const numeric = useMemo(() => parseNumeric(value), [value]);
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => {
    if (numeric === null) return value;
    if (value.includes("%")) {
      return `${Math.round(v)}%`;
    }
    if (value.includes("Rp") || value.includes("IDR")) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Math.round(v));
    }
    return new Intl.NumberFormat("id-ID").format(Math.round(v));
  });

  useEffect(() => {
    if (numeric === null) return;
    const controls = animate(motionVal, numeric, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [numeric, motionVal]);

  if (numeric === null) {
    return <span>{value}</span>;
  }

  return <motion.span>{display}</motion.span>;
}

const iconForLabel = (label: string): { icon: LucideIcon; tone: string } => {
  const l = label.toLowerCase();
  if (l.includes("karyawan") || l.includes("headcount"))
    return { icon: Users, tone: "bg-sky-100 text-sky-700" };
  if (l.includes("payroll") || l.includes("bruto") || l.includes("value"))
    return { icon: Wallet, tone: "bg-navy/10 text-navy" };
  if (l.includes("approval"))
    return { icon: GitBranch, tone: "bg-violet-100 text-violet-700" };
  if (l.includes("bermasalah") || l.includes("exception") || l.includes("data"))
    return { icon: AlertTriangle, tone: "bg-amber-100 text-amber-700" };
  if (l.includes("gagal") || l.includes("fail") || l.includes("pembayaran"))
    return { icon: Banknote, tone: "bg-red-100 text-red-700" };
  if (l.includes("sla"))
    return { icon: Gauge, tone: "bg-emerald-100 text-emerald-700" };
  return { icon: Wallet, tone: "bg-muted text-muted-foreground" };
};

export function KpiCard({
  item,
  index = 0,
}: {
  item: KpiCardType;
  index?: number;
}) {
  const { icon: Icon, tone } = iconForLabel(item.label);

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <div className="flex h-full flex-col rounded-[20px] border border-border/80 bg-white p-4 shadow-soft transition hover:border-orange/25 hover:shadow-lift sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </p>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone,
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.85} />
          </span>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-navy sm:text-[26px]">
          <AnimatedValue value={item.value} />
        </p>
        {item.change ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              item.trend === "up" && "text-emerald-600",
              item.trend === "down" && "text-amber-600",
              item.trend === "neutral" && "text-muted-foreground",
            )}
          >
            {item.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.85} />
            ) : item.trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={1.85} />
            ) : (
              <Minus className="h-3.5 w-3.5" strokeWidth={1.85} />
            )}
            <span className="line-clamp-1">{item.change}</span>
          </p>
        ) : null}
      </div>
    </motion.div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block h-full focus-visible:rounded-[20px]"
      >
        {content}
      </Link>
    );
  }
  return content;
}
