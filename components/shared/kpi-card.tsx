"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiCard as KpiCardType } from "@/types";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function parseNumeric(value: string): number | null {
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

export function KpiCard({
  item,
  index = 0,
}: {
  item: KpiCardType;
  index?: number;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -3 }}
    >
      <Card className="group overflow-hidden border-transparent hover:border-orange/25">
        <CardContent className="relative p-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-orange/5 transition group-hover:bg-orange/10" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">
            <AnimatedValue value={item.value} />
          </p>
          {item.change ? (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                item.trend === "up" && "text-emerald-600 dark:text-emerald-400",
                item.trend === "down" && "text-amber-600 dark:text-amber-400",
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
        </CardContent>
      </Card>
    </motion.div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block focus-visible:rounded-[var(--radius)]">
        {content}
      </Link>
    );
  }
  return content;
}
