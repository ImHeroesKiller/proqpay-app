import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarCheck,
  Wallet,
  GitBranch,
  FileText,
  ClipboardCheck,
  Landmark,
  Banknote,
  BarChart3,
  ShieldCheck,
  Settings,
  Calculator,
  Database,
  FileSpreadsheet,
  HandCoins,
} from "lucide-react";
import type { Role } from "@/types";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";

export type NavCategoryId =
  | "command"
  | "treasury"
  | "risk"
  | "administration";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AppModule;
  category: NavCategoryId;
};

export type NavCategory = {
  id: NavCategoryId;
  label: string;
};

export const navCategories: NavCategory[] = [
  { id: "command", label: "Command & Operations" },
  { id: "treasury", label: "Treasury & Funding" },
  { id: "risk", label: "Risk & Governance" },
  { id: "administration", label: "Administration" },
];

const allNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    category: "command",
  },
  {
    title: "Projects / Clients",
    href: "/projects",
    icon: FolderKanban,
    module: "projects",
    category: "command",
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    module: "employees",
    category: "command",
  },
  {
    title: "Payroll Operations",
    href: "/payroll",
    icon: Wallet,
    module: "payroll",
    category: "command",
  },
  {
    title: "Payroll Engine",
    href: "/payroll",
    icon: Calculator,
    module: "payroll",
    category: "command",
  },
  {
    title: "Approvals",
    href: "/approval",
    icon: GitBranch,
    module: "approval",
    category: "command",
  },
  {
    title: "Payment Instructions",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    category: "command",
  },
  {
    title: "Payment Confirmation",
    href: "/payment-confirmation",
    icon: ClipboardCheck,
    module: "payment_confirmation",
    category: "command",
  },
  {
    title: "Disbursement",
    href: "/disbursement",
    icon: Banknote,
    module: "disbursement",
    category: "command",
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    module: "attendance",
    category: "command",
  },
  {
    title: "Invoices",
    href: "/reports",
    icon: FileSpreadsheet,
    module: "reports",
    category: "treasury",
  },
  {
    title: "Collection",
    href: "/payment-confirmation",
    icon: HandCoins,
    module: "payment_confirmation",
    category: "treasury",
  },
  {
    title: "Working Capital",
    href: "/working-capital",
    icon: Landmark,
    module: "working_capital",
    category: "treasury",
  },
  {
    title: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
    category: "risk",
  },
  {
    title: "Audit Trail",
    href: "/audit",
    icon: ShieldCheck,
    module: "audit",
    category: "risk",
  },
  {
    title: "Master Data",
    href: "/clients",
    icon: Database,
    module: "clients",
    category: "administration",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    category: "administration",
  },
];

// Deduplicate visual items when same href appears twice for a role —
// keep first occurrence only for sidebar rendering.
export function navigationForRole(role: Role): NavItem[] {
  const seen = new Set<string>();
  return allNav.filter((item) => {
    if (!canAccessModule(role, item.module)) return false;
    // Allow both Payroll Operations and Payroll Engine (same href) via unique key
    const key = `${item.href}::${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function navigationByCategory(
  role: Role,
): { category: NavCategory; items: NavItem[] }[] {
  const items = navigationForRole(role);
  return navCategories
    .map((category) => ({
      category,
      items: items.filter((i) => i.category === category.id),
    }))
    .filter((g) => g.items.length > 0);
}

/** @deprecated Prefer navigationForRole */
export const appNavigation: NavItem[] = allNav.filter(
  (i) => i.category === "command" || i.module === "settings",
);

/** Removed from executive sidebar; route may still exist */
export const roadmapNav: NavItem[] = [];
