import Link from "next/link";

const links = [
  { href: "/payroll-engine", label: "Overview" },
  { href: "/payroll-engine/tax", label: "Tax" },
  { href: "/payroll-engine/bpjs", label: "BPJS" },
  { href: "/payroll-engine/formulas", label: "Formulas" },
  { href: "/payroll-engine/validations", label: "Validation" },
  { href: "/payroll-engine/compare", label: "Compare" },
  { href: "/payroll-engine/audit", label: "Audit trail" },
];

export function EngineNav({ current }: { current: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            current === l.href
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
