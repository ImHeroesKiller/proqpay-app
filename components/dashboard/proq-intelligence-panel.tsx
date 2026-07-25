"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ProQAvatar,
  type AvatarState,
} from "@/components/ai/proq-avatar";
import type { ProQInsight, ProQIntelligencePayload } from "@/lib/ai/proq-intelligence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";

const severityStyles: Record<
  ProQInsight["severity"],
  string
> = {
  critical:
    "border-red-200 bg-red-50/90 dark:border-red-900 dark:bg-red-950/40",
  warning:
    "border-amber-200 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/40",
  info: "border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/40",
  positive:
    "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40",
};

function mapAvatar(
  state: ProQIntelligencePayload["avatarState"],
): AvatarState {
  if (state === "serious") return "serious";
  if (state === "concern") return "concern";
  if (state === "celebrate") return "celebrate";
  if (state === "smile") return "smile";
  if (state === "thinking") return "thinking";
  return "idle";
}

export function ProQIntelligencePanel({
  initial,
  compact = false,
}: {
  initial?: ProQIntelligencePayload | null;
  compact?: boolean;
}) {
  const [data, setData] = useState<ProQIntelligencePayload | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState(!initial);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [speak, setSpeak] = useState(true);

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
          setSpeak(true);
          window.setTimeout(() => setSpeak(false), 6000);
        }
      } catch {
        /* heuristic already shown */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const insights =
    data?.insights.filter(
      (i) => !ignored.has(i.id) && !resolved.has(i.id),
    ) ?? [];

  const avatarState = speak
    ? mapAvatar(data?.avatarState ?? "thinking")
    : "idle";
  const showParticles =
    speak &&
    (data?.avatarState === "smile" || data?.avatarState === "celebrate");

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-white/10 bg-white/5 p-4 text-white backdrop-blur-md",
        !compact && "sm:p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <ProQAvatar
            state={loading ? "thinking" : avatarState}
            size={compact ? 88 : 112}
            showParticles={showParticles}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-orange" strokeWidth={1.85} />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">
              ProQ AI
            </p>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                {data?.source === "live"
                  ? "Live"
                  : data?.source === "cached"
                    ? "Cached"
                    : "Analyst mode"}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {speak && data ? (
              <motion.div
                key="bubble"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                className="relative mt-3 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-navy shadow-lift"
              >
                <p className="text-sm font-semibold">{data.greeting}</p>
                <p className="mt-1 text-sm text-navy/80">{data.summary}</p>
              </motion.div>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-sm text-white/70"
              >
                Executive payroll analyst ready. Insights update when operations
                change.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-2xl border p-3 text-foreground",
              severityStyles[insight.severity],
            )}
          >
            <p className="text-sm font-semibold">{insight.headline}</p>
            {insight.detail ? (
              <p className="mt-0.5 text-xs text-foreground/75">{insight.detail}</p>
            ) : null}
            <p className="mt-1.5 text-xs font-medium text-foreground/90">
              Recommendation: {insight.recommendation}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                <Link href={insight.moduleHref}>
                  <ExternalLink className="h-3 w-3" strokeWidth={1.85} />
                  Open {insight.moduleLabel}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() =>
                  setIgnored((s) => new Set(s).add(insight.id))
                }
              >
                <EyeOff className="h-3 w-3" strokeWidth={1.85} />
                Ignore
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-emerald-700 dark:text-emerald-300"
                onClick={() =>
                  setResolved((s) => new Set(s).add(insight.id))
                }
              >
                <CheckCircle2 className="h-3 w-3" strokeWidth={1.85} />
                Resolve
              </Button>
            </div>
          </motion.div>
        ))}
        {!loading && insights.length === 0 ? (
          <p className="text-xs text-white/55">
            All insights reviewed. Nice work keeping the cycle clean.
          </p>
        ) : null}
      </div>
    </div>
  );
}
