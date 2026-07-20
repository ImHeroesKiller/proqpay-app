"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  APPROVAL_SLA,
  DISBURSEMENT_TIMELINE,
  FUNDING_UTIL,
  PAYMENT_COMPLETION,
  PAYROLL_BY_BU,
  PAYROLL_BY_CLIENT,
  PAYROLL_BY_COST_CENTER,
  PAYROLL_BY_COUNTRY,
  TREND_12M,
} from "@/lib/data/executive-command";

const NAVY = "#0B3A6E";
const BLUE = "#2563EB";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
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
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface-premium flex flex-col p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-[200px] flex-1">{children}</div>
    </div>
  );
}

export function ExecutiveChartsGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <ChartCard
        title="Payroll Trend"
        subtitle="12-month volume · IDR billions"
        className="xl:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_12M} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.18} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`IDR ${v} Bn`, "Volume"]} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke={NAVY}
              strokeWidth={2}
              fill="url(#volFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payroll by Country" subtitle="Current month · IDR Bn">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={PAYROLL_BY_COUNTRY}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
          >
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={72}
              tick={{ fontSize: 10, fill: SLATE }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`IDR ${v} Bn`, "Volume"]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {PAYROLL_BY_COUNTRY.map((_, i) => (
                <Cell key={i} fill={i === 0 ? NAVY : BLUE} fillOpacity={1 - i * 0.06} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payroll by Client" subtitle="Top contributors · IDR Bn">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PAYROLL_BY_CLIENT} margin={{ top: 8, right: 4, left: 0, bottom: 32 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: SLATE }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`IDR ${v} Bn`, "Volume"]} />
            <Bar dataKey="value" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="By Cost Center" subtitle="IDR Bn allocation">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PAYROLL_BY_COST_CENTER} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="By Business Unit" subtitle="IDR Bn">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PAYROLL_BY_BU} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={EMERALD} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Funding Utilization" subtitle="Self-funded vs working capital %">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={FUNDING_UTIL} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="self" stackId="1" stroke={NAVY} fill={NAVY} fillOpacity={0.85} name="Self-funded" />
            <Area type="monotone" dataKey="wc" stackId="1" stroke={AMBER} fill={AMBER} fillOpacity={0.75} name="Working capital" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Approval SLA" subtitle="On-time vs late %">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={APPROVAL_SLA} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="onTime" stackId="a" fill={EMERALD} name="On time" radius={[0, 0, 0, 0]} />
            <Bar dataKey="late" stackId="a" fill={AMBER} name="Late" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payment Completion" subtitle="Cumulative completion rate">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={PAYMENT_COMPLETION} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Completed"]} />
            <Line type="monotone" dataKey="rate" stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Disbursement Timeline" subtitle="Batch volume by hour window (UTC+7)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DISBURSEMENT_TIMELINE} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="slot" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="batches" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
