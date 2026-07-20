"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboardData } from "@/lib/data/executive-dashboard";
import { formatCompactIDR, formatFullIDR } from "@/lib/format/idr";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const trend = data.payrollTrend.map((t) => ({
    period: t.period.replace(" 2026", ""),
    amount: t.amount / 1_000_000,
    status: t.status,
    href: t.href,
  }));

  const cityPay = data.cityRanking.map((c) => ({
    name: c.cityName,
    value: c.payrollValue / 1_000_000,
    cityCode: c.cityCode,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Payroll Trend by Period"
        subtitle="Existing-client totalNet · click point opens period"
      >
        {trend.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(state) => {
                const i = state?.activeTooltipIndex;
                if (i == null) return;
                const row = data.payrollTrend[i as number];
                if (row?.href) router.push(row.href);
              }}
            >
              <defs>
                <linearGradient id="payFillId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NAVY} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: SLATE }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: SLATE }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [
                  formatCompactIDR(Number(v) * 1_000_000),
                  "Payroll",
                ]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={NAVY}
                strokeWidth={2}
                fill="url(#payFillId)"
                className="cursor-pointer"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </ChartCard>

      <ChartCard
        title="Payroll by City / Regency"
        subtitle="Selected period · click bar uses city filter via ranking table"
      >
        {cityPay.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cityPay}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 10, fill: SLATE }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [
                  formatCompactIDR(Number(v) * 1_000_000),
                  "Value",
                ]}
              />
              <Bar dataKey="value" fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </ChartCard>

      <div className="surface-premium p-5 lg:col-span-2">
        <h3 className="font-heading text-sm font-semibold">
          Quick links from current period
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.selectedPeriod ? (
            <Link
              href={`/payroll/${data.selectedPeriod.id}`}
              className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-[var(--elevation-sm)] hover:border-navy/30"
            >
              Open {data.selectedPeriod.name} (
              {formatCompactIDR(data.selectedPeriod.totalNet)})
            </Link>
          ) : null}
          <Link
            href="/sales?clientType=PROSPECT"
            className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-[var(--elevation-sm)] hover:border-navy/30"
          >
            Pipeline {formatCompactIDR(data.validation.pipeline)}
          </Link>
          <Link
            href="/approval"
            className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-[var(--elevation-sm)] hover:border-navy/30"
          >
            Approvals
          </Link>
          <Link
            href="/payment-instructions"
            className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-[var(--elevation-sm)] hover:border-navy/30"
          >
            Payment instructions
          </Link>
          <Link
            href="/disbursement"
            className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-[var(--elevation-sm)] hover:border-navy/30"
          >
            Disbursement
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Exact historical total: {formatFullIDR(data.validation.historicalPayroll)}
        </p>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
      No data in current filter scope
    </p>
  );
}
