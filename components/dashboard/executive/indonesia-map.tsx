"use client";

import { useMemo, useState } from "react";
import type { ProvinceFootprint } from "@/lib/data/executive-dashboard";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Approximate centroid positions for ID provinces on a stylized Indonesia canvas. */
const PROVINCE_POS: Record<string, { x: number; y: number }> = {
  "ID-SU": { x: 18, y: 28 },
  "ID-SS": { x: 22, y: 48 },
  "ID-JK": { x: 32, y: 52 },
  "ID-BT": { x: 30, y: 54 },
  "ID-JB": { x: 36, y: 54 },
  "ID-JT": { x: 42, y: 52 },
  "ID-JI": { x: 50, y: 54 },
  "ID-BA": { x: 56, y: 58 },
  "ID-KI": { x: 62, y: 42 },
  "ID-ST": { x: 72, y: 48 },
};

function fillFor(status: ProvinceFootprint["status"]) {
  switch (status) {
    case "ACTIVE_OPERATION":
      return "#0B3A6E";
    case "PROSPECT":
      return "#2563EB";
    case "STRATEGIC_EXPANSION":
      return "transparent";
    default:
      return "#E2E8F0";
  }
}

function strokeFor(status: ProvinceFootprint["status"]) {
  switch (status) {
    case "ACTIVE_OPERATION":
      return "#0B3A6E";
    case "PROSPECT":
      return "#2563EB";
    case "STRATEGIC_EXPANSION":
      return "#F59E0B";
    default:
      return "#CBD5E1";
  }
}

export function IndonesiaOperatingFootprint({
  provinces,
  selectedProvince,
  onSelectProvince,
}: {
  provinces: ProvinceFootprint[];
  selectedProvince?: string | null;
  onSelectProvince?: (code: string | null) => void;
}) {
  const [active, setActive] = useState<ProvinceFootprint | null>(null);
  const byCode = useMemo(
    () => new Map(provinces.map((p) => [p.code, p])),
    [provinces],
  );

  return (
    <div className="surface-premium flex h-full flex-col p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">
            Indonesia Payroll Operating Footprint
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Province-level actual operations vs prospect vs strategic plan
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-[10px] font-medium text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" aria-hidden />
            Active Operation
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary-blue" aria-hidden />
            Prospect
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border-2 border-warning bg-transparent"
              aria-hidden
            />
            Strategic Expansion
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" aria-hidden />
            No Active Data
          </li>
        </ul>
      </div>

      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/90">
        <svg
          viewBox="0 0 100 80"
          className="h-full w-full"
          role="img"
          aria-label="Indonesia operating footprint by province"
        >
          {/* Stylized archipelago base */}
          <g fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.3">
            <ellipse cx="28" cy="42" rx="22" ry="14" />
            <ellipse cx="52" cy="50" rx="18" ry="10" />
            <ellipse cx="68" cy="44" rx="14" ry="12" />
            <ellipse cx="80" cy="52" rx="8" ry="6" />
          </g>
          {provinces.map((p) => {
            const pos = PROVINCE_POS[p.code] ?? { x: 50, y: 40 };
            const selected = selectedProvince === p.code;
            const hover = active?.code === p.code;
            const r =
              p.status === "ACTIVE_OPERATION"
                ? 3.2
                : p.status === "PROSPECT"
                  ? 2.6
                  : p.status === "STRATEGIC_EXPANSION"
                    ? 2.4
                    : 1.8;
            return (
              <g
                key={p.code}
                className="map-marker cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={`${p.name}: ${p.status.replaceAll("_", " ")}, historical ${formatRupiah(p.historicalPayroll)}, employees ${p.employeeCount}`}
                onMouseEnter={() => setActive(p)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p)}
                onBlur={() => setActive(null)}
                onClick={() =>
                  onSelectProvince?.(selected ? null : p.code)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProvince?.(selected ? null : p.code);
                  }
                }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={selected || hover ? r * 1.2 : r}
                  fill={fillFor(p.status)}
                  stroke={strokeFor(p.status)}
                  strokeWidth={p.status === "STRATEGIC_EXPANSION" ? 0.6 : 0.35}
                  strokeDasharray={
                    p.status === "STRATEGIC_EXPANSION" ? "1.2 0.8" : undefined
                  }
                  opacity={p.status === "NO_DATA" ? 0.7 : 1}
                />
              </g>
            );
          })}
        </svg>

        {(active ?? (selectedProvince ? byCode.get(selectedProvince) : null)) ? (
          <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-xl border border-border/80 bg-white/95 px-3 py-2 shadow-[var(--elevation-md)]">
            {(() => {
              const p =
                active ??
                (selectedProvince ? byCode.get(selectedProvince)! : null);
              if (!p) return null;
              return (
                <>
                  <p className="text-xs font-semibold text-navy">{p.name}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {p.status.replaceAll("_", " ")}
                  </p>
                  <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                    <dt className="text-muted-foreground">Clients</dt>
                    <dd className="tabular-nums font-medium">{p.clientCount}</dd>
                    <dt className="text-muted-foreground">Projects</dt>
                    <dd className="tabular-nums font-medium">{p.projectCount}</dd>
                    <dt className="text-muted-foreground">Employees</dt>
                    <dd className="tabular-nums font-medium">{p.employeeCount}</dd>
                    <dt className="text-muted-foreground">Historical</dt>
                    <dd className="tabular-nums font-medium">
                      {formatRupiah(p.historicalPayroll)}
                    </dd>
                    <dt className="text-muted-foreground">Draft</dt>
                    <dd className="tabular-nums font-medium">
                      {formatRupiah(p.draftPayroll)}
                    </dd>
                    <dt className="text-muted-foreground">Pipeline</dt>
                    <dd className="tabular-nums font-medium">
                      {formatRupiah(p.pipeline)}
                    </dd>
                  </dl>
                </>
              );
            })()}
          </div>
        ) : (
          <p className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-muted-foreground">
            Hover or focus a province · click to drill into cities
          </p>
        )}
      </div>

      {/* Accessible equivalent table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <caption className="sr-only">
            Province operating footprint equivalent to the map
          </caption>
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-2 font-semibold">Province</th>
              <th className="py-1.5 pr-2 font-semibold">Status</th>
              <th className="py-1.5 pr-2 font-semibold">Employees</th>
              <th className="py-1.5 pr-2 font-semibold">Historical</th>
              <th className="py-1.5 font-semibold">Draft</th>
            </tr>
          </thead>
          <tbody>
            {provinces.map((p) => (
              <tr
                key={p.code}
                className={cn(
                  "border-t border-border/50 cursor-pointer hover:bg-slate-50",
                  selectedProvince === p.code && "bg-secondary",
                )}
                onClick={() =>
                  onSelectProvince?.(
                    selectedProvince === p.code ? null : p.code,
                  )
                }
              >
                <td className="py-1.5 pr-2 font-medium">{p.name}</td>
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {p.status.replaceAll("_", " ")}
                </td>
                <td className="py-1.5 pr-2 tabular-nums">{p.employeeCount}</td>
                <td className="py-1.5 pr-2 tabular-nums">
                  {formatRupiah(p.historicalPayroll)}
                </td>
                <td className="py-1.5 tabular-nums">
                  {formatRupiah(p.draftPayroll)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
