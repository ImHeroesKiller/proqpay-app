"use client";

import Link from "next/link";
import type { ReceivablesSummary } from "@/lib/data/receivables";
import { formatCompactIDR, formatFullIDR } from "@/lib/format/idr";
import { routes } from "@/lib/routes/app-routes";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

const ROW_H = 40;
const MAX_VISIBLE = 5;
const HEADER_H = 36;

export function AccountReceivableWidget({
  data,
}: {
  data: ReceivablesSummary;
}) {
  const totalBar =
    data.clientFunded + data.workingCapitalUsed || 1;
  const clientPct = Math.round((data.clientFunded / totalBar) * 100);
  const wcPct = Math.round((data.workingCapitalUsed / totalBar) * 100);

  const bodyMax =
    data.items.length === 0
      ? ROW_H
      : Math.min(data.items.length, MAX_VISIBLE) * ROW_H;

  return (
    <section className="surface-premium overflow-hidden" aria-label="Account Receivable">
      <div className="border-b border-border/70 px-5 py-4">
        <h2 className="font-heading text-sm font-semibold">Account Receivable</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Client receivables, funded payroll, and working capital exposure.
        </p>
      </div>

      <div className="grid gap-3 border-b border-border/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Total Outstanding"
          value={formatCompactIDR(data.totalOutstanding)}
          full={formatFullIDR(data.totalOutstanding)}
          hint="WC settlement proxy"
          href={routes.workingCapital.list()}
        />
        <Metric
          label="Client Funded"
          value={formatCompactIDR(data.clientFunded)}
          full={formatFullIDR(data.clientFunded)}
          hint="CLOSED · SELF_FUNDED"
          href={routes.payroll.list({ status: "CLOSED" })}
        />
        <Metric
          label="Working Capital Used"
          value={formatCompactIDR(data.workingCapitalUsed)}
          full={formatFullIDR(data.workingCapitalUsed)}
          hint="Facility / WC funded"
          href={routes.workingCapital.list()}
        />
        <Metric
          label="Collected"
          value={formatCompactIDR(data.collected)}
          full={formatFullIDR(data.collected)}
          hint="Settled client-funded proxy"
          href={routes.payroll.list({ status: "CLOSED" })}
        />
        <Metric
          label={
            data.draftFundingRequirement > 0
              ? "Draft Funding Requirement"
              : "Overdue"
          }
          value={formatCompactIDR(
            data.draftFundingRequirement > 0
              ? data.draftFundingRequirement
              : data.overdue,
          )}
          full={formatFullIDR(
            data.draftFundingRequirement > 0
              ? data.draftFundingRequirement
              : data.overdue,
          )}
          hint={
            data.draftFundingRequirement > 0
              ? "Not outstanding AR"
              : "Past due WC only"
          }
          href={
            data.draftFundingRequirement > 0
              ? routes.payroll.list({ status: "DRAFT" })
              : routes.workingCapital.list()
          }
          emphasize={data.overdue > 0 && data.draftFundingRequirement === 0}
        />
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Funding mix (completed / used)
          </p>
          <div
            className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`Client funded ${clientPct} percent, working capital ${wcPct} percent`}
          >
            <div
              className="h-full bg-navy transition-all duration-200"
              style={{ width: `${clientPct}%` }}
            />
            <div
              className="h-full bg-secondary-blue transition-all duration-200"
              style={{ width: `${wcPct}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-navy" />
                Client Funded
              </span>
              <span className="font-semibold tabular-nums">
                {formatCompactIDR(data.clientFunded)}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-secondary-blue" />
                Working Capital
              </span>
              <span className="font-semibold tabular-nums">
                {formatCompactIDR(data.workingCapitalUsed)}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {data.limitations[0]}
          </p>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Receivable & funding lines
            </p>
            {data.items.length > MAX_VISIBLE ? (
              <p className="text-[10px] text-muted-foreground">
                Showing {MAX_VISIBLE} of {data.items.length} rows
              </p>
            ) : null}
          </div>
          <div
            className="overflow-auto rounded-xl border border-border/70"
            style={{ maxHeight: HEADER_H + bodyMax }}
          >
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr style={{ height: HEADER_H }}>
                  {[
                    "Client",
                    "Period",
                    "Payroll",
                    "Funding",
                    "Status",
                    "Outstanding",
                    "Due",
                    "Aging",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="px-2 font-semibold first:pl-3 last:pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr style={{ height: ROW_H }}>
                    <td colSpan={9} className="px-3 text-muted-foreground">
                      No receivable or draft funding lines in scope.
                    </td>
                  </tr>
                ) : (
                  data.items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/50 hover:bg-slate-50/80"
                      style={{ height: ROW_H }}
                    >
                      <td className="px-2 first:pl-3">{row.client}</td>
                      <td className="px-2">{row.period}</td>
                      <td
                        className="px-2 tabular-nums font-medium"
                        title={formatFullIDR(row.payrollValue)}
                      >
                        {formatCompactIDR(row.payrollValue)}
                      </td>
                      <td className="px-2">{row.fundingSource}</td>
                      <td className="px-2 text-muted-foreground">
                        {row.invoiceStatus}
                      </td>
                      <td className="px-2 tabular-nums font-semibold">
                        {row.isDraftRequirement
                          ? "—"
                          : formatCompactIDR(row.outstanding)}
                      </td>
                      <td className="px-2 tabular-nums">{row.dueDate ?? "—"}</td>
                      <td className="px-2">
                        {row.aging ? (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              row.aging === "Current" && "bg-blue-50 text-blue-800",
                              row.aging === "1–30 Days" &&
                                "bg-amber-50 text-amber-800",
                              row.aging === "31–60 Days" &&
                                "bg-amber-100 text-amber-900",
                              row.aging === "61–90 Days" &&
                                "bg-orange-100 text-orange-900",
                              row.aging === "90+ Days" &&
                                "bg-red-50 text-red-800",
                            )}
                          >
                            {row.aging}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 last:pr-3">
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
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  full,
  hint,
  href,
  emphasize,
}: {
  label: string;
  value: string;
  full: string;
  hint: string;
  href: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-2xl border border-border/70 bg-white p-3 shadow-[var(--elevation-sm)] transition hover:border-navy/25",
        emphasize && "border-amber-200 bg-amber-50/40",
      )}
      title={full}
      aria-label={`${label}: ${value}. ${hint}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </div>
      <p className="kpi-value mt-1 text-lg font-bold text-navy">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>
    </Link>
  );
}
