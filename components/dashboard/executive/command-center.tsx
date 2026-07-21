"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  Clock3,
  RefreshCw,
} from "lucide-react";
import type { ExecutiveDashboardData } from "@/lib/data/executive-dashboard";
import {
  GeoFiltersBar,
  type FilterOptions,
} from "@/components/dashboard/executive/geo-filters";
import { ExecutiveChartsGrid } from "@/components/dashboard/executive/charts-grid";
import { AccountReceivableWidget } from "@/components/dashboard/executive/account-receivable";
import { formatCompactIDR, formatFullIDR } from "@/lib/format/idr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CYCLE_ROW_H = 44;
const CYCLE_HEADER_H = 40;
const CYCLE_MAX_ROWS = 5;

const IndonesiaChoropleth = dynamic(
  () =>
    import("@/components/dashboard/executive/indonesia-choropleth").then(
      (m) => ({ default: m.IndonesiaChoropleth }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="surface-premium p-5">
        <Skeleton className="mb-3 h-6 w-64" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    ),
  },
);

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  WAITING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-blue-50 text-blue-800",
  CLOSED: "bg-emerald-50 text-emerald-800",
};

export function ExecutiveCommandCenter({
  data,
  filterOptions,
  userName,
  companyLabel,
}: {
  data: ExecutiveDashboardData;
  filterOptions: FilterOptions;
  userName?: string | null;
  companyLabel?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedCity = params.get("city");

  const clock = new Date().toLocaleString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const setCity = (code: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!code || code === "ALL") {
      next.delete("city");
    } else {
      next.set("city", code);
      // ensure province for cascading context when known
      const hit = data.map.cities.find((c) => c.cityCode === code);
      if (hit?.provinceCode) next.set("province", hit.provinceCode);
    }
    if (!next.get("scope")) next.set("scope", "client");
    if (!next.get("period") && data.selectedPeriod?.id) {
      next.set("period", data.selectedPeriod.id);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5 pb-2">
      <header className="surface-premium overflow-hidden p-0">
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,#0B3A6E_0%,#0f4a85_55%,#1e5a96_100%)] px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                ProQPay Enterprise
              </p>
              <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {data.positioning.title}
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-white/80">
                {data.positioning.subtitle}
              </p>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/60">
                {data.positioning.context}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.refresh()}
                className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
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
                Live data
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3 sm:px-5">
          <nav
            aria-label="Geographic breadcrumb"
            className="flex flex-wrap items-center gap-1 overflow-x-auto text-xs text-muted-foreground"
          >
            {data.breadcrumb.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                <span
                  className={cn(
                    i === data.breadcrumb.length - 1 && "font-semibold text-navy",
                  )}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <GeoFiltersBar options={filterOptions} />
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Help">
                <CircleHelp className="h-4 w-4" />
              </Button>
              <div className="hidden items-center gap-2 rounded-2xl border border-border/80 bg-white px-2.5 py-1.5 sm:flex">
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
                  <p className="text-[10px] text-muted-foreground">Indonesia ops</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* KPI strip — single horizontal row on desktop */}
      <section
        aria-label="Primary payroll KPIs"
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] xl:grid xl:grid-cols-8 xl:overflow-visible"
      >
        {data.kpis.map((kpi) => (
          <Link
            key={kpi.id}
            href={kpi.href}
            className="surface-premium group flex min-h-[104px] w-[min(46vw,11.5rem)] shrink-0 flex-col p-3.5 transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring xl:w-auto xl:min-w-0"
            title={kpi.fullValue}
            aria-label={`${kpi.label}: ${kpi.value}. ${kpi.delta}. Open ${kpi.href}`}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
                {kpi.label}
              </p>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="kpi-value mt-2 truncate text-lg font-bold text-navy">
              {kpi.value}
            </p>
            <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground">
              {kpi.delta}
            </p>
          </Link>
        ))}
      </section>

      {/* Full-width map */}
      <section aria-label="Indonesia payroll map" className="w-full">
        <IndonesiaChoropleth
          title={data.map.title}
          subtitle={data.map.subtitle}
          metricLabel={data.map.metricLabel}
          domainMax={data.map.domainMax}
          cities={data.map.cities}
          selectedCity={
            selectedCity && selectedCity !== "ALL" ? selectedCity : null
          }
          onSelectCity={setCity}
        />
      </section>

      {/* Insights + alerts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-premium flex flex-col p-5">
          <h2 className="font-heading text-sm font-semibold">Executive Insights</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rule-based operational intelligence
          </p>
          <ul className="mt-3 flex-1 space-y-2.5">
            {data.insights.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border border-border/60 border-l-[3px] px-3 py-2.5",
                  item.tone === "success" && "border-l-success bg-emerald-50/40",
                  item.tone === "info" && "border-l-info bg-blue-50/40",
                  item.tone === "warning" && "border-l-warning bg-amber-50/40",
                )}
              >
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="mt-2 inline-flex text-[11px] font-semibold text-secondary-blue hover:underline"
                >
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Query batch · {data.meta.queryCount} · {data.meta.durationMs} ms
          </p>
        </div>

        <div className="surface-premium flex flex-col p-5">
          <h2 className="font-heading text-sm font-semibold">Operational Alerts</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Generated from live rules · no synthetic disasters
          </p>
          <ul className="mt-3 divide-y divide-border/60">
            {data.alerts.map((a) => (
              <li key={a.id} className="py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      a.severity === "critical" && "bg-danger",
                      a.severity === "high" && "bg-warning",
                      a.severity === "warning" && "bg-warning",
                      a.severity === "medium" && "bg-info",
                      a.severity === "info" && "bg-info",
                      a.severity === "low" && "bg-slate-400",
                    )}
                  />
                  <span className="text-xs font-semibold">{a.type}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.entity} · {a.detail}
                </p>
                <Link
                  href={a.href}
                  className="mt-1 inline-flex text-[11px] font-semibold text-secondary-blue hover:underline"
                >
                  {a.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <AccountReceivableWidget data={data.receivables} />

      <section aria-label="Operational analytics">
        <div className="mb-3">
          <h2 className="font-heading text-base font-semibold">
            Operational Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Click chart points and table rows to open related modules
          </p>
        </div>
        <ExecutiveChartsGrid data={data} />
      </section>

      <section className="surface-premium overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-heading text-sm font-semibold">
                Recent Payroll Cycles
              </h2>
              <p className="text-xs text-muted-foreground">
                Scope Client hides internal · click row for period detail
              </p>
            </div>
            {data.recentCycles.length > CYCLE_MAX_ROWS ? (
              <p className="text-[10px] text-muted-foreground">
                Showing {CYCLE_MAX_ROWS} of {data.recentCycles.length} cycles
              </p>
            ) : null}
          </div>
        </div>
        <div
          className="overflow-auto"
          style={{
            maxHeight:
              CYCLE_HEADER_H +
              Math.min(
                Math.max(data.recentCycles.length, 1),
                CYCLE_MAX_ROWS,
              ) *
                CYCLE_ROW_H,
          }}
        >
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr style={{ height: CYCLE_HEADER_H }}>
                {[
                  "Period",
                  "Client",
                  "Project",
                  "Province",
                  "City",
                  "Headcount",
                  "Payroll value",
                  "Status",
                  "Funding",
                  "Action",
                ].map((h) => (
                  <th key={h} className="px-3 font-semibold first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentCycles.length === 0 ? (
                <tr style={{ height: CYCLE_ROW_H }}>
                  <td colSpan={10} className="px-5 text-muted-foreground">
                    No cycles in current filter scope.
                  </td>
                </tr>
              ) : (
                data.recentCycles.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border/60 hover:bg-slate-50/80"
                    style={{ height: CYCLE_ROW_H }}
                  >
                    <td className="px-3 font-medium first:pl-5">{row.period}</td>
                    <td className="px-3">{row.client}</td>
                    <td className="px-3">{row.project}</td>
                    <td className="px-3">{row.province}</td>
                    <td className="px-3">{row.city}</td>
                    <td className="px-3 tabular-nums">{row.headcount}</td>
                    <td
                      className="px-3 tabular-nums font-semibold"
                      title={formatFullIDR(row.totalNet)}
                    >
                      {row.totalNetCompact}
                    </td>
                    <td className="px-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          statusStyles[row.status] ?? "bg-slate-100",
                        )}
                      >
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3">{row.fundingType}</td>
                    <td className="px-3 last:pr-5">
                      <Link
                        href={row.href}
                        className="font-semibold text-secondary-blue hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/70 bg-slate-50/50 px-5 py-3 text-[10px] text-muted-foreground">
          Validation · Hist {formatCompactIDR(data.validation.historicalPayroll)}{" "}
          · Jun {formatCompactIDR(data.validation.junePayroll)} · Jul{" "}
          {formatCompactIDR(data.validation.julyPayroll)} · Draft{" "}
          {formatCompactIDR(data.validation.draftPayroll)} · Pipe{" "}
          {formatCompactIDR(data.validation.pipeline)} · Emp{" "}
          {data.validation.totalEmployees} · Prospect completed{" "}
          {data.validation.prospectCompletedPayroll}
        </div>
      </section>
    </div>
  );
}
