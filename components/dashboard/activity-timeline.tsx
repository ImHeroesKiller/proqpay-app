"use client";

import { motion } from "framer-motion";
import type { AuditLog } from "@/types";
import { cn } from "@/lib/utils";

const entityColor: Record<string, string> = {
  PayrollPeriod: "bg-orange/15 text-orange",
  PaymentInstruction: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  PaymentConfirmation:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ApprovalStep: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  WorkingCapital:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function ActivityTimeline({ items }: { items: AuditLog[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recent activity yet.</p>
    );
  }

  return (
    <ol className="relative space-y-0">
      <div
        className="absolute bottom-2 left-[15px] top-2 w-px bg-border"
        aria-hidden
      />
      {items.map((item, index) => {
        const initials = item.userName
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const badge =
          entityColor[item.entity] ??
          "bg-muted text-muted-foreground";
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative flex gap-3 py-3 pl-1"
          >
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white dark:bg-orange">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{item.action}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    badge,
                  )}
                >
                  {item.entity}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.userName} · {item.userRole.replaceAll("_", " ")}
                {item.detail ? ` · ${item.detail}` : ""}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(item.timestamp).toLocaleString("id-ID")}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
