"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { CityMapMetric } from "@/lib/data/executive-dashboard";
import { formatCompactIDR, formatFullIDR } from "@/lib/format/idr";
import { joinByHasc2, joinById2 } from "@/lib/data/geography/topology-join";
import { cn } from "@/lib/utils";

type TopoProps = {
  NAME_1?: string;
  NAME_2?: string;
  ID_1?: number;
  ID_2?: number;
  HASC_2?: string;
  TYPE_2?: string;
};

type TopologyLike = {
  type: "Topology";
  objects: { IDN: { type: string; geometries: unknown[] } };
  arcs: unknown;
};

const COLORS = {
  noData: "#E5E7EB",
  stops: [
    "#DBEAFE",
    "#BFDBFE",
    "#93C5FD",
    "#60A5FA",
    "#3B82F6",
    "#2563EB",
    "#1D4ED8",
    "#0B3A6E",
  ],
};

function colorForValue(value: number, max: number): string {
  if (!value || value <= 0 || max <= 0) return COLORS.noData;
  const t = Math.min(1, value / max);
  const idx = Math.min(
    COLORS.stops.length - 1,
    Math.floor(t * (COLORS.stops.length - 1)),
  );
  return COLORS.stops[idx];
}

function legendTicks(max: number): { label: string; color: string }[] {
  if (max <= 0) {
    return [
      { label: "No data", color: COLORS.noData },
      { label: "Rp0", color: COLORS.stops[0] },
    ];
  }
  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return steps.map((s) => ({
    label: s === 0 ? "Rp0" : formatCompactIDR(max * s),
    color: s === 0 ? COLORS.stops[0] : colorForValue(max * s, max),
  }));
}

export function IndonesiaChoropleth({
  title,
  subtitle,
  metricLabel,
  domainMax,
  cities,
  selectedCity,
  onSelectCity,
}: {
  title: string;
  subtitle: string;
  metricLabel: string;
  domainMax: number;
  cities: CityMapMetric[];
  selectedCity?: string | null;
  onSelectCity?: (cityCode: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [paths, setPaths] = useState<
    {
      d: string;
      props: TopoProps;
      cityCode: string | null;
      metric: CityMapMetric | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    metric: CityMapMetric | null;
    name: string;
    province: string;
    x: number;
    y: number;
  } | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const byHasc = useMemo(() => {
    const m = new Map<string, CityMapMetric>();
    for (const c of cities) {
      if (c.hasc2) m.set(c.hasc2, c);
      // also by city code via join
      const j = joinByHasc2(c.hasc2 ?? undefined);
      if (j) m.set(j.hasc2, c);
    }
    return m;
  }, [cities]);

  const byCityCode = useMemo(() => {
    const m = new Map<string, CityMapMetric>();
    for (const c of cities) m.set(c.cityCode, c);
    return m;
  }, [cities]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth) || 960);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/geo/IDN.json");
        if (!res.ok) throw new Error("Failed to load map topology");
        const topo = (await res.json()) as TopologyLike;
        const fc = feature(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topo as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topo.objects.IDN as any,
        ) as unknown as GeoJSON.FeatureCollection;
        const height = Math.max(320, Math.min(560, width * 0.48));
        const projection = geoMercator().fitSize(
          [width, height],
          fc as unknown as GeoPermissibleObjects,
        );
        const pathGen = geoPath(projection);
        const next = fc.features.map((f) => {
          const props = (f.properties ?? {}) as TopoProps;
          const hasc = props.HASC_2 ?? null;
          const join =
            joinByHasc2(hasc) ??
            joinById2(props.ID_2) ??
            null;
          const cityCode = join?.cityCode ?? null;
          const metric =
            (hasc ? byHasc.get(hasc) : undefined) ??
            (cityCode ? byCityCode.get(cityCode) : undefined) ??
            null;
          return {
            d: pathGen(f as unknown as GeoPermissibleObjects) ?? "",
            props,
            cityCode,
            metric: metric ?? null,
          };
        });
        if (!cancelled) {
          setPaths(next);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Map load error");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [width, byHasc, byCityCode]);

  const height = Math.max(320, Math.min(560, width * 0.48));
  const ticks = legendTicks(domainMax);

  const onMove = useCallback(
    (
      e: React.MouseEvent | React.FocusEvent,
      name: string,
      province: string,
      metric: CityMapMetric | null,
      key: string,
    ) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let x = 0;
      let y = 0;
      if ("clientX" in e) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      } else {
        x = rect.width / 2;
        y = 40;
      }
      // keep tooltip in viewport box
      x = Math.max(12, Math.min(rect.width - 220, x + 12));
      y = Math.max(12, Math.min(rect.height - 140, y + 12));
      setHover({ metric, name, province, x, y });
      setFocusKey(key);
    },
    [],
  );

  return (
    <div className="surface-premium w-full overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Payroll Fund Distribution by City / Regency
          </p>
          <h2 className="font-heading mt-1 text-base font-semibold text-navy sm:text-lg">
            {title}
          </h2>
          <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
            {subtitle} · Metric: {metricLabel}
          </p>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2 sm:mt-0" aria-label="Map legend">
          <li className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: COLORS.noData }}
            />
            No operational data
          </li>
          {ticks.slice(1).map((t) => (
            <li
              key={t.label}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: t.color }}
              />
              {t.label}
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={containerRef}
        className="relative w-full bg-slate-50/80 px-2 py-3 sm:px-4"
        style={{ minHeight: height }}
      >
        {loading ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{ height }}
          >
            Loading Indonesia map geometry…
          </div>
        ) : error ? (
          <div
            className="flex items-center justify-center text-xs text-destructive"
            style={{ height }}
          >
            {error}
          </div>
        ) : (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="mx-auto block max-w-full"
            role="img"
            aria-label={`${title}. ${metricLabel}.`}
          >
            {paths.map((p, i) => {
              const key = `${p.props.ID_2 ?? i}-${p.props.HASC_2 ?? p.props.NAME_2}`;
              const value = p.metric?.payrollValue ?? 0;
              const fill = colorForValue(value, domainMax);
              const selected =
                selectedCity &&
                (p.cityCode === selectedCity ||
                  p.metric?.cityCode === selectedCity);
              const name = p.props.NAME_2 ?? "Unknown";
              const province = p.props.NAME_1 ?? "";
              const aria = p.metric
                ? `${p.metric.cityName}, ${p.metric.provinceName}, ${p.metric.metricLabel} ${formatCompactIDR(p.metric.payrollValue)}, ${p.metric.employeeCount} employees, ${p.metric.clientCount} clients`
                : `${name}, ${province}, no operational payroll data`;

              return (
                <path
                  key={key}
                  d={p.d}
                  fill={fill}
                  stroke={selected || focusKey === key ? "#0B3A6E" : "#fff"}
                  strokeWidth={selected || focusKey === key ? 1.25 : 0.35}
                  tabIndex={0}
                  role="button"
                  aria-label={aria}
                  className="cursor-pointer outline-none transition-[fill,stroke-width] duration-150"
                  onMouseEnter={(e) =>
                    onMove(e, name, province, p.metric, key)
                  }
                  onMouseMove={(e) =>
                    onMove(e, name, province, p.metric, key)
                  }
                  onMouseLeave={() => {
                    setHover(null);
                    setFocusKey(null);
                  }}
                  onFocus={(e) => onMove(e, name, province, p.metric, key)}
                  onBlur={() => {
                    setHover(null);
                    setFocusKey(null);
                  }}
                  onClick={() => {
                    const code = p.metric?.cityCode ?? p.cityCode;
                    if (!code) return;
                    onSelectCity?.(
                      selectedCity === code ? null : code,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const code = p.metric?.cityCode ?? p.cityCode;
                      if (!code) return;
                      onSelectCity?.(
                        selectedCity === code ? null : code,
                      );
                    }
                  }}
                />
              );
            })}
          </svg>
        )}

        {hover ? (
          <div
            className="pointer-events-none absolute z-20 w-[210px] rounded-2xl border border-border/80 bg-white p-3 shadow-[var(--elevation-md)]"
            style={{ left: hover.x, top: hover.y }}
            role="tooltip"
          >
            <p className="text-xs font-semibold text-navy">{hover.name}</p>
            <p className="text-[10px] text-muted-foreground">{hover.province}</p>
            {hover.metric ? (
              <dl className="mt-2 space-y-0.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Period</dt>
                  <dd className="font-medium">{hover.metric.periodName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">
                    {hover.metric.status.replaceAll("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {hover.metric.metricLabel === "Draft Payroll Value"
                      ? "Draft value"
                      : "Actual value"}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCompactIDR(hover.metric.payrollValue)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Exact</dt>
                  <dd className="tabular-nums text-muted-foreground">
                    {formatFullIDR(hover.metric.payrollValue)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Employees</dt>
                  <dd className="tabular-nums">{hover.metric.employeeCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Clients</dt>
                  <dd className="tabular-nums">{hover.metric.clientCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Projects</dt>
                  <dd className="tabular-nums">{hover.metric.projectCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Funding</dt>
                  <dd>{hover.metric.fundingType}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                No operational payroll data for this city/regency in the
                selected period.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Accessible ranking table — max 5 rows visible, scroll for rest */}
      <div className="border-t border-border/70 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm font-semibold">
              Top Cities by Payroll Value
            </h3>
            <p className="text-xs text-muted-foreground">
              Equivalent list for the map · click to filter
            </p>
          </div>
          {cities.length > 5 ? (
            <p className="text-[10px] text-muted-foreground">
              Showing 5 of {cities.length} cities/regencies
            </p>
          ) : null}
        </div>
        <div
          className="mt-3 overflow-auto rounded-xl border border-border/70"
          style={{
            maxHeight:
              36 + Math.min(Math.max(cities.length, 1), 5) * 40,
          }}
        >
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr style={{ height: 36 }}>
                {[
                  "Rank",
                  "City / Regency",
                  "Province",
                  "Payroll value",
                  "Share",
                  "Employees",
                  "Clients",
                  "Projects",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-2 font-semibold first:pl-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cities.length === 0 ? (
                <tr style={{ height: 40 }}>
                  <td colSpan={9} className="px-3 text-muted-foreground">
                    No city-level operational payroll for this period and
                    scope. Only mapped active locations appear.
                  </td>
                </tr>
              ) : (
                [...cities]
                  .sort((a, b) => b.payrollValue - a.payrollValue)
                  .map((c, i) => (
                    <tr
                      key={c.cityCode}
                      className={cn(
                        "cursor-pointer border-t border-border/50 hover:bg-slate-50",
                        selectedCity === c.cityCode && "bg-secondary",
                      )}
                      style={{ height: 40 }}
                      onClick={() =>
                        onSelectCity?.(
                          selectedCity === c.cityCode ? null : c.cityCode,
                        )
                      }
                    >
                      <td className="px-2 tabular-nums first:pl-3">{i + 1}</td>
                      <td className="px-2 font-medium">{c.cityName}</td>
                      <td className="px-2">{c.provinceName}</td>
                      <td
                        className="px-2 tabular-nums font-semibold"
                        title={formatFullIDR(c.payrollValue)}
                      >
                        {formatCompactIDR(c.payrollValue)}
                      </td>
                      <td className="px-2 tabular-nums">
                        {(c.share * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 tabular-nums">{c.employeeCount}</td>
                      <td className="px-2 tabular-nums">{c.clientCount}</td>
                      <td className="px-2 tabular-nums">{c.projectCount}</td>
                      <td className="px-2">
                        {c.status.replaceAll("_", " ")}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
