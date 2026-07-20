"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { citiesForProvince } from "@/lib/data/geography/reference";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilterOptions = {
  defaultPeriodId: string | null;
  scopes: { value: string; label: string }[];
  provinces: { value: string; label: string }[];
  clientTypes: { value: string; label: string }[];
  clients: { value: string; label: string }[];
  projects: { value: string; label: string; companyId?: string }[];
  periods: { value: string; label: string; status?: string }[];
  statuses: { value: string; label: string }[];
  fundingTypes: { value: string; label: string }[];
  sites: { value: string; label: string }[];
};

function Chip({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-2xl border border-border/80 bg-white px-2.5 py-1.5 text-xs shadow-[var(--elevation-sm)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        className="max-w-[10rem] cursor-pointer bg-transparent font-medium text-foreground outline-none disabled:cursor-not-allowed"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
    </label>
  );
}

export function GeoFiltersBar({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const scope = params.get("scope") ?? "client";
  const province = params.get("province") ?? "ALL";
  const city = params.get("city") ?? "ALL";
  const site = params.get("site") ?? "ALL";
  const clientType = params.get("clientType") ?? "ALL";
  const client = params.get("client") ?? "ALL";
  const project = params.get("project") ?? "ALL";
  const period =
    params.get("period") ?? options.defaultPeriodId ?? "ALL";
  const status = params.get("status") ?? "ALL";
  const funding = params.get("funding") ?? "ALL";

  const cityOptions = useMemo(() => {
    const base = [{ value: "ALL", label: "All cities / regencies" }];
    if (!province || province === "ALL") return base;
    return [
      ...base,
      ...citiesForProvince(province).map((c) => ({
        value: c.code,
        label: c.name,
      })),
    ];
  }, [province]);

  const setParam = useCallback(
    (key: string, value: string, clear: string[] = []) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "ALL") {
        if (key === "scope" && value === "ALL") next.set("scope", "all");
        else if (key === "period" && options.defaultPeriodId) {
          // clearing period resets to default operational period
          next.set("period", options.defaultPeriodId);
        } else {
          next.delete(key);
        }
      } else {
        next.set(key, value);
      }
      for (const c of clear) next.delete(c);
      if (!next.get("scope")) next.set("scope", "client");
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router, options.defaultPeriodId],
  );

  const reset = () => {
    const next = new URLSearchParams();
    next.set("scope", "client");
    if (options.defaultPeriodId) next.set("period", options.defaultPeriodId);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const cityDisabled = !province || province === "ALL";
  const siteDisabled = cityDisabled && project === "ALL";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-80" : ""}`}
      aria-busy={pending}
    >
      <Chip
        label="Scope"
        value={scope}
        options={options.scopes}
        onChange={(v) => setParam("scope", v)}
      />
      <Chip
        label="Province"
        value={province}
        options={options.provinces}
        onChange={(v) => setParam("province", v, ["city", "site"])}
      />
      <Chip
        label="City"
        value={city}
        options={cityOptions}
        disabled={cityDisabled}
        onChange={(v) => setParam("city", v, ["site"])}
      />
      <Chip
        label="Site"
        value={site}
        options={options.sites}
        disabled={siteDisabled}
        onChange={(v) => setParam("site", v)}
      />
      <Chip
        label="Client Type"
        value={clientType}
        options={options.clientTypes}
        onChange={(v) => setParam("clientType", v)}
      />
      <Chip
        label="Client"
        value={client}
        options={options.clients}
        onChange={(v) => setParam("client", v, ["project"])}
      />
      <Chip
        label="Project"
        value={project}
        options={options.projects}
        onChange={(v) => setParam("project", v)}
      />
      <Chip
        label="Period"
        value={period}
        options={options.periods}
        onChange={(v) => setParam("period", v)}
      />
      <Chip
        label="Status"
        value={status}
        options={options.statuses}
        onChange={(v) => setParam("status", v)}
      />
      <Chip
        label="Funding"
        value={funding}
        options={options.fundingTypes}
        onChange={(v) => setParam("funding", v)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-2xl text-xs"
        onClick={reset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset filters
      </Button>
    </div>
  );
}
