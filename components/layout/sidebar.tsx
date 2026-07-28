"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, Settings2, Sparkles } from "lucide-react";
import { navigationByCategory } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { ShellUser } from "@/components/layout/app-shell";

export function Sidebar({
  user,
  onNavigate,
}: {
  user: ShellUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isAdminFallback = ["SUPER_ADMIN", "DIRECTOR"].includes(user.role);
  const groups = navigationByCategory(user.role);

  return (
    <aside className="flex h-full w-[230px] flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <Link prefetch={false} href="/dashboard" onClick={onNavigate} className="group block">
          <div className="font-display text-xl font-bold tracking-tight">
            Pro<span className="text-orange transition group-hover:text-[#ffb35c]">Q</span>Pay Lite
          </div>
          <p className="mt-1 text-[11px] font-medium leading-snug text-white/50">
            AI Payroll OS
          </p>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Primary">
        <div>
          <div className="mb-2 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Workspace</span>
          </div>
          <div className="space-y-1">
            <Link prefetch={false} href="/dashboard" onClick={onNavigate} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all", pathname === "/dashboard" ? "text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white")}>
              {pathname === "/dashboard" ? <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-900/30" /> : null}
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><LayoutDashboard className="h-4 w-4" /></span>
              <span className="relative">Dashboard & IDA</span>
            </Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event("open-ida"))} className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-white/65 transition-all hover:bg-white/[0.06] hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5"><Sparkles className="h-4 w-4" /></span>
              <span>Chat dengan IDA</span>
            </button>
          </div>
        </div>

        {isAdminFallback ? groups.map(({ category, items }) => (
          <div key={category.id}>
            <div className="mb-2 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Admin Fallback · {category.label}
              </span>
            </div>
            <div className="space-y-1">
              {items.filter((item) => item.href !== "/dashboard").map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link prefetch={false} key={`${item.href}-${item.title}`} href={item.href} onClick={onNavigate} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all", active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white")}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5"><Icon className="h-3.5 w-3.5" /></span>
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )) : null}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <button type="button" onClick={() => window.dispatchEvent(new Event("open-ida"))} className="w-full rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 p-3 text-left transition hover:border-blue-300/50 hover:bg-blue-500/20">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/30"><Bot className="h-4 w-4" /></span>
            <div className="min-w-0"><div className="flex items-center gap-1.5"><p className="text-sm font-bold text-white">IDA</p><Sparkles className="h-3 w-3 text-orange" /></div><p className="text-[10px] leading-snug text-white/55">Instruksikan seluruh proses payroll</p></div>
          </div>
        </button>

        {isAdminFallback ? <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-white/50"><Settings2 className="h-3 w-3" /> Modul lama tersedia sebagai fallback admin</div> : null}

        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">{user.avatarInitials}</div>
          <div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-semibold text-white/90">{user.name}</p><p className="truncate text-[11px] text-white/45">{user.role.replaceAll("_", " ")}</p></div>
        </div>
      </div>
    </aside>
  );
}
