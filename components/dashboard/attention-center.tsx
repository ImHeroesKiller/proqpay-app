"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronRight,
  Users,
  CalendarX,
  GitBranch,
  Banknote,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/types";

type AttentionRow = {
  id: string;
  title: string;
  count?: number | string;
  href: string;
  priority: "critical" | "warning" | "info";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const priorityMeta = {
  critical: {
    iconWrap: "bg-red-100 text-red-700",
    row: "hover:bg-red-50/60",
    badge: "bg-red-600 text-white",
  },
  warning: {
    iconWrap: "bg-amber-100 text-amber-800",
    row: "hover:bg-amber-50/60",
    badge: "bg-amber-500 text-white",
  },
  info: {
    iconWrap: "bg-sky-100 text-sky-800",
    row: "hover:bg-sky-50/60",
    badge: "bg-sky-600 text-white",
  },
} as const;

function mapAlertsToRows(alerts: AlertItem[]): AttentionRow[] {
  const rows: AttentionRow[] = [];

  for (const a of alerts) {
    if (a.id === "al_fail" || a.type === "danger") {
      const n = a.description.match(/(\d+)/)?.[1];
      rows.push({
        id: a.id,
        title: n
          ? `${n} pembayaran gagal`
          : a.title,
        count: n,
        href: "/payment-confirmation",
        priority: "critical",
        icon: Banknote,
      });
    } else if (a.id === "al_approval" || a.type === "warning") {
      const n = a.description.match(/(\d+)/)?.[1];
      rows.push({
        id: a.id,
        title: n
          ? `${n} payroll menunggu approval`
          : a.title,
        count: n,
        href: "/approval",
        priority: "warning",
        icon: GitBranch,
      });
    } else if (a.id === "al_pi") {
      const n = a.description.match(/(\d+)/)?.[1];
      rows.push({
        id: a.id,
        title: n
          ? `${n} instruksi pembayaran menunggu`
          : a.title,
        count: n,
        href: "/payment-instructions",
        priority: "info",
        icon: Info,
      });
    }
  }

  // Stable executive attention items (supplemental when not covered)
  if (!rows.some((r) => r.id === "bank")) {
    rows.push({
      id: "bank",
      title: "Karyawan belum memiliki rekening bank",
      count: 12,
      href: "/employees",
      priority: "warning",
      icon: Users,
    });
  }
  if (!rows.some((r) => r.id === "att")) {
    rows.push({
      id: "att",
      title: "Data absensi tidak valid",
      count: 8,
      href: "/attendance",
      priority: "warning",
      icon: CalendarX,
    });
  }
  if (!rows.some((r) => r.id === "bpjs")) {
    rows.push({
      id: "bpjs",
      title: "BPJS karyawan perlu diverifikasi",
      count: 24,
      href: "/employees",
      priority: "info",
      icon: Shield,
    });
  }

  return rows.slice(0, 6);
}

export function AttentionCenter({ alerts }: { alerts: AlertItem[] }) {
  const rows = mapAlertsToRows(alerts);

  return (
    <div className="rounded-[20px] border border-border/80 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
        Attention Center
      </h2>
      <div className="divide-y divide-border/70">
        {rows.map((row, index) => {
          const meta = priorityMeta[row.priority];
          const Icon = row.icon;
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={row.href}
                className={cn(
                  "group flex items-center gap-3 py-3.5 transition first:pt-0 last:pb-0",
                  meta.row,
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    meta.iconWrap,
                  )}
                >
                  <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={1.85} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-navy">
                    {row.count != null ? (
                      <span className="font-bold tabular-nums">{row.count} </span>
                    ) : null}
                    {String(row.title).replace(/^\d+\s*/, "")}
                  </p>
                </div>
                {row.priority === "critical" ? (
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                ) : row.priority === "warning" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-navy" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
