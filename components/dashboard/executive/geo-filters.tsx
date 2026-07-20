"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { citiesForProvince } from "@/lib/data/geography/reference";
import { ChevronDown } from "lucide-react";

export type FilterOptions = {
  countries: { value: string; label: string }[];
  provinces: { value: string; label: string }[];
  clientTypes: { value: string; label: string }[];
  clients: { value: string; label: string }[];
  projects: { value: string; label: string; companyId?: string }[];
  periods: { value: string; label: string; status?: string }[];
  statuses: { value: string; label: string }[];
  fundingTypes: { value: string; label: string }[];
  currencies: { value: string; label: string }[];
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
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-border/80 bg-white px-2.5 py-1.5 text-xs shadow-[var(--elevation-sm)] ${
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

  const country = params.get("country") ?? "ID";
  const province = params.get("province") ?? "ALL";
  const city = params.get("city") ?? "ALL";
  const site = params.get("site") ?? "ALL";
  const clientType = params.get("clientType") ?? "ALL";
  const client = params.get("client") ?? "ALL";
  const project = params.get("project") ?? "ALL";
  const period = params.get("period") ?? "ALL";
  const status = params.get("status") ?? "ALL";
  const funding = params.get("funding") ?? "ALL";
  const currency = params.get("currency") ?? "IDR";

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

  const siteOptions = useMemo(() => {
    // Sites derived from known operational mapping labels in scope — free-form ALL only until site master
    return [
      { value: "ALL", label: "All sites" },
      { value: "SITE-ATE-JAKBAR-01", label: "ATE Client Office — Jakarta Barat" },
      { value: "SITE-MSG-HO-01", label: "ProQPay Processing Center — Jakarta Pusat" },
    ];
  }, []);

  const setParam = useCallback(
    (key: string, value: string, clear: string[] = []) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "ALL") {
        if (key === "country" && value === "ALL") next.set("country", "ALL");
        else if (key === "country") next.set("country", value);
        else next.delete(key);
      } else {
        next.set(key, value);
      }
      for (const c of clear) next.delete(c);
      // defaults
      if (!next.get("country")) next.set("country", "ID");
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const provinceDisabled = !country || country === "ALL";
  const cityDisabled = !province || province === "ALL";
  const siteDisabled = cityDisabled && project === "ALL";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-80" : ""}`}
      aria-busy={pending}
    >
      <Chip
        label="Country"
        value={country}
        options={options.countries}
        onChange={(v) =>
          setParam("country", v, ["province", "city", "site"])
        }
      />
      <Chip
        label="Province"
        value={province}
        options={options.provinces}
        disabled={provinceDisabled}
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
        options={siteOptions}
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
      <Chip
        label="Currency"
        value={currency}
        options={options.currencies}
        onChange={(v) => setParam("currency", v)}
      />
    </div>
  );
}
