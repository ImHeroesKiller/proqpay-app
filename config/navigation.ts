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

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AppModule;
  section?: "operations" | "internal";
};

const allNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard", section: "operations" },
  { title: "Projects", href: "/projects", icon: FolderKanban, module: "projects", section: "operations" },
  { title: "Employees", href: "/employees", icon: Users, module: "employees", section: "operations" },
  { title: "Attendance", href: "/attendance", icon: CalendarCheck, module: "attendance", section: "operations" },
  { title: "Payroll", href: "/payroll", icon: Wallet, module: "payroll", section: "operations" },
  { title: "Approval", href: "/approval", icon: GitBranch, module: "approval", section: "operations" },
  { title: "Payment instructions", href: "/payment-instructions", icon: FileText, module: "payment_instructions", section: "operations" },
  { title: "Payment confirmation", href: "/payment-confirmation", icon: ClipboardCheck, module: "payment_confirmation", section: "operations" },
  { title: "Working capital", href: "/working-capital", icon: Landmark, module: "working_capital", section: "operations" },
  { title: "Disbursement monitoring", href: "/disbursement", icon: Banknote, module: "disbursement", section: "operations" },
  { title: "Reports", href: "/reports", icon: BarChart3, module: "reports", section: "operations" },
  { title: "Audit", href: "/audit", icon: ShieldCheck, module: "audit", section: "operations" },
  { title: "Settings", href: "/settings", icon: Settings, module: "settings", section: "operations" },
  { title: "Clients", href: "/clients", icon: Building2, module: "clients", section: "internal" },
  { title: "Business development", href: "/sales", icon: LineChart, module: "sales_pipeline", section: "internal" },
  { title: "Pricing", href: "/pricing", icon: BadgePercent, module: "pricing", section: "internal" },
  { title: "Funding partners", href: "/capital-partners", icon: Handshake, module: "capital_partners", section: "internal" },
  { title: "Capital allocations", href: "/capital-allocations", icon: Coins, module: "capital_allocations", section: "internal" },
];

export function navigationForRole(role: Role): NavItem[] {
  return allNav.filter((item) => canAccessModule(role, item.module));
}

/** @deprecated Prefer navigationForRole */
export const appNavigation: NavItem[] = allNav.filter(
  (i) => i.section === "operations",
);

export const roadmapNav: NavItem[] = [
  { title: "Roadmap", href: "/roadmap", icon: Sparkles, module: "roadmap" },
];
