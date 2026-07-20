"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/master-data/clients", label: "Clients" },
  { href: "/admin/master-data/sites", label: "Sites" },
  { href: "/admin/master-data/pay-cycles", label: "Pay Cycles" },
  { href: "/admin/master-data/payroll-groups", label: "Payroll Groups" },
];

export function MasterDataNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map((l) => {
        const active = pathname?.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
