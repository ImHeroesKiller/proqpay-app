"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { navigationForRole, roadmapNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const items = navigationForRole(role);
  const ops = items.filter((i) => i.section === "operations");
  const internal = items.filter((i) => i.section === "internal");

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <div className="font-semibold tracking-tight">
            Pro<span className="text-orange">Q</span>Pay
          </div>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            An MSG Technology Product
          </p>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="App">
        {ops.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
        {internal.length > 0 ? (
          <>
            <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Internal commercial
            </div>
            {internal.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </>
        ) : null}
        <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Future
        </div>
        {roadmapNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-[11px] text-white/40">
        Enterprise Payroll OS · MSG
      </div>
    </aside>
  );
}
