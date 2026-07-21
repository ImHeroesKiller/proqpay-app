/**
 * Route metadata for breadcrumbs, titles, and command palette.
 */

export type RouteMeta = {
  title: string;
  description?: string;
  parent?: string;
};

export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Payroll operations command center",
  },
  "/employees": {
    title: "Employees",
    description: "Payroll-relevant employee directory",
  },
  "/projects": {
    title: "Projects",
    description: "Project assignments for payroll allocation",
  },
  "/attendance": {
    title: "Attendance",
    description: "Attendance inputs for payroll calculation",
  },
  "/payroll": {
    title: "Payroll",
    description: "Payroll periods and calculation runs",
  },
  "/approval": {
    title: "Approval",
    description: "Multilevel payroll approval queue",
  },
  "/payment-instructions": {
    title: "Payment instructions",
    description: "Client bank transfer instructions",
  },
  "/payment-confirmation": {
    title: "Payment confirmation",
    description: "Proof upload and verification",
  },
  "/payment-confirmation/upload": {
    title: "Upload proof",
    parent: "/payment-confirmation",
  },
  "/disbursement": {
    title: "Disbursement",
    description: "Disbursement monitoring (not a separate payment rail)",
  },
  "/working-capital": {
    title: "Working capital",
    description: "Funding requests and settlement exposure",
  },
  "/capital-partners": {
    title: "Capital partners",
    description: "Internal funding partners",
  },
  "/capital-allocations": {
    title: "Capital allocations",
    description: "Partner allocations to payroll periods",
  },
  "/pricing": {
    title: "Pricing",
    description: "Commercial pricing rules",
  },
  "/clients": {
    title: "Clients",
    description: "Client lifecycle management",
  },
  "/sales": {
    title: "Sales pipeline",
    description: "Business development opportunities",
  },
  "/reports": {
    title: "Reports",
    description: "Operational and executive reports",
  },
  "/audit": {
    title: "Audit trail",
    description: "Material action history",
  },
  "/settings": {
    title: "Settings",
    description: "Organization and system configuration",
  },
  "/roadmap": {
    title: "Roadmap",
    description: "Planned product capabilities",
  },
};

export function resolveRouteMeta(pathname: string): RouteMeta {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];

  // Dynamic segments e.g. /payroll/[id], /employees/[id]
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const parentPath = `/${segments[0]}`;
    const parent = ROUTE_META[parentPath];
    if (parent) {
      return {
        title: "Detail",
        parent: parentPath,
        description: parent.description,
      };
    }
  }

  return { title: "ProQPay" };
}

export function buildBreadcrumbs(
  pathname: string,
): { href: string; label: string }[] {
  const crumbs: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Home" },
  ];

  if (pathname === "/dashboard") return crumbs;

  const meta = resolveRouteMeta(pathname);
  if (meta.parent && ROUTE_META[meta.parent]) {
    crumbs.push({
      href: meta.parent,
      label: ROUTE_META[meta.parent].title,
    });
  }

  const exact = ROUTE_META[pathname];
  if (exact) {
    crumbs.push({ href: pathname, label: exact.title });
  } else {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] && ROUTE_META[`/${segs[0]}`]) {
      if (!meta.parent) {
        crumbs.push({
          href: `/${segs[0]}`,
          label: ROUTE_META[`/${segs[0]}`].title,
        });
      }
      crumbs.push({ href: pathname, label: meta.title });
    }
  }

  return crumbs;
}
