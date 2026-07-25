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
  Sparkles,
  Building2,
  LineChart,
  BadgePercent,
  Handshake,
  Coins,
  Command,
  Briefcase,
  Calculator,
  CircleDollarSign,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { Role } from "@/types";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";

export type NavCategoryId =
  | "command"
  | "projects_clients"
  | "payroll_ops"
  | "payroll_finance"
  | "risk"
  | "administration"
  | "settings";

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
  icon: LucideIcon;
};

export const navCategories: NavCategory[] = [
  { id: "command", label: "Command Center", icon: Command },
  { id: "projects_clients", label: "Projects & Clients", icon: Briefcase },
  { id: "payroll_ops", label: "Payroll Operations", icon: Calculator },
  { id: "payroll_finance", label: "Payroll Finance", icon: CircleDollarSign },
  { id: "risk", label: "Risk & Governance", icon: ShieldAlert },
  { id: "administration", label: "Administration", icon: Wrench },
  { id: "settings", label: "Settings", icon: Settings },
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
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    module: "projects",
    category: "projects_clients",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    module: "clients",
    category: "projects_clients",
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    module: "employees",
    category: "projects_clients",
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    module: "attendance",
    category: "payroll_ops",
  },
  {
    title: "Payroll",
    href: "/payroll",
    icon: Wallet,
    module: "payroll",
    category: "payroll_ops",
  },
  {
    title: "Approval",
    href: "/approval",
    icon: GitBranch,
    module: "approval",
    category: "payroll_ops",
  },
  {
    title: "Payment instructions",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    category: "payroll_finance",
  },
  {
    title: "Payment confirmation",
    href: "/payment-confirmation",
    icon: ClipboardCheck,
    module: "payment_confirmation",
    category: "payroll_finance",
  },
  {
    title: "Working capital",
    href: "/working-capital",
    icon: Landmark,
    module: "working_capital",
    category: "payroll_finance",
  },
  {
    title: "Disbursement",
    href: "/disbursement",
    icon: Banknote,
    module: "disbursement",
    category: "payroll_finance",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
    category: "risk",
  },
  {
    title: "Audit",
    href: "/audit",
    icon: ShieldCheck,
    module: "audit",
    category: "risk",
  },
  {
    title: "Business development",
    href: "/sales",
    icon: LineChart,
    module: "sales_pipeline",
    category: "administration",
  },
  {
    title: "Pricing",
    href: "/pricing",
    icon: BadgePercent,
    module: "pricing",
    category: "administration",
  },
  {
    title: "Funding partners",
    href: "/capital-partners",
    icon: Handshake,
    module: "capital_partners",
    category: "administration",
  },
  {
    title: "Capital allocations",
    href: "/capital-allocations",
    icon: Coins,
    module: "capital_allocations",
    category: "administration",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    category: "settings",
  },
];

export function navigationForRole(role: Role): NavItem[] {
  return allNav.filter((item) => canAccessModule(role, item.module));
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
  (i) => i.category !== "administration" || i.module === "settings",
);

export const roadmapNav: NavItem[] = [
  {
    title: "Roadmap",
    href: "/roadmap",
    icon: Sparkles,
    module: "roadmap",
    category: "settings",
  },
];
