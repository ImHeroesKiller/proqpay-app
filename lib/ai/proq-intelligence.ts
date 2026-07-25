import { generateWithPool } from "@/lib/ai/gemini-pool";
import type { AlertItem, KpiCard, PayrollPeriod } from "@/types";

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

export type ProQInsight = {
  id: string;
  severity: InsightSeverity;
  headline: string;
  detail: string;
  recommendation: string;
  moduleHref: string;
  moduleLabel: string;
};

export type ProQIntelligencePayload = {
  greeting: string;
  summary: string;
  insights: ProQInsight[];
  avatarState:
    | "smile"
    | "concern"
    | "serious"
    | "celebrate"
    | "idle"
    | "thinking";
  source: "live" | "heuristic" | "cached";
  workerId?: string;
  model?: string;
  latencyMs?: number;
};

const SYSTEM = `You are ProQ AI — Executive Payroll Analyst for ProQPay Enterprise Payroll OS.
You are NOT a chatbot. Never greet like ChatGPT. Never say "As an AI".
Speak as a senior payroll operations analyst to an executive.
Return ONLY valid JSON matching this schema:
{
  "greeting": "short personal greeting with first name if provided",
  "summary": "2 short sentences on overall payroll posture",
  "insights": [
    {
      "id": "string",
      "severity": "critical|warning|info|positive",
      "headline": "one factual sentence",
      "detail": "one supporting sentence",
      "recommendation": "imperative action sentence",
      "moduleHref": "/path",
      "moduleLabel": "Module name"
    }
  ],
  "avatarState": "smile|concern|serious|celebrate|idle|thinking"
}
Max 5 insights. Prefer actionable payroll ops: approvals, payments, attendance, SLA, tax/BPJS, collection.
Use Indonesian Rupiah context when amounts appear. Be precise and calm.`;

function firstName(name?: string | null) {
  if (!name) return "there";
  return name.split(" ")[0] ?? "there";
}

function hourGreeting(name?: string | null) {
  const h = new Date().getHours();
  const n = firstName(name);
  if (h < 11) return `Good morning, ${n}.`;
  if (h < 15) return `Good afternoon, ${n}.`;
  if (h < 19) return `Good evening, ${n}.`;
  return `Hello, ${n}.`;
}

export function buildHeuristicInsights(input: {
  userName?: string | null;
  kpis: KpiCard[];
  alerts: AlertItem[];
  periods: PayrollPeriod[];
}): ProQIntelligencePayload {
  const insights: ProQInsight[] = [];
  const alerts = input.alerts;

  for (const a of alerts) {
    if (a.type === "danger") {
      insights.push({
        id: a.id,
        severity: "critical",
        headline: a.title,
        detail: a.description,
        recommendation: "Open the related module and resolve before next cycle.",
        moduleHref: "/payment-confirmation",
        moduleLabel: "Payment confirmation",
      });
    } else if (a.type === "warning") {
      insights.push({
        id: a.id,
        severity: "warning",
        headline: a.title,
        detail: a.description,
        recommendation: "Review pending steps and clear blockers today.",
        moduleHref: "/approval",
        moduleLabel: "Approval",
      });
    } else if (a.type === "info") {
      insights.push({
        id: a.id,
        severity: "info",
        headline: a.title,
        detail: a.description,
        recommendation: "Advance instructions so client transfer can start.",
        moduleHref: "/payment-instructions",
        moduleLabel: "Payment instructions",
      });
    }
  }

  const waiting = input.periods.find((p) => p.status === "WAITING");
  if (waiting) {
    insights.push({
      id: `period-${waiting.id}`,
      severity: "info",
      headline: `${waiting.name} is in progress.`,
      detail: `Net payroll ${waiting.totalNet.toLocaleString("id-ID")} IDR across ${waiting.employeeCount} employees.`,
      recommendation: "Keep pipeline velocity: validation → calculation → approval.",
      moduleHref: `/payroll/${waiting.id}`,
      moduleLabel: "Payroll",
    });
  }

  const closed = input.periods.filter((p) => p.status === "CLOSED").length;
  if (closed > 0 && insights.every((i) => i.severity !== "critical")) {
    insights.push({
      id: "positive-closed",
      severity: "positive",
      headline: `${closed} payroll period(s) closed successfully.`,
      detail: "Payment confirmation workflow is completing without major blockers.",
      recommendation: "Share SLA summary with the client stakeholder.",
      moduleHref: "/reports",
      moduleLabel: "Reports",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady",
      severity: "positive",
      headline: "Payroll operations are steady.",
      detail: "No critical exceptions detected in the current scope.",
      recommendation: "Continue monitoring attendance completeness before next run.",
      moduleHref: "/attendance",
      moduleLabel: "Attendance",
    });
  }

  const hasCritical = insights.some((i) => i.severity === "critical");
  const hasWarning = insights.some((i) => i.severity === "warning");
  const hasPositive = insights.every(
    (i) => i.severity === "positive" || i.severity === "info",
  );

  let avatarState: ProQIntelligencePayload["avatarState"] = "idle";
  if (hasCritical) avatarState = "serious";
  else if (hasWarning) avatarState = "concern";
  else if (hasPositive) avatarState = "smile";

  const top = insights.slice(0, 3);
  const summary =
    top.length > 0
      ? `I found ${top.length} important insight${top.length > 1 ? "s" : ""} for today. ${top[0]?.headline ?? ""}`
      : "Operations look stable.";

  return {
    greeting: hourGreeting(input.userName),
    summary,
    insights: insights.slice(0, 5),
    avatarState,
    source: "heuristic",
  };
}

function safeParseInsights(
  text: string,
  fallback: ProQIntelligencePayload,
): ProQIntelligencePayload {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<ProQIntelligencePayload>;
    if (!parsed.insights || !Array.isArray(parsed.insights)) return fallback;
    return {
      greeting: parsed.greeting || fallback.greeting,
      summary: parsed.summary || fallback.summary,
      insights: parsed.insights.slice(0, 5).map((ins, idx) => ({
        id: ins.id || `ai-${idx}`,
        severity: (["critical", "warning", "info", "positive"] as const).includes(
          ins.severity as InsightSeverity,
        )
          ? (ins.severity as InsightSeverity)
          : "info",
        headline: String(ins.headline ?? "Insight"),
        detail: String(ins.detail ?? ""),
        recommendation: String(ins.recommendation ?? "Review the related module."),
        moduleHref: String(ins.moduleHref ?? "/dashboard"),
        moduleLabel: String(ins.moduleLabel ?? "Dashboard"),
      })),
      avatarState: parsed.avatarState || fallback.avatarState,
      source: "live",
    };
  } catch {
    return fallback;
  }
}

export async function runProQIntelligence(input: {
  userName?: string | null;
  kpis: KpiCard[];
  alerts: AlertItem[];
  periods: PayrollPeriod[];
}): Promise<ProQIntelligencePayload> {
  const heuristic = buildHeuristicInsights(input);

  const context = {
    userName: input.userName,
    kpis: input.kpis,
    alerts: input.alerts,
    periods: input.periods.map((p) => ({
      name: p.name,
      status: p.status,
      totalNet: p.totalNet,
      employeeCount: p.employeeCount,
      fundingModel: p.fundingModel,
      payDate: p.payDate,
    })),
  };

  const result = await generateWithPool({
    system: SYSTEM,
    prompt: `Analyze this payroll operations snapshot and produce executive insights.\n\n${JSON.stringify(context)}`,
    cacheKey: `proq-intel:${input.userName ?? "anon"}:${input.alerts.map((a) => a.id).join(",")}:${input.periods[0]?.id ?? "none"}`,
  });

  if (!result) return heuristic;

  const live = safeParseInsights(result.text, heuristic);
  return {
    ...live,
    source: result.cached ? "cached" : "live",
    workerId: result.workerId,
    model: result.model,
    latencyMs: result.latencyMs,
  };
}
