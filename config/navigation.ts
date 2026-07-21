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
} from "lucide-react";
import type { Role } from "@/types";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";

export type NavGroupId =
  | "payroll_operations"
  | "finance"
  | "commercial"
  | "governance"
  | "administration";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AppModule;
  group: NavGroupId;
  keywords?: string[];
};

export type NavGroup = {
  id: NavGroupId;
  label: string;
  items: NavItem[];
};

const allNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    group: "payroll_operations",
    keywords: ["home", "kpi", "overview", "command center"],
  },
  {
    title: "Global Entities",
    href: "/capital-partners",
    icon: Handshake,
    module: "capital_partners",
    group: "commercial",
    keywords: ["entity", "legal entity", "multinational"],
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    module: "clients",
    group: "commercial",
    keywords: ["company", "tenant"],
  },
  {
    title: "Master Data",
    href: "/admin/master-data/clients",
    icon: Building2,
    module: "master_data",
    group: "administration",
    keywords: ["site", "payroll group", "pay cycle", "client"],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    module: "projects",
    group: "payroll_operations",
    keywords: ["assignment"],
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    module: "employees",
    group: "payroll_operations",
    keywords: ["staff", "directory"],
  },
  {
    title: "Payroll Operations",
    href: "/payroll",
    icon: Wallet,
    module: "payroll",
    group: "payroll_operations",
    keywords: ["period", "salary", "run"],
  },
  {
    title: "Payroll Engine",
    href: "/payroll-engine",
    icon: Wallet,
    module: "payroll",
    group: "payroll_operations",
    keywords: ["formula", "component", "simulation", "engine"],
  },
  {
    title: "Approvals",
    href: "/approval",
    icon: GitBranch,
    module: "approval",
    group: "payroll_operations",
    keywords: ["approve", "reject", "workflow"],
  },
  {
    title: "Payment Instructions",
    href: "/payment-instructions",
    icon: FileText,
    module: "payment_instructions",
    group: "payroll_operations",
    keywords: ["instruction", "transfer file", "pi"],
  },
  {
    title: "Payment Confirmation",
    href: "/payment-confirmation",
    icon: ClipboardCheck,
    module: "payment_confirmation",
    group: "payroll_operations",
    keywords: ["proof", "verify", "upload"],
  },
  {
    title: "Disbursement",
    href: "/disbursement",
    icon: Banknote,
    module: "disbursement",
    group: "payroll_operations",
    keywords: ["batch", "monitoring"],
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    module: "invoices",
    group: "finance",
    keywords: ["billing", "invoice", "ar draft", "issue"],
  },
  {
    title: "Receivables",
    href: "/finance/receivables",
    icon: Landmark,
    module: "receivables",
    group: "finance",
    keywords: ["ar", "aging", "outstanding"],
  },
  {
    title: "Client Payments",
    href: "/finance/payments",
    icon: Banknote,
    module: "client_payments",
    group: "finance",
    keywords: ["collection payment", "allocation", "receipt"],
  },
  {
    title: "Collection",
    href: "/finance/collection",
    icon: ClipboardCheck,
    module: "collection",
    group: "finance",
    keywords: ["reminder", "dunning", "follow-up"],
  },
  {
    title: "Working Capital",
    href: "/working-capital",
    icon: Landmark,
    module: "working_capital",
    group: "finance",
    keywords: ["funding", "settlement", "exposure"],
  },
  {
    title: "Capital Allocations",
    href: "/capital-allocations",
    icon: Coins,
    module: "capital_allocations",
    group: "finance",
    keywords: ["allocation"],
  },
  {
    title: "Pricing & Policy",
    href: "/pricing",
    icon: BadgePercent,
    module: "pricing",
    group: "governance",
    keywords: ["compliance", "policy", "regulatory", "fee", "rate"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    module: "attendance",
    group: "payroll_operations",
    keywords: ["timesheet", "overtime"],
  },
  {
    title: "Sales Pipeline",
    href: "/sales",
    icon: LineChart,
    module: "sales_pipeline",
    group: "commercial",
    keywords: ["opportunity", "bd", "pipeline"],
  },
  {
    title: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    module: "reports",
    group: "governance",
    keywords: ["analytics", "export"],
  },
  {
    title: "Audit Trail",
    href: "/audit",
    icon: ShieldCheck,
    module: "audit",
    group: "governance",
    keywords: ["log", "compliance", "history"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    group: "administration",
    keywords: ["config", "organization"],
  },
  {
    title: "Roadmap",
    href: "/roadmap",
    icon: Sparkles,
    module: "roadmap",
    group: "administration",
    keywords: ["future", "planned"],
  },
];

export const NAV_GROUP_ORDER: { id: NavGroupId; label: string }[] = [
  { id: "payroll_operations", label: "Command & Operations" },
  { id: "finance", label: "Treasury & Funding" },
  { id: "commercial", label: "Entities & Commercial" },
  { id: "governance", label: "Risk & Governance" },
  { id: "administration", label: "Administration" },
];

export function navigationForRole(role: Role): NavItem[] {
  return allNav.filter((item) => canAccessModule(role, item.module));
}

export function navigationGroupsForRole(role: Role): NavGroup[] {
  const items = navigationForRole(role);
  return NAV_GROUP_ORDER.map((g) => ({
    id: g.id,
    label: g.label,
    items: items.filter((i) => i.group === g.id),
  })).filter((g) => g.items.length > 0);
}

/** Flat list for command palette / search. */
export function searchableNavForRole(role: Role): NavItem[] {
  return navigationForRole(role);
}

/** @deprecated Prefer navigationGroupsForRole */
export const appNavigation: NavItem[] = allNav.filter(
  (i) => i.group === "payroll_operations",
);

/** @deprecated Prefer navigation groups */
export const roadmapNav: NavItem[] = allNav.filter((i) => i.href === "/roadmap");
