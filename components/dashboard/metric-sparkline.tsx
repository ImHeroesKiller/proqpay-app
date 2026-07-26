"use client";

import { motion } from "framer-motion";

const curves = {
  payroll:
    "M2 31C13 29 17 23 27 25S41 13 51 20s13-8 23-5 13-11 24-4 17-8 28-1 31-12 42-14",
  people:
    "M2 32c10-3 15-16 24-13s11 9 20 3 13-15 23-4 15 1 25-12 34-5 15-8 24 1 32-5",
  sla: "M2 33c9-1 14-13 25-9s14-7 24 0 14-10 25-3 15-1 23-15 34-6 12-2 24-10 33-3",
  saving:
    "M2 34c11-2 13-12 25-9s14 10 26 0 10-18 22-11 14-1 22-17 34-8 10-5 22 3 31-2",
} as const;

export function MetricSparkline({ label }: { label: string }) {
  const key = label.toLowerCase().includes("karyawan")
    ? "people"
    : label.toLowerCase().includes("sla")
      ? "sla"
      : label.toLowerCase().includes("hemat")
        ? "saving"
        : "payroll";
  return (
    <svg
      viewBox="0 0 140 42"
      className="mt-2 h-9 w-full overflow-visible"
      role="img"
      aria-label={`Tren ${label}`}
    >
      <defs>
        <linearGradient id={`fill-${key}`} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#5b3df5" stopOpacity=".22" />
          <stop offset="1" stopColor="#5b3df5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${curves[key]} L140 42 L0 42Z`}
        fill={`url(#fill-${key})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      <motion.path
        d={curves[key]}
        fill="none"
        stroke="#5b3df5"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}
