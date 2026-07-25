"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  CalendarCheck,
  FileText,
  FileSpreadsheet,
  GitBranch,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const actions: {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    label: "Proses Payroll",
    href: "/payroll",
    icon: Wallet,
    tone: "bg-navy/10 text-navy",
  },
  {
    label: "Import Absensi",
    href: "/attendance",
    icon: CalendarCheck,
    tone: "bg-sky-100 text-sky-700",
  },
  {
    label: "Payment Instruction",
    href: "/payment-instructions",
    icon: FileText,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Invoice Baru",
    href: "/reports",
    icon: FileSpreadsheet,
    tone: "bg-orange/15 text-orange",
  },
  {
    label: "Daftar Approval",
    href: "/approval",
    icon: GitBranch,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    label: "Laporan Payroll",
    href: "/reports",
    icon: BarChart3,
    tone: "bg-slate-100 text-slate-700",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.href + action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ y: -3 }}
          >
            <Link
              prefetch={false}
              href={action.href}
              className={cn(
                "group flex h-full flex-col items-center justify-center gap-3 rounded-[18px] border border-border/80 bg-white p-4 text-center shadow-soft transition hover:border-orange/30 hover:shadow-lift",
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105",
                  action.tone,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.85} />
              </span>
              <span className="text-sm font-semibold leading-tight text-navy">
                {action.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
