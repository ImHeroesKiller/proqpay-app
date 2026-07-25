"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ExternalLink,
  EyeOff,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import type {
  ProQInsight,
  ProQIntelligencePayload,
} from "@/lib/ai/proq-intelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ProQAvatar = dynamic(
  () =>
    import("@/components/ai/proq-avatar").then((m) => m.ProQAvatar),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-36 animate-pulse rounded-full bg-muted" />
    ),
  },
);

const severityStyles: Record<ProQInsight["severity"], string> = {
  critical: "border-red-200 bg-red-50/90",
  warning: "border-amber-200 bg-amber-50/90",
  info: "border-sky-200 bg-sky-50/80",
  positive: "border-emerald-200 bg-emerald-50/80",
};

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
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());

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

  const insights =
    data?.insights
      .filter((i) => !ignored.has(i.id) && !resolved.has(i.id))
      .slice(0, 3) ?? [];

  const avatarState = loading
    ? "thinking"
    : mapAvatar(data?.avatarState ?? "thinking");

  return (
    <div
      id="business-insight"
      className="rounded-[20px] border border-border/80 bg-white p-5 shadow-soft sm:p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <h2 className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
          Business Insight AI
        </h2>
        <Badge className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange hover:bg-orange/20">
          BETA
        </Badge>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-[160px_1fr] lg:grid-cols-[180px_1fr]">
        <div className="flex items-start justify-center md:justify-start">
          <ProQAvatar state={avatarState} size={168} float />
        </div>

        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-2xl border p-4",
                severityStyles[insight.severity],
              )}
            >
              <p className="text-[15px] font-semibold leading-snug text-navy">
                {insight.headline}
              </p>
              {insight.detail ? (
                <p className="mt-1 text-sm leading-relaxed text-navy/70">
                  {insight.detail}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs"
                >
                  <Link href={insight.moduleHref}>
                    <Search className="h-3.5 w-3.5" strokeWidth={1.85} />
                    Review
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs"
                >
                  <Link href={insight.moduleHref}>
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.85} />
                    Buka modul
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs text-emerald-700"
                  onClick={() =>
                    setResolved((s) => new Set(s).add(insight.id))
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.85} />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs"
                  onClick={() =>
                    setIgnored((s) => new Set(s).add(insight.id))
                  }
                >
                  <EyeOff className="h-3.5 w-3.5" strokeWidth={1.85} />
                  Ignore
                </Button>
              </div>
            </motion.div>
          ))}
          {!loading && insights.length === 0 ? (
            <p className="rounded-2xl border border-border bg-[#F7F8FC] p-4 text-sm text-muted-foreground">
              Semua insight sudah ditinjau. Operasi payroll terlihat stabil.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
