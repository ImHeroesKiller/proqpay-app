/**
 * Pay cycle schedule calculations (pure, no DB).
 * CUSTOM frequency uses JSON config only — never executable code.
 */

export type PayCycleFrequency =
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMIMONTHLY"
  | "MONTHLY"
  | "CUSTOM";

export type PayCycleConfig = {
  frequency: PayCycleFrequency;
  cutoffDay: number;
  paymentDay: number;
  approvalLagDays: number;
  /** For CUSTOM: { "periodDays": number } or { "splitDays": [1, 16] } */
  customConfig?: string | null;
};

export type PeriodSchedule = {
  periodStart: Date;
  periodEnd: Date;
  cutoffAt: Date;
  approvalDueAt: Date;
  paymentDueAt: Date;
};

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function clampDay(y: number, m: number, day: number): number {
  return Math.min(Math.max(1, day), lastDayOfMonth(y, m));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/**
 * Compute the next period containing or after `anchor` (default: today UTC).
 * For MONTHLY: calendar month of anchor.
 */
export function computePeriodSchedule(
  config: PayCycleConfig,
  anchor: Date = new Date(),
): PeriodSchedule {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const day = anchor.getUTCDate();

  let periodStart: Date;
  let periodEnd: Date;

  switch (config.frequency) {
    case "MONTHLY": {
      periodStart = utcDate(y, m, 1);
      periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
      break;
    }
    case "SEMIMONTHLY": {
      if (day <= 15) {
        periodStart = utcDate(y, m, 1);
        periodEnd = utcDate(y, m, 15);
      } else {
        periodStart = utcDate(y, m, 16);
        periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
      }
      break;
    }
    case "WEEKLY": {
      // ISO-ish: Monday start of week containing anchor
      const dow = anchor.getUTCDay(); // 0 Sun
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      periodStart = addDays(utcDate(y, m, day), mondayOffset);
      periodEnd = addDays(periodStart, 6);
      break;
    }
    case "BIWEEKLY": {
      const dow = anchor.getUTCDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      periodStart = addDays(utcDate(y, m, day), mondayOffset);
      periodEnd = addDays(periodStart, 13);
      break;
    }
    case "CUSTOM": {
      let periodDays = 30;
      if (config.customConfig) {
        try {
          const parsed = JSON.parse(config.customConfig) as {
            periodDays?: number;
          };
          if (
            typeof parsed.periodDays === "number" &&
            parsed.periodDays >= 1 &&
            parsed.periodDays <= 366
          ) {
            periodDays = Math.floor(parsed.periodDays);
          }
        } catch {
          // keep default
        }
      }
      periodStart = utcDate(y, m, day);
      periodEnd = addDays(periodStart, periodDays - 1);
      break;
    }
    default: {
      periodStart = utcDate(y, m, 1);
      periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
    }
  }

  const endY = periodEnd.getUTCFullYear();
  const endM = periodEnd.getUTCMonth();
  const cutoffDay = clampDay(endY, endM, config.cutoffDay);
  const paymentDay = clampDay(endY, endM, config.paymentDay);

  // Cutoff: on period end month at cutoff day 23:59 UTC (logical)
  let cutoffAt = utcDate(endY, endM, cutoffDay);
  cutoffAt = new Date(cutoffAt.getTime() + 23 * 3600_000 + 59 * 60_000);

  // If cutoff before period start, use period end day
  if (cutoffAt < periodStart) {
    cutoffAt = new Date(periodEnd.getTime() + 23 * 3600_000 + 59 * 60_000);
  }

  const approvalDueAt = addDays(periodEnd, Math.max(0, config.approvalLagDays));
  let paymentDueAt = utcDate(endY, endM, paymentDay);
  if (paymentDueAt < periodEnd) {
    // payment next month
    const ny = endM === 11 ? endY + 1 : endY;
    const nm = endM === 11 ? 0 : endM + 1;
    paymentDueAt = utcDate(ny, nm, clampDay(ny, nm, config.paymentDay));
  }

  return {
    periodStart,
    periodEnd,
    cutoffAt,
    approvalDueAt,
    paymentDueAt,
  };
}

/** Preview next N periods starting from anchor. */
export function previewSchedules(
  config: PayCycleConfig,
  count: number,
  anchor: Date = new Date(),
): PeriodSchedule[] {
  const out: PeriodSchedule[] = [];
  let cursor = anchor;
  for (let i = 0; i < count; i++) {
    const s = computePeriodSchedule(config, cursor);
    out.push(s);
    cursor = addDays(s.periodEnd, 1);
  }
  return out;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

export function effectiveRangesOverlap(
  aFrom: Date,
  aTo: Date | null | undefined,
  bFrom: Date,
  bTo: Date | null | undefined,
): boolean {
  const aEnd = aTo ?? new Date("9999-12-31T00:00:00.000Z");
  const bEnd = bTo ?? new Date("9999-12-31T00:00:00.000Z");
  return rangesOverlap(aFrom, aEnd, bFrom, bEnd);
}

export function validateEffectiveRange(
  from: Date,
  to: Date | null | undefined,
): string | null {
  if (to && to.getTime() < from.getTime()) {
    return "effectiveFrom must be ≤ effectiveTo";
  }
  return null;
}

export function parseCustomConfig(raw: string | null | undefined): {
  ok: boolean;
  error?: string;
  value?: Record<string, unknown>;
} {
  if (raw == null || raw.trim() === "") return { ok: true, value: {} };
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return { ok: false, error: "customConfig must be a JSON object" };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch {
    return { ok: false, error: "customConfig is not valid JSON" };
  }
}
