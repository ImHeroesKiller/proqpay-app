"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/types";

const meta = {
  danger: {
    label: "Critical",
    icon: ShieldAlert,
    className:
      "border-red-200/80 bg-red-50/80 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
    badge: "bg-red-600 text-white",
    href: "/payment-confirmation",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className:
      "border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    badge: "bg-amber-500 text-white",
    href: "/approval",
  },
  info: {
    label: "Information",
    icon: Info,
    className:
      "border-sky-200/80 bg-sky-50/70 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
    badge: "bg-sky-600 text-white",
    href: "/payment-instructions",
  },
  success: {
    label: "Healthy",
    icon: CheckCircle2,
    className:
      "border-emerald-200/80 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
    badge: "bg-emerald-600 text-white",
    href: "/dashboard",
  },
} as const;

const priorityOrder = ["danger", "warning", "info", "success"] as const;

export function AttentionCenter({ alerts }: { alerts: AlertItem[] }) {
  const sorted = [...alerts].sort(
    (a, b) =>
      priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type),
  );

  return (
    <div className="space-y-2">
      {sorted.map((alert, index) => {
        const m = meta[alert.type];
        const Icon = m.icon;
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={m.href}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border p-3.5 transition hover:shadow-soft",
                m.className,
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-black/20">
                <Icon className="h-4 w-4" strokeWidth={1.85} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      m.badge,
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="text-[10px] opacity-70">{alert.time}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{alert.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{alert.description}</p>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
