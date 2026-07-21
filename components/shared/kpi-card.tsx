"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiCard as KpiCardType } from "@/types";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function KpiCard({
  item,
  index = 0,
}: {
  item: KpiCardType;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();

  const content = (
    <Card className="h-full border-border/80 shadow-none transition hover:border-msg-blue/25">
      <CardContent className="p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {item.label}
        </p>
        <p className="mt-2 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
          {item.value}
        </p>
        {item.change ? (
          <p
            className={cn(
              "mt-2 flex items-start gap-1 text-xs font-medium leading-snug",
              item.trend === "up" && "text-emerald-700 dark:text-emerald-400",
              item.trend === "down" && "text-amber-700 dark:text-amber-400",
              item.trend === "neutral" && "text-muted-foreground",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {item.trend === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              ) : item.trend === "down" ? (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Minus className="h-3.5 w-3.5" aria-hidden />
              )}
            </span>
            <span>{item.change}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  const wrapped = reduceMotion ? (
    content
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.04, 0.24) }}
      className="h-full"
    >
      {content}
    </motion.div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block h-full focus-visible:rounded-lg"
        aria-label={`${item.label}: ${item.value}`}
      >
        {wrapped}
      </Link>
    );
  }
  return wrapped;
}
