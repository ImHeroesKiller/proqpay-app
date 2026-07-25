"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  CalendarCheck,
  FileSpreadsheet,
  FileText,
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
    label: "Run Payroll",
    href: "/payroll",
    icon: Wallet,
    tone: "from-navy to-[#0b3a6e]",
  },
  {
    label: "Import Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    tone: "from-[#0b3a6e] to-[#1d4f8c]",
  },
  {
    label: "Generate Invoice",
    href: "/reports",
    icon: FileSpreadsheet,
    tone: "from-orange to-[#e07d1c]",
  },
  {
    label: "Payment Instruction",
    href: "/payment-instructions",
    icon: FileText,
    tone: "from-emerald-700 to-emerald-600",
  },
  {
    label: "Approval",
    href: "/approval",
    icon: GitBranch,
    tone: "from-violet-700 to-violet-600",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    tone: "from-slate-700 to-slate-600",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.href + action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ y: -4 }}
          >
            <Link
              href={action.href}
              className={cn(
                "group flex h-full flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-border/60 bg-card/80 p-4 text-center shadow-soft backdrop-blur transition hover:border-orange/30 hover:shadow-lift",
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft transition group-hover:scale-105",
                  action.tone,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.85} />
              </span>
              <span className="text-xs font-semibold leading-tight">
                {action.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
