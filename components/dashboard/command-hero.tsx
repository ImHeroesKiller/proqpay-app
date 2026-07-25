import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProQAvatar } from "@/components/ai/proq-avatar";
import { CalendarDays, Clock3, Target, CheckCircle2, ArrowRight } from "lucide-react";

export function CommandHero({
  periodName,
  userName,
  cutOffDate,
  payrollDate,
  slaLabel = "92% On Track",
  insightCount = 3,
}: {
  periodName?: string;
  userName?: string | null;
  cutOffDate?: string;
  payrollDate?: string;
  slaLabel?: string;
  insightCount?: number;
}) {
  const first = userName?.split(" ")[0] ?? "Siti";
  const period = periodName ?? "Juli 2026";

  return (
    <section className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(115deg,#07182d_0%,#0b2c5f_56%,#0866da_100%)] text-white shadow-[0_24px_60px_rgba(8,44,96,0.24)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-28 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-24 right-[18%] h-80 w-80 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="absolute inset-y-0 right-0 w-[46%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_64%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-35" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroLinePremium" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="52%" stopColor="#93c5fd" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,210 C240,60 480,260 780,100 S1200,190 1600,50" fill="none" stroke="url(#heroLinePremium)" strokeWidth="1.5" />
          <path d="M0,245 C300,120 500,245 850,145 S1240,210 1600,120" fill="none" stroke="url(#heroLinePremium)" strokeWidth="1" opacity="0.55" />
        </svg>
      </div>

      <div className="relative grid min-h-[240px] items-center gap-6 px-7 py-7 lg:grid-cols-[1fr_390px] lg:px-9 lg:py-8">
        <div className="min-w-0 self-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">
            Enterprise Payroll Intelligence
          </p>
          <h2 className="font-display text-[30px] font-bold tracking-[-0.03em] sm:text-[34px]">
            Payroll Command Center
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/72 sm:text-[15px]">
            Ringkasan eksekutif real-time untuk siklus payroll {period}. Fokus pada keputusan, risiko, dan langkah berikutnya.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <MetaChip icon={CalendarDays} label="Periode Aktif" value={period} />
            <MetaChip icon={Clock3} label="Cut-off" value={cutOffDate ?? "—"} />
            <MetaChip icon={Target} label="Payroll Date" value={payrollDate ?? "—"} />
            <MetaChip icon={CheckCircle2} label="SLA Payroll" value={slaLabel} accent />
          </div>
        </div>

        <div className="relative flex h-full min-h-[205px] items-end justify-end">
          <div className="relative z-20 mb-4 mr-[154px] w-[205px] rounded-[20px] border border-white/70 bg-white p-4 text-navy shadow-[0_18px_40px_rgba(3,19,46,0.28)]">
            <p className="text-sm font-bold">👋 Hai {first}!</p>
            <p className="mt-2 text-[13px] leading-relaxed text-navy/72">
              Payroll {period} berjalan baik. Ada <strong>{insightCount} hal</strong> yang perlu Anda perhatikan hari ini.
            </p>
            <Button asChild size="sm" className="mt-4 h-9 w-full rounded-xl bg-[#0f5fe8] text-xs font-semibold text-white hover:bg-[#0b4fc4]">
              <Link href="#business-insight">
                Lihat Insight <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <span className="absolute -right-2 bottom-8 h-4 w-4 rotate-45 border-r border-t border-white/70 bg-white" aria-hidden />
          </div>

          <div className="absolute bottom-0 right-0 z-10 flex h-[235px] w-[225px] items-end justify-center">
            <div className="absolute bottom-3 h-[176px] w-[176px] rounded-full border border-white/20 bg-white/10 shadow-inner backdrop-blur-sm" />
            <ProQAvatar state="idle" size={230} className="relative z-10 translate-y-2" float={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ring-1 ${accent ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/30" : "bg-white/[0.09] text-white/90 ring-white/15"}`}>
      <Icon className="h-3.5 w-3.5 opacity-90" strokeWidth={1.85} />
      <span className="text-white/55">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}
