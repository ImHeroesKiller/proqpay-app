import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  GitBranch,
  FileText,
  ClipboardCheck,
  Landmark,
  BarChart3,
  ShieldCheck,
  Settings,
  Building2,
  Bot,
  Upload,
  Receipt,
  FileSpreadsheet,
  BadgeCheck,
  Layers,
  Component,
  BookOpen,
  HandCoins,
  CircleDollarSign,
  FileCheck2,
  UserCog,
  Plug,
} from "lucide-react";
import type { Role } from "@/types";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";

export type NavCategoryId =
  | "dashboard"
  | "payroll"
  | "master"
  | "automation"
  | "finance"
  | "reports"
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
};

export const navCategories: NavCategory[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "payroll", label: "Payroll" },
  { id: "master", label: "Master Data" },
  { id: "automation", label: "Automation" },
  { id: "finance", label: "Finance" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

const allNav: NavItem[] = [
  {
    title: "Payroll Command Center",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    category: "dashboard",
  },
  {
    title: "Payroll Period",
    href: "/payroll",
    icon: Wallet,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payroll Processing",
    href: "/payroll",
    icon: Layers,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Validation Center",
    href: "/validation",
    icon: BadgeCheck,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Approval Center",
    href: "/approval",
    icon: GitBranch,
    module: "approval",
    category: "payroll",
  },
  {
    title: "Payroll Register",
    href: "/register",
    icon: BookOpen,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payslip",
    href: "/payslips",
    icon: FileCheck2,
    module: "payroll",
    category: "payroll",
  },
  {
    title: "Payment Instruction",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    category: "payroll",
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    module: "employees",
    category: "master",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    module: "clients",
    category: "master",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    module: "projects",
    category: "master",
  },
  {
    title: "Payroll Groups",
    href: "/payroll-groups",
    icon: Layers,
    module: "payroll",
    category: "master",
  },
  {
    title: "Payroll Components",
    href: "/payroll-components",
    icon: Component,
    module: "payroll",
    category: "master",
  },
  {
    title: "Service Contracts",
    href: "/clients",
    icon: FileSpreadsheet,
    module: "clients",
    category: "master",
  },
  {
    title: "AI Scheme Builder",
    href: "/scheme-builder",
    icon: Bot,
    module: "scheme_builder",
    category: "automation",
  },
  {
    title: "Bulk Import Center",
    href: "/import",
    icon: Upload,
    module: "import",
    category: "automation",
  },
  {
    title: "Billing & Invoice",
    href: "/billing",
    icon: Receipt,
    module: "billing",
    category: "finance",
  },
  {
    title: "Receivables",
    href: "/billing",
    icon: CircleDollarSign,
    module: "billing",
    category: "finance",
  },
  {
    title: "Collection",
    href: "/payment-confirmation",
    icon: HandCoins,
    module: "payment_confirmation",
    category: "finance",
  },
  {
    title: "Working Capital",
    href: "/working-capital",
    icon: Landmark,
    module: "working_capital",
    category: "finance",
  },
  {
    title: "Payroll Reports",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
    category: "reports",
  },
  {
    title: "Payment Reports",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    category: "reports",
  },
  {
    title: "Billing Reports",
    href: "/billing",
    icon: Receipt,
    module: "billing",
    category: "reports",
  },
  {
    title: "Audit Reports",
    href: "/audit",
    icon: ShieldCheck,
    module: "audit",
    category: "reports",
  },
  {
    title: "User & Access",
    href: "/settings",
    icon: UserCog,
    module: "settings",
    category: "settings",
  },
  {
    title: "Company Settings",
    href: "/settings",
    icon: Building2,
    module: "settings",
    category: "settings",
  },
  {
    title: "Payroll Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    category: "settings",
  },
  {
    title: "Integration",
    href: "/settings",
    icon: Plug,
    module: "settings",
    category: "settings",
  },
  {
    title: "Import Templates",
    href: "/import",
    icon: ClipboardCheck,
    module: "import",
    category: "settings",
  },
];

export function navigationForRole(role: Role): NavItem[] {
  const seen = new Set<string>();
  return allNav.filter((item) => {
    if (!canAccessModule(role, item.module)) return false;
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
  (i) => i.category === "dashboard" || i.category === "payroll",
);

export const roadmapNav: NavItem[] = [];
