"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CircleHelp,
  Clock3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
} from "lucide-react";
import type { ExecutiveDashboardData } from "@/lib/data/executive-dashboard";
import { IndonesiaOperatingFootprint } from "@/components/dashboard/executive/indonesia-map";
import { ExecutiveChartsGrid } from "@/components/dashboard/executive/charts-grid";
import {
  GeoFiltersBar,
  type FilterOptions,
} from "@/components/dashboard/executive/geo-filters";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  WAITING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-blue-50 text-blue-800",
  CLOSED: "bg-emerald-50 text-emerald-800",
  PAYMENT_INSTRUCTION_GENERATED: "bg-violet-50 text-violet-800",
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
  const selectedProvince = params.get("province");

  const clock = useMemo(
    () =>
      new Date().toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [],
  );

  const primaryKpis = data.kpis.filter((k) => k.category === "primary");
  const geoKpis = data.kpis.filter((k) => k.category === "geographic");

  const setProvince = (code: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!code || code === "ALL") {
      next.delete("province");
      next.delete("city");
      next.delete("site");
    } else {
      next.set("province", code);
      next.delete("city");
      next.delete("site");
    }
    if (!next.get("country")) next.set("country", "ID");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const onRefresh = () => router.refresh();

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
                onClick={onRefresh}
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
            className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
          >
            {data.breadcrumb.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                <span
                  className={cn(
                    i === data.breadcrumb.length - 1 &&
                      "font-semibold text-navy",
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
        </div>
      </header>

      {/* Primary KPIs from DB */}
      <section
        aria-label="Primary payroll KPIs"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8"
      >
        {primaryKpis.map((kpi) => (
          <article
            key={kpi.id}
            className="surface-premium p-4 transition duration-200 hover:-translate-y-0.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="kpi-value mt-2 text-lg font-bold text-navy sm:text-xl">
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

      {/* Secondary geographic KPIs */}
      <section
        aria-label="Geographic portfolio KPIs"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {geoKpis.map((kpi) => (
          <article key={kpi.id} className="surface-premium p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="kpi-value mt-1.5 text-2xl font-bold text-navy">{kpi.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</p>
          </article>
        ))}
      </section>

      {/* Map + insights + roadmap */}
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <IndonesiaOperatingFootprint
            provinces={data.provinceDistribution}
            selectedProvince={
              selectedProvince && selectedProvince !== "ALL"
                ? selectedProvince
                : null
            }
            onSelectProvince={setProvince}
          />
        </div>
        <div className="surface-premium flex flex-col p-5 xl:col-span-3">
          <h2 className="font-heading text-sm font-semibold">Executive Insights</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rule-based operational intelligence from live data
          </p>
          <ul className="mt-3 flex-1 space-y-2.5">
            {data.insights.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-xl border border-border/60 border-l-[3px] px-3 py-2.5",
                  item.tone === "success" && "border-l-success bg-emerald-50/40",
                  item.tone === "info" && "border-l-info bg-blue-50/40",
                  item.tone === "warning" && "border-l-warning bg-amber-50/40",
                  item.tone === "danger" && "border-l-danger bg-red-50/40",
                )}
              >
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Query batch · {data.meta.queryCount} · {data.meta.durationMs} ms ·{" "}
            {data.meta.geoSource}
          </p>
        </div>
        <div className="surface-premium flex flex-col p-5 xl:col-span-3">
          <h2 className="font-heading text-sm font-semibold">
            Indonesia 3-Year Operational Expansion
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Actual vs planned — not projected payroll figures
          </p>
          <ol className="mt-3 space-y-3">
            {data.roadmap.map((y) => (
              <li
                key={y.year}
                className="rounded-xl border border-border/70 bg-slate-50/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-navy">
                    Year {y.year} · {y.title}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      y.status === "Actual" && "bg-emerald-50 text-emerald-800",
                      y.status === "Planned" && "bg-amber-50 text-amber-800",
                    )}
                  >
                    {y.status === "Planned" ? "Strategic Plan" : y.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Focus: {y.focus.join(" · ")}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* City breakdown */}
      <section className="surface-premium overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-heading text-sm font-semibold">
            City / Regency Payroll Distribution
          </h2>
          <p className="text-xs text-muted-foreground">
            Drill-down from province filter · empty when location unassigned
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "City / Regency",
                  "Clients",
                  "Projects",
                  "Employees",
                  "Historical",
                  "Current draft",
                  "Pipeline",
                  "Last status",
                ].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cityDistribution.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-muted-foreground">
                    No city-level rows in current scope. Prospects without province
                    mapping appear as Unassigned when included.
                  </td>
                </tr>
              ) : (
                data.cityDistribution.map((row) => (
                  <tr
                    key={row.code ?? row.name}
                    className="border-t border-border/60 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-3 font-medium first:pl-5">{row.name}</td>
                    <td className="px-3 py-3 tabular-nums">{row.clientCount}</td>
                    <td className="px-3 py-3 tabular-nums">{row.projectCount}</td>
                    <td className="px-3 py-3 tabular-nums">{row.employeeCount}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatRupiah(row.historicalPayroll)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatRupiah(row.draftPayroll)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatRupiah(row.pipeline)}
                    </td>
                    <td className="px-3 py-3 last:pr-5">
                      {row.lastStatus ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            statusStyles[row.lastStatus] ?? "bg-slate-100",
                          )}
                        >
                          {row.lastStatus.replaceAll("_", " ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Operational analytics">
        <div className="mb-3">
          <h2 className="font-heading text-base font-semibold">Operational Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Tabs separate executive, geography, payroll, workforce, pipeline, and funding
          </p>
        </div>
        <ExecutiveChartsGrid data={data} />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="surface-premium overflow-hidden xl:col-span-8">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-heading text-sm font-semibold">Recent Payroll Cycles</h2>
            <p className="text-xs text-muted-foreground">
              Includes country · province · city · site columns from operational mapping
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {[
                    "Period",
                    "Country",
                    "Province",
                    "City",
                    "Site",
                    "Client",
                    "Project",
                    "Headcount",
                    "Total net",
                    "Status",
                    "Funding",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentCycles.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border/60 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-3 font-medium first:pl-5">{row.period}</td>
                    <td className="px-3 py-3">{row.country}</td>
                    <td className="px-3 py-3">{row.province}</td>
                    <td className="px-3 py-3">{row.city}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.site}</td>
                    <td className="px-3 py-3">{row.client}</td>
                    <td className="px-3 py-3">{row.project}</td>
                    <td className="px-3 py-3 tabular-nums">{row.headcount}</td>
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {row.totalNetLabel}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          statusStyles[row.status] ?? "bg-slate-100",
                        )}
                      >
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 last:pr-5">{row.fundingType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="surface-premium flex flex-col xl:col-span-4">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-heading text-sm font-semibold">Geographic Alerts</h2>
            <p className="text-xs text-muted-foreground">
              Derived from mapping gaps and live workflow — no synthetic disasters
            </p>
          </div>
          <ul className="divide-y divide-border/60">
            {data.alerts.length === 0 ? (
              <li className="px-5 py-4 text-xs text-muted-foreground">
                No geographic or workflow alerts in current scope.
              </li>
            ) : (
              data.alerts.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        a.severity === "critical" && "bg-danger",
                        a.severity === "high" && "bg-warning",
                        a.severity === "medium" && "bg-info",
                        a.severity === "low" && "bg-slate-400",
                      )}
                    />
                    <span className="text-xs font-semibold">{a.type}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.entity} · {a.detail}
                  </p>
                </li>
              ))
            )}
          </ul>
          <div className="mt-auto border-t border-border/70 bg-slate-50/50 px-5 py-3 text-[10px] text-muted-foreground">
            Validation · Hist {formatRupiah(data.validation.historicalPayroll)} ·
            Draft {formatRupiah(data.validation.draftPayroll)} · Pipe{" "}
            {formatRupiah(data.validation.pipeline)} · Emp{" "}
            {data.validation.totalEmployees} · Prospect completed payroll{" "}
            {data.validation.prospectCompletedPayroll}
          </div>
        </aside>
      </section>
    </div>
  );
}
