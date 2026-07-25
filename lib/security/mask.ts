/** Masking helpers for sensitive UI fields. Never log raw secrets. */

export function maskAccountNumber(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskIdentity(value?: string | null): string {
  if (!value) return "—";
  const v = value.replace(/\s+/g, "");
  if (v.length <= 4) return "****";
  return `${v.slice(0, 2)}${"*".repeat(Math.max(4, v.length - 4))}${v.slice(-2)}`;
}

export function maskEmail(value?: string | null): string {
  if (!value || !value.includes("@")) return value ?? "—";
  const [user, domain] = value.split("@");
  if (user.length <= 2) return `**@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
}

export function maskNpwp(value?: string | null): string {
  if (!value) return "—";
  const v = value.replace(/[.\-\s]/g, "");
  if (v.length < 6) return "****";
  return `${v.slice(0, 2)}.******.${v.slice(-3)}`;
}
