/**
 * Indonesian compact currency formatting for executive UI.
 * Mio = Juta, Bio = Miliar, Tri = Triliun.
 */

export type CompactIdrOptions = {
  /** Max fraction digits for compact form (default 1 for Bio/Tri, 0 for Mio when whole) */
  maxFractionDigits?: number;
  /** Force full IDR format (no compact) */
  full?: boolean;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Compact display: Rp738 Mio, Rp4,2 Bio, Rp1,25 Tri
 */
export function formatCompactIDR(
  value: number | null | undefined,
  options: CompactIdrOptions = {},
): string {
  if (value == null || !isFiniteNumber(value)) return "—";
  if (options.full) return formatFullIDR(value);
  if (value === 0) return "Rp0";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000_000) {
    return `${sign}${formatUnit(abs / 1_000_000_000_000, options.maxFractionDigits ?? 2)} Tri`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${formatUnit(abs / 1_000_000_000, options.maxFractionDigits ?? 1)} Bio`;
  }
  if (abs >= 1_000_000) {
    const whole = abs % 1_000_000 === 0;
    return `${sign}${formatUnit(abs / 1_000_000, options.maxFractionDigits ?? (whole ? 0 : 1))} Mio`;
  }
  return `${sign}${formatFullIDR(abs).replace(/^Rp/, "Rp")}`;
}

export function formatFullIDR(value: number | null | undefined): string {
  if (value == null || !isFiniteNumber(value)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Accessible label with compact + exact. */
export function formatIdrAccessible(
  value: number | null | undefined,
): string {
  if (value == null || !isFiniteNumber(value)) return "tidak tersedia";
  return `${formatCompactIDR(value)} (${formatFullIDR(value)})`;
}

function formatUnit(n: number, maxFractionDigits: number): string {
  const fixed = Number(n.toFixed(maxFractionDigits));
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(fixed);
}

/** Metric label by payroll period status. */
export function payrollMetricLabel(
  status: string | null | undefined,
): "Actual Payroll Value" | "Draft Payroll Value" {
  if (status === "CLOSED" || status === "VERIFIED" || status === "DISBURSED") {
    return "Actual Payroll Value";
  }
  return "Draft Payroll Value";
}

export function mapTitleForPeriod(
  periodName: string | null,
  status: string | null,
): string {
  const metric =
    status === "CLOSED" || status === "VERIFIED" || status === "DISBURSED"
      ? "Actual Payroll Distribution"
      : "Draft Payroll Distribution";
  return periodName ? `${metric} — ${periodName}` : metric;
}
