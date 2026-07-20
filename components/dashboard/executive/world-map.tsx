"use client";

import { useState } from "react";
import { COUNTRY_VOLUMES, type CountryVolume } from "@/lib/data/executive-command";
import { cn } from "@/lib/utils";

function intensity(volume: number, max: number) {
  const t = volume / max;
  if (t > 0.7) return "#0B3A6E";
  if (t > 0.4) return "#2563EB";
  if (t > 0.2) return "#60A5FA";
  return "#93C5FD";
}

export function GlobalPayrollMap() {
  const max = Math.max(...COUNTRY_VOLUMES.map((c) => c.volumeIdrBn));
  const [active, setActive] = useState<CountryVolume | null>(null);

  return (
    <div className="surface-premium flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Global Payroll Map
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Volume intensity by jurisdiction · IDR billions
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#93C5FD]" /> Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> Mid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0B3A6E]" /> High
          </span>
        </div>
      </div>

      <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/80">
        <svg
          viewBox="0 0 100 80"
          className="h-full w-full"
          role="img"
          aria-label="World map of payroll volume by country"
        >
          {/* Stylized continents — abstract enterprise cartography */}
          <g fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.15">
            <path d="M8 28 C14 22, 22 24, 26 30 C28 36, 24 42, 18 44 C12 42, 8 36, 8 28Z" />
            <path d="M18 48 C22 50, 24 58, 22 64 C18 68, 14 62, 14 56 C14 50, 16 48, 18 48Z" />
            <path d="M44 22 C52 18, 58 22, 60 30 C58 38, 52 40, 46 36 C42 32, 42 26, 44 22Z" />
            <path d="M48 38 C54 40, 56 48, 54 54 C50 56, 46 50, 46 44 C46 40, 47 38, 48 38Z" />
            <path d="M62 30 C70 26, 78 28, 84 34 C86 40, 80 44, 74 42 C68 40, 62 36, 62 30Z" />
            <path d="M70 46 C78 48, 86 52, 90 60 C88 68, 80 70, 74 64 C70 58, 68 50, 70 46Z" />
            <path d="M78 36 C82 34, 88 36, 90 40 C88 44, 82 44, 78 40Z" />
          </g>
          {COUNTRY_VOLUMES.map((c) => {
            const r = 1.2 + (c.volumeIdrBn / max) * 2.8;
            const isActive = active?.code === c.code;
            return (
              <g
                key={c.code}
                className="map-marker cursor-pointer"
                onMouseEnter={() => setActive(c)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(c)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                role="button"
                aria-label={`${c.name}: IDR ${c.volumeIdrBn} billion, ${c.employees.toLocaleString()} employees`}
              >
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? r * 1.25 : r}
                  fill={intensity(c.volumeIdrBn, max)}
                  opacity={isActive ? 1 : 0.9}
                  stroke="#fff"
                  strokeWidth={0.25}
                />
                {isActive ? (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r * 1.8}
                    fill="none"
                    stroke={intensity(c.volumeIdrBn, max)}
                    strokeWidth={0.2}
                    opacity={0.4}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {active ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-border/80 bg-white/95 px-3 py-2 shadow-[var(--elevation-md)] backdrop-blur">
            <p className="text-xs font-semibold text-navy">{active.name}</p>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              IDR {active.volumeIdrBn} Bn · {active.employees.toLocaleString()}{" "}
              employees
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-muted-foreground">
            Hover a market to inspect volume
          </div>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {COUNTRY_VOLUMES.slice(0, 8).map((c) => (
          <li
            key={c.code}
            className={cn(
              "flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition-colors",
              active?.code === c.code && "bg-secondary",
            )}
            onMouseEnter={() => setActive(c)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="font-medium text-foreground">{c.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {c.volumeIdrBn}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
