"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import type { ProQIntelligencePayload } from "@/lib/ai/proq-intelligence";

const ProQAvatar = dynamic(
  () => import("@/components/ai/proq-avatar").then((m) => m.ProQAvatar),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-36 animate-pulse rounded-full bg-muted" />
    ),
  },
);

function mapAvatar(
  state: ProQIntelligencePayload["avatarState"],
): "pointing" | "thinking" | "concern" | "celebrate" | "smile" | "idle" {
  if (state === "serious" || state === "concern") return "concern";
  if (state === "celebrate") return "celebrate";
  if (state === "smile") return "smile";
  if (state === "thinking") return "thinking";
  return "pointing";
}

export function BusinessInsightPanel({
  initial,
}: {
  initial?: ProQIntelligencePayload | null;
}) {
  const [data, setData] = useState<ProQIntelligencePayload | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/insights", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          intelligence: ProQIntelligencePayload;
        };
        if (!cancelled && json.intelligence) {
          setData(json.intelligence);
        }
      } catch {
        /* heuristic already shown — never crash dashboard */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const insights = data?.insights.slice(0, 3) ?? [];

  const avatarState = loading
    ? "thinking"
    : mapAvatar(data?.avatarState ?? "thinking");

  return (
    <section
      id="business-insight"
      className="relative flex h-full min-h-[472px] flex-col overflow-hidden rounded-[22px] border border-violet-300/70 bg-[radial-gradient(circle_at_75%_10%,rgba(102,75,255,.6),transparent_28%),linear-gradient(160deg,#071542_0%,#10145d_48%,#062967_100%)] p-5 text-white shadow-[0_10px_30px_rgba(56,39,180,.28)]"
      aria-label="IDA Intelligent Digital Assistant"
    >
      <div className="absolute inset-x-5 top-0 h-px bg-violet-200/80 shadow-[0_0_14px_5px_rgba(196,158,255,.85)]" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="font-display text-xl font-bold">IDA</h2>
            <p className="text-[11px] text-blue-100">
              Intelligent Digital Assistant
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-violet-700">
          BETA
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/70" />
        ) : null}
      </div>
      <div className="relative mt-3 flex min-h-[145px] items-end justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_90%,rgba(109,86,255,.6),transparent_45%)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,.16)_50%,transparent_51%),linear-gradient(transparent_49%,rgba(255,255,255,.1)_50%,transparent_51%)] bg-[size:38px_38px] opacity-30" />
        <ProQAvatar
          state={avatarState}
          size={142}
          className="relative translate-y-7 border-2 border-white/25 shadow-[0_0_38px_rgba(182,138,255,.65)]"
        />
      </div>
      <div className="relative mt-3">
        <h3 className="text-center font-display text-[15px] font-bold">
          Ringkasan & Insight Hari Ini
        </h3>
        <div className="mt-3 space-y-2.5">
          {insights.map((insight) => {
            const Icon =
              insight.severity === "positive"
                ? CheckCircle2
                : insight.severity === "warning" ||
                    insight.severity === "critical"
                  ? TriangleAlert
                  : TrendingUp;
            const iconTone =
              insight.severity === "positive"
                ? "text-emerald-300"
                : insight.severity === "warning" ||
                    insight.severity === "critical"
                  ? "text-amber-300"
                  : "text-violet-300";
            return (
              <div
                key={insight.id}
                className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-3"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} />
                <p className="text-[12px] leading-relaxed text-blue-50">
                  {insight.detail || insight.headline}
                </p>
              </div>
            );
          })}
          {!loading && insights.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3 text-[12px] text-blue-50">
              Operasi payroll terlihat stabil dan tidak ada pengecualian kritis.
            </div>
          ) : null}
        </div>
      </div>
      <Link
        href="/ida"
        className="relative mt-auto flex items-center justify-between pt-5 text-sm font-semibold text-white hover:text-violet-100"
      >
        Klik untuk ngobrol dengan IDA <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
}
