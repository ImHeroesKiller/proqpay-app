import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  GitBranch,
  Banknote,
  Landmark,
  BarChart3,
  ShieldCheck,
  Settings,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const appNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Employees", href: "/employees", icon: Users },
  { title: "Payroll", href: "/payroll", icon: Wallet },
  { title: "Approval", href: "/approval", icon: GitBranch },
  { title: "Disbursement", href: "/disbursement", icon: Banknote },
  { title: "Working Capital", href: "/working-capital", icon: Landmark },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Audit", href: "/audit", icon: ShieldCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const roadmapNav: NavItem[] = [
  { title: "Roadmap", href: "/roadmap", icon: Sparkles },
];
