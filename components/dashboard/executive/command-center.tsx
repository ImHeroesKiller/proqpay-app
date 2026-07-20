"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  ACTIVITY_FEED,
  EXEC_KPIS,
  FILTER_OPTIONS,
  FOOTER_WIDGETS,
  INSIGHTS,
  OPERATIONAL_ALERTS,
  RECENT_CYCLES,
} from "@/lib/data/executive-command";
import { GlobalPayrollMap } from "@/components/dashboard/executive/world-map";
import { CycleProgress } from "@/components/dashboard/executive/cycle-progress";
import { ExecutiveChartsGrid } from "@/components/dashboard/executive/charts-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function SelectChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-border/80 bg-white px-2.5 py-1.5 text-xs shadow-[var(--elevation-sm)]">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        className="max-w-[9rem] cursor-pointer bg-transparent font-medium text-foreground outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
    </label>
  );
}

const statusStyles: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Review: "bg-amber-50 text-amber-800",
  Approved: "bg-blue-50 text-blue-800",
  Funding: "bg-violet-50 text-violet-800",
  Completed: "bg-emerald-50 text-emerald-800",
};

const severityDot: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-slate-400",
};

const insightTone: Record<string, string> = {
  success: "border-l-success bg-emerald-50/40",
  info: "border-l-info bg-blue-50/40",
  warning: "border-l-warning bg-amber-50/40",
  danger: "border-l-danger bg-red-50/40",
};

const activityIcon: Record<string, string> = {
  approval: "bg-blue-50 text-secondary-blue",
  client: "bg-slate-100 text-navy",
  funding: "bg-amber-50 text-warning",
  audit: "bg-violet-50 text-violet-700",
  ai: "bg-emerald-50 text-success",
};

export function ExecutiveCommandCenter({
  userName,
  companyLabel,
}: {
  userName?: string | null;
  companyLabel?: string | null;
}) {
  const [region, setRegion] = useState(FILTER_OPTIONS.regions[0]);
  const [country, setCountry] = useState(FILTER_OPTIONS.countries[0]);
  const [bu, setBu] = useState(FILTER_OPTIONS.businessUnits[0]);
  const [cycle, setCycle] = useState(FILTER_OPTIONS.cycles[0]);
  const [currency, setCurrency] = useState(FILTER_OPTIONS.currencies[0]);
  const [client, setClient] = useState(FILTER_OPTIONS.clients[0]);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const clock = useMemo(
    () =>
      now.toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [now],
  );

  const onRefresh = () => {
    setRefreshing(true);
    setNow(new Date());
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Executive header */}
      <header className="surface-premium overflow-hidden p-0">
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#0B3A6E_0%,#0f4a85_55%,#1e5a96_100%)] px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                ProQPay Enterprise
              </p>
              <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Global Payroll Command Center
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-white/75">
                Real-time payroll intelligence across multinational workforce
                operations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                />
                Refresh
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {clock}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {companyLabel ?? "MSG Technology"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Live
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SelectChip
              label="Region"
              options={FILTER_OPTIONS.regions}
              value={region}
              onChange={setRegion}
            />
            <SelectChip
              label="Country"
              options={FILTER_OPTIONS.countries}
              value={country}
              onChange={setCountry}
            />
            <SelectChip
              label="Business Unit"
              options={FILTER_OPTIONS.businessUnits}
              value={bu}
              onChange={setBu}
            />
            <SelectChip
              label="Cycle"
              options={FILTER_OPTIONS.cycles}
              value={cycle}
              onChange={setCycle}
            />
            <SelectChip
              label="Currency"
              options={FILTER_OPTIONS.currencies}
              value={currency}
              onChange={setCurrency}
            />
            <SelectChip
              label="Client"
              options={FILTER_OPTIONS.clients}
              value={client}
              onChange={setClient}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entities, cycles…"
                className="h-9 rounded-xl border-border/80 pl-8 text-xs shadow-[var(--elevation-sm)]"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-2 rounded-xl border border-border/80 bg-white px-2.5 py-1.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
                {(userName ?? "EX")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight">
                  {userName ?? "Executive"}
                </p>
                <p className="text-[10px] text-muted-foreground">Command access</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <section
        aria-label="Primary executive KPIs"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
      >
        {EXEC_KPIS.map((kpi) => (
          <article
            key={kpi.id}
            className="surface-premium group p-4 transition duration-200 hover:-translate-y-0.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="kpi-value mt-2 text-xl font-bold text-navy sm:text-[1.35rem]">
              {kpi.value}
            </p>
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-[11px] font-medium",
                kpi.trend === "up" && "text-success",
                kpi.trend === "down" && "text-warning",
                kpi.trend === "neutral" && "text-muted-foreground",
              )}
            >
              {kpi.trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : kpi.trend === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {kpi.delta}
            </p>
          </article>
        ))}
      </section>

      {/* Map + cycle + intelligence */}
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <GlobalPayrollMap />
        </div>
        <div className="xl:col-span-3">
          <CycleProgress />
        </div>
        <div className="surface-premium flex flex-col p-5 xl:col-span-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-heading flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-secondary-blue" />
                AI Operational Insights
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Executive intelligence · decision support
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Risk score
              </p>
              <Badge className="mt-0.5 bg-amber-50 font-semibold text-amber-800 hover:bg-amber-50">
                Medium
              </Badge>
              <p className="mt-1 text-[10px] font-medium text-success">Trend · Improving</p>
            </div>
          </div>
          <ul className="flex-1 space-y-2.5 overflow-auto">
            {INSIGHTS.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-xl border border-border/60 border-l-[3px] px-3 py-2.5",
                  insightTone[item.tone],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Charts */}
      <section aria-label="Operational charts">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold">Operational Analytics</h2>
            <p className="text-xs text-muted-foreground">
              Trend, allocation, funding, SLA, and disbursement intelligence
            </p>
          </div>
        </div>
        <ExecutiveChartsGrid />
      </section>

      {/* Tables + right rail */}
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="surface-premium overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div>
                <h2 className="font-heading text-sm font-semibold">
                  Recent Payroll Cycles
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cross-entity operational queue
                </p>
              </div>
              <Badge variant="secondary" className="font-medium">
                {RECENT_CYCLES.length} active rows
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {[
                      "Period",
                      "Client",
                      "Country",
                      "Employees",
                      "Payroll",
                      "Funding",
                      "Status",
                      "Approver",
                      "Completion",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-semibold first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_CYCLES.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/60 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-3 font-medium first:pl-5">{row.period}</td>
                      <td className="px-3 py-3">{row.client}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.country}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.employees.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-medium">{row.payroll}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.funding}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            statusStyles[row.status],
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">{row.approver}</td>
                      <td className="px-3 py-3 tabular-nums last:pr-5">{row.completion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-premium overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="font-heading text-sm font-semibold">Operational Alerts</h2>
              <p className="text-xs text-muted-foreground">
                Late approval · funding · compliance · payment · data · schedule
              </p>
            </div>
            <ul className="divide-y divide-border/60">
              {OPERATIONAL_ALERTS.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      severityDot[a.severity],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">{a.type}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {a.entity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-navy">
                    {a.eta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right intelligence rail */}
        <aside className="surface-premium flex flex-col xl:col-span-4">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-heading text-sm font-semibold">
              Executive Activity Feed
            </h2>
            <p className="text-xs text-muted-foreground">
              Approvals · clients · funding · audit · AI
            </p>
          </div>
          <ul className="flex-1 space-y-0 divide-y divide-border/60">
            {ACTIVITY_FEED.map((item) => (
              <li key={item.id} className="flex gap-3 px-5 py-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                    activityIcon[item.kind],
                  )}
                >
                  {item.kind.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.meta}</p>
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {item.time}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border/70 bg-slate-50/50 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI recommendations
            </p>
            <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-foreground">
              <li className="rounded-lg border border-border/70 bg-white px-3 py-2">
                Prioritize Malaysia L2 routing to protect SLA headroom before 15:00 SGT.
              </li>
              <li className="rounded-lg border border-border/70 bg-white px-3 py-2">
                Pre-stage September funding calendar for Singapore and Australia entities.
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Footer widgets */}
      <section
        aria-label="Executive operational summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {FOOTER_WIDGETS.map((w) => (
          <div key={w.id} className="surface-premium p-4">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {w.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {w.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start justify-between gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-right font-semibold text-navy">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
