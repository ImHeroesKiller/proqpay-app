"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { citiesForProvince } from "@/lib/data/geography/reference";
import { ChevronDown, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const PRIMARY_KEYS = [
  "scope",
  "period",
  "client",
  "province",
  "city",
] as const;

const OPTIONAL_DEFS: {
  key: string;
  label: string;
  clear?: string[];
}[] = [
  { key: "site", label: "Site" },
  { key: "clientType", label: "Client Type" },
  { key: "project", label: "Project" },
  { key: "status", label: "Payroll Status" },
  { key: "funding", label: "Funding Type" },
  { key: "currency", label: "Currency" },
];

function Chip({
  label,
  value,
  options,
  disabled,
  onChange,
  onRemove,
  removable,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
  onRemove?: () => void;
  removable?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-2xl border border-border/80 bg-white px-2 text-xs shadow-[var(--elevation-sm)]",
        disabled && "opacity-50",
      )}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        className="max-w-[8.5rem] cursor-pointer bg-transparent font-medium text-foreground outline-none disabled:cursor-not-allowed"
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
      {removable && onRemove ? (
        <button
          type="button"
          className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          aria-label={`Remove ${label} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </label>
  );
}

export function GeoFiltersBar({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const scope = params.get("scope") ?? "client";
  const province = params.get("province") ?? "ALL";
  const city = params.get("city") ?? "ALL";
  const site = params.get("site") ?? "ALL";
  const clientType = params.get("clientType") ?? "ALL";
  const client = params.get("client") ?? "ALL";
  const project = params.get("project") ?? "ALL";
  const period = params.get("period") ?? options.defaultPeriodId ?? "ALL";
  const status = params.get("status") ?? "ALL";
  const funding = params.get("funding") ?? "ALL";
  const currency = params.get("currency") ?? "IDR";

  /** Optional filters visible: any non-default URL value, or sticky session set */
  const activeOptional = useMemo(() => {
    const set = new Set<string>();
    for (const def of OPTIONAL_DEFS) {
      const v = params.get(def.key);
      if (!v) continue;
      if (def.key === "currency" && v === "IDR") continue;
      if (v !== "ALL") set.add(def.key);
    }
    // also respect explicit extras param listing active optional keys
    const extras = params.get("extras");
    if (extras) {
      for (const k of extras.split(",")) {
        if (OPTIONAL_DEFS.some((d) => d.key === k)) set.add(k);
      }
    }
    return set;
  }, [params]);

  const [pinnedOptional, setPinnedOptional] = useState<string[]>([]);

  useEffect(() => {
    setPinnedOptional((prev) => {
      const next = new Set([...prev, ...activeOptional]);
      return [...next];
    });
  }, [activeOptional]);

  const visibleOptional = useMemo(() => {
    return OPTIONAL_DEFS.filter(
      (d) => pinnedOptional.includes(d.key) || activeOptional.has(d.key),
    );
  }, [pinnedOptional, activeOptional]);

  const availableToAdd = useMemo(() => {
    const visible = new Set(visibleOptional.map((v) => v.key));
    return OPTIONAL_DEFS.filter((d) => !visible.has(d.key));
  }, [visibleOptional]);

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

  const currencyOptions = [
    { value: "IDR", label: "IDR" },
    { value: "USD", label: "USD" },
    { value: "SGD", label: "SGD" },
  ];

  const optionsFor = (key: string) => {
    switch (key) {
      case "site":
        return options.sites;
      case "clientType":
        return options.clientTypes;
      case "project":
        return options.projects;
      case "status":
        return options.statuses;
      case "funding":
        return options.fundingTypes;
      case "currency":
        return currencyOptions;
      default:
        return [];
    }
  };

  const valueFor = (key: string) => {
    switch (key) {
      case "site":
        return site;
      case "clientType":
        return clientType;
      case "project":
        return project;
      case "status":
        return status;
      case "funding":
        return funding;
      case "currency":
        return currency;
      default:
        return "ALL";
    }
  };

  const writeParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      if (!next.get("scope")) next.set("scope", "client");
      // rebuild extras from pinned + non-default optional values
      const pinSet = new Set(pinnedOptional);
      for (const def of OPTIONAL_DEFS) {
        const v = next.get(def.key);
        if (v && v !== "ALL" && def.key !== "currency") pinSet.add(def.key);
        if (def.key === "currency" && v && v !== "IDR") pinSet.add(def.key);
      }
      const list = [...pinSet].filter((k) =>
        OPTIONAL_DEFS.some((d) => d.key === k),
      );
      if (list.length) next.set("extras", list.join(","));
      else next.delete("extras");

      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router, pinnedOptional],
  );

  const setParam = useCallback(
    (key: string, value: string, clear: string[] = []) => {
      writeParams((next) => {
        if (!value || value === "ALL") {
          if (key === "period" && options.defaultPeriodId) {
            next.set("period", options.defaultPeriodId);
          } else if (key === "currency") {
            next.delete("currency");
          } else {
            next.delete(key);
          }
        } else {
          next.set(key, value);
        }
        for (const c of clear) next.delete(c);
      });
    },
    [writeParams, options.defaultPeriodId],
  );

  const addOptional = (key: string) => {
    setPinnedOptional((p) => (p.includes(key) ? p : [...p, key]));
    setAddOpen(false);
    writeParams((next) => {
      const extras = new Set(
        (next.get("extras") ?? "").split(",").filter(Boolean),
      );
      extras.add(key);
      next.set("extras", [...extras].join(","));
      if (key === "currency" && !next.get("currency")) next.set("currency", "IDR");
    });
  };

  const removeOptional = (key: string) => {
    setPinnedOptional((p) => p.filter((k) => k !== key));
    writeParams((next) => {
      next.delete(key);
      const extras = (next.get("extras") ?? "")
        .split(",")
        .filter((k) => k && k !== key);
      if (extras.length) next.set("extras", extras.join(","));
      else next.delete("extras");
    });
  };

  const reset = () => {
    setPinnedOptional([]);
    const next = new URLSearchParams();
    next.set("scope", "client");
    if (options.defaultPeriodId) next.set("period", options.defaultPeriodId);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addOpen]);

  const cityDisabled = !province || province === "ALL";

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]",
        pending && "opacity-80",
      )}
      aria-busy={pending}
      role="toolbar"
      aria-label="Dashboard filters"
    >
      <Chip
        label="Scope"
        value={scope}
        options={options.scopes}
        onChange={(v) => setParam("scope", v)}
      />
      <Chip
        label="Period"
        value={period}
        options={options.periods}
        onChange={(v) => setParam("period", v)}
      />
      <Chip
        label="Client"
        value={client}
        options={options.clients}
        onChange={(v) => setParam("client", v, ["project"])}
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

      {visibleOptional.map((def) => (
        <Chip
          key={def.key}
          label={def.label}
          value={valueFor(def.key)}
          options={optionsFor(def.key)}
          removable
          onRemove={() => removeOptional(def.key)}
          onChange={(v) => setParam(def.key, v)}
        />
      ))}

      <div className="relative shrink-0" ref={popRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-2xl text-xs"
          aria-expanded={addOpen}
          aria-haspopup="listbox"
          onClick={() => setAddOpen((o) => !o)}
          disabled={availableToAdd.length === 0}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Filter
        </Button>
        {addOpen ? (
          <ul
            role="listbox"
            className="absolute left-0 top-full z-40 mt-1 min-w-[11rem] rounded-2xl border border-border/80 bg-white py-1 shadow-[var(--elevation-md)]"
          >
            {availableToAdd.map((def) => (
              <li key={def.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
                  onClick={() => addOptional(def.key)}
                >
                  {def.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 rounded-2xl text-xs"
        onClick={reset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>

      {/* silence unused PRIMARY_KEYS for tree-shaking docs */}
      <span className="sr-only">{PRIMARY_KEYS.join(",")}</span>
    </div>
  );
}
