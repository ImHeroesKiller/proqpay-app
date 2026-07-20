export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  DashboardPrimarySection,
  DashboardSecondarySection,
  DashboardKpiSkeleton,
  DashboardSecondarySkeleton,
} from "@/components/dashboard/dashboard-sections";
import { requireModule } from "@/lib/auth/session";
import { measure } from "@/lib/perf";
import type { Role } from "@/types";
import { Plus } from "lucide-react";

function roleFocus(role: Role): {
  eyebrow: string;
  title: string;
  description: string;
  actions: { label: string; href: string; primary?: boolean }[];
} {
  if (role === "DIRECTOR" || role === "SUPER_ADMIN") {
    return {
      eyebrow: "Executive command center",
      title: "Operations & executive dashboard",
      description:
        "Payroll value, completion, exposure, and operational risk at a glance. Partner funds never go directly to employees — client bank remains the transfer source.",
      actions: [
        { label: "Reports", href: "/reports" },
        { label: "Audit trail", href: "/audit" },
        { label: "Approvals", href: "/approval", primary: true },
      ],
    };
  }
  if (role === "FINANCE") {
    return {
      eyebrow: "Finance operations",
      title: "Finance payroll dashboard",
      description:
        "Focus on payable amounts, payment instructions, proof verification, working capital exposure, and settlement status.",
      actions: [
        { label: "Payment instructions", href: "/payment-instructions" },
        { label: "Working capital", href: "/working-capital" },
        {
          label: "Confirmations",
          href: "/payment-confirmation",
          primary: true,
        },
      ],
    };
  }
  if (role === "PAYROLL_ADMIN" || role === "PAYROLL_OPERATOR") {
    return {
      eyebrow: "Payroll operations",
      title: "Payroll operations dashboard",
      description:
        "Current cycle, validation and approval queues, missing data, and confirmation follow-ups for your active periods.",
      actions: [
        { label: "Open payroll", href: "/payroll" },
        { label: "Approvals", href: "/approval" },
        {
          label: "Upload / verify proof",
          href: "/payment-confirmation",
          primary: true,
        },
      ],
    };
  }
  return {
    eyebrow: "Operations",
    title: "Operations dashboard",
    description:
      "After payment instruction, the client transfers from the client bank and uploads proof. ProQPay verifies before payroll closes.",
    actions: [
      { label: "Payroll", href: "/payroll" },
      {
        label: "Payment confirmation",
        href: "/payment-confirmation",
        primary: true,
      },
    ],
  };
}

export default async function DashboardPage() {
  const scope = await measure(
    "dashboard.requireModule",
    () => requireModule("dashboard"),
    { route: "/dashboard", operation: "authorization" },
  );

  const focus = roleFocus(scope.role);
  const scopeProps = {
    userId: scope.userId,
    role: scope.role,
    companyId: scope.companyId,
  };

  return (
    <div>
      <PageHeader
        eyebrow={focus.eyebrow}
        title={focus.title}
        description={focus.description}
        actions={
          <>
            {focus.actions.map((a) => (
              <Button
                key={a.href}
                asChild
                variant={a.primary ? "accent" : "outline"}
                size="sm"
              >
                <Link href={a.href}>
                  {a.primary ? <Plus className="h-3.5 w-3.5" /> : null}
                  {a.label}
                </Link>
              </Button>
            ))}
          </>
        }
      />

      {/* Primary operational content streams first (shared bundle via React cache). */}
      <Suspense fallback={<DashboardKpiSkeleton />}>
        <DashboardPrimarySection {...scopeProps} />
      </Suspense>

      {/* Charts / alerts / cycle share the same cached promise — no duplicate queries. */}
      <Suspense fallback={<DashboardSecondarySkeleton />}>
        <DashboardSecondarySection {...scopeProps} />
      </Suspense>
    </div>
  );
}
