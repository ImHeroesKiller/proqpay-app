"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import type { ExecutiveDashboardData } from "@/lib/data/executive-dashboard";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAVY = "#0B3A6E";
const BLUE = "#2563EB";
const SLATE = "#94A3B8";
const GRID = "#E8EEF5";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E8EEF5",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

const TABS = [
  "Executive",
  "Geography",
  "Payroll",
  "Workforce",
  "Pipeline",
  "Funding",
] as const;

type Tab = (typeof TABS)[number];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-premium flex min-h-[240px] flex-col p-5">
      <div className="mb-3">
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-[180px] flex-1">{children}</div>
    </div>
  );
}

export function ExecutiveChartsGrid({ data }: { data: ExecutiveDashboardData }) {
  const [tab, setTab] = useState<Tab>("Executive");

  const provincePay = data.provinceDistribution
    .filter((p) => p.historicalPayroll + p.draftPayroll > 0)
    .map((p) => ({
      name: p.name,
      historical: p.historicalPayroll / 1_000_000,
      draft: p.draftPayroll / 1_000_000,
    }));

  const cityPay = data.cityDistribution
    .filter((c) => c.historicalPayroll + c.draftPayroll > 0)
    .map((c) => ({
      name: c.name,
      historical: c.historicalPayroll / 1_000_000,
      draft: c.draftPayroll / 1_000_000,
    }));

  const trend = data.payrollTrend.map((t) => ({
    period: t.period.replace(" 2026", ""),
    amount: t.amount / 1_000_000,
    status: t.status,
  }));

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap gap-1 rounded-xl border border-border/70 bg-white p-1 shadow-[var(--elevation-sm)]"
        role="tablist"
        aria-label="Analytics views"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === t
                ? "bg-navy text-white"
                : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
            )}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2" role="tabpanel">
        {(tab === "Executive" || tab === "Payroll") && (
          <ChartCard
            title="Payroll Trend by Period"
            subtitle="Existing-client totalNet · IDR millions · CLOSED vs DRAFT labeled in data"
          >
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={NAVY} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [formatRupiah(Number(v) * 1_000_000), "Payroll"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke={NAVY} strokeWidth={2} fill="url(#payFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {(tab === "Executive" || tab === "Geography" || tab === "Payroll") && (
          <ChartCard title="Payroll by Province" subtitle="Historical vs draft · IDR millions">
            {provincePay.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provincePay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="historical" name="Historical CLOSED" fill={NAVY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="draft" name="Draft" fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {(tab === "Geography" || tab === "Payroll") && (
          <ChartCard title="Payroll by City / Regency" subtitle="Within current filter scope">
            {cityPay.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityPay} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="historical" name="Historical" fill={NAVY} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="draft" name="Draft" fill={BLUE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {(tab === "Workforce" || tab === "Geography") && (
          <ChartCard title="Employees by Province" subtitle="Active + probation on existing clients">
            {data.workforceByProvince.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.workforceByProvince} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {(tab === "Pipeline" || tab === "Executive") && (
          <ChartCard title="Prospect Pipeline by Geography" subtitle="Estimated payroll · OPEN only">
            {data.pipelineByGeo.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pipelineByGeo} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: SLATE }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(v / 1e9).toFixed(1)}B`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatRupiah(Number(v)), "Pipeline"]} />
                  <Bar dataKey="amount" fill={BLUE} radius={[4, 4, 0, 0]}>
                    {data.pipelineByGeo.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? BLUE : NAVY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {(tab === "Funding" || tab === "Payroll") && (
          <ChartCard title="Workflow Status by Geography Scope" subtitle="Period counts in current filter">
            {data.workflowByStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.workflowByStatus} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 9, fill: SLATE }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}

        {tab === "Geography" && (
          <ChartCard title="Client Portfolio by Geography" subtitle="Existing vs prospect counts">
            {data.portfolioByGeo.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.portfolioByGeo} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="existing" name="Existing" fill={NAVY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prospect" name="Prospect" fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
      No data in current geographic scope
    </p>
  );
}
