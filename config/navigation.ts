import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  GitBranch,
  FileText,
  Landmark,
  BarChart3,
  ShieldCheck,
  Settings,
  Building2,
  Upload,
  Receipt,
  BadgeCheck,
  Layers,
  Component,
  FileCheck2,
} from "lucide-react";
import type { Role } from "@/types";
import { canAccessModule, type AppModule } from "@/lib/auth/permissions";

export type NavCategoryId =
  | "overview"
  | "workforce"
  | "payroll"
  | "payments"
  | "operations"
  | "admin";

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
  { id: "overview", label: "Overview" },
  { id: "workforce", label: "Workforce" },
  { id: "payroll", label: "Payroll" },
  { id: "payments", label: "Payments & Funding" },
  { id: "operations", label: "Operations" },
  { id: "admin", label: "Administration" },
];

const allNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    category: "overview",
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    module: "employees",
    category: "workforce",
  },
  {
    title: "Clients & Projects",
    href: "/projects",
    icon: FolderKanban,
    module: "projects",
    category: "workforce",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    module: "clients",
    category: "workforce",
  },
  {
    title: "Payroll Runs",
    href: "/payroll",
    icon: Wallet,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Validation & Approval",
    href: "/validation",
    icon: BadgeCheck,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Approval Queue",
    href: "/approval",
    icon: GitBranch,
    module: "approval",
    category: "payroll",
  },
  {
    title: "Payroll Setup",
    href: "/payroll-groups",
    icon: Layers,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payroll Components",
    href: "/payroll-components",
    icon: Component,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payslips",
    href: "/payslips",
    icon: FileCheck2,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payment Instructions",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    category: "payments",
  },
  {
    title: "Payment Confirmation",
    href: "/payment-confirmation",
    icon: BadgeCheck,
    module: "payment_confirmation",
    category: "payments",
  },
  {
    title: "Billing & Invoice",
    href: "/billing",
    icon: Receipt,
    module: "billing",
    category: "payments",
  },
  {
    title: "Working Capital",
    href: "/working-capital",
    icon: Landmark,
    module: "working_capital",
    category: "payments",
  },
  {
    title: "Import Center",
    href: "/import",
    icon: Upload,
    module: "import",
    category: "operations",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
    category: "operations",
  },
  {
    title: "Audit Trail",
    href: "/audit",
    icon: ShieldCheck,
    module: "audit",
    category: "admin",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    category: "admin",
  },
];

export function navigationForRole(role: Role): NavItem[] {
  const seen = new Set<string>();
  return allNav.filter((item) => {
    if (!canAccessModule(role, item.module)) return false;
    const key = item.href;
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
      items: items.filter((item) => item.category === category.id),
    }))
    .filter((group) => group.items.length > 0);
}

/** @deprecated Prefer navigationForRole */
export const appNavigation: NavItem[] = allNav.filter(
  (item) => item.category === "overview" || item.category === "payroll",
);

export const roadmapNav: NavItem[] = [];
