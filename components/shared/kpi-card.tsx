import Link from "next/link";
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

const iconForLabel = (label: string): { icon: LucideIcon; tone: string; accent: string } => {
  const l = label.toLowerCase();
  if (l.includes("karyawan") || l.includes("headcount"))
    return { icon: Users, tone: "bg-blue-50 text-blue-700", accent: "from-blue-500/10" };
  if (l.includes("payroll") || l.includes("bruto") || l.includes("value"))
    return { icon: Wallet, tone: "bg-emerald-50 text-emerald-700", accent: "from-emerald-500/10" };
  if (l.includes("approval"))
    return { icon: GitBranch, tone: "bg-violet-50 text-violet-700", accent: "from-violet-500/10" };
  if (l.includes("bermasalah") || l.includes("exception") || l.includes("data"))
    return { icon: AlertTriangle, tone: "bg-amber-50 text-amber-700", accent: "from-amber-500/10" };
  if (l.includes("gagal") || l.includes("fail") || l.includes("pembayaran"))
    return { icon: Banknote, tone: "bg-rose-50 text-rose-700", accent: "from-rose-500/10" };
  if (l.includes("sla"))
    return { icon: Gauge, tone: "bg-cyan-50 text-cyan-700", accent: "from-cyan-500/10" };
  return { icon: Wallet, tone: "bg-slate-100 text-slate-600", accent: "from-slate-500/10" };
};

export function KpiCard({ item }: { item: KpiCardType; index?: number }) {
  const { icon: Icon, tone, accent } = iconForLabel(item.label);

  const content = (
    <div className="group h-full">
      <div className="relative flex h-full min-h-[142px] flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent", accent)} />
        <div className="relative flex items-start justify-between gap-3">
          <p className="max-w-[75%] text-[11px] font-bold uppercase leading-4 tracking-[0.09em] text-slate-500">
            {item.label}
          </p>
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm", tone)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
        </div>
        <p className="relative mt-4 font-display text-[29px] font-extrabold leading-none tracking-[-0.04em] text-navy">
          {item.value}
        </p>
        {item.change ? (
          <p className={cn("relative mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold", item.trend === "up" && "text-emerald-600", item.trend === "down" && "text-amber-600", item.trend === "neutral" && "text-slate-500")}>
            {item.trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : item.trend === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            <span className="line-clamp-1">{item.change}</span>
          </p>
        ) : null}
      </div>
    </div>
  );

  return item.href ? (
    <Link href={item.href} className="block h-full rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : content;
}
