"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { navigationByCategory, roadmapNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const groups = navigationByCategory(role);

  return (
    <aside className="flex h-full w-[17.5rem] flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="group block">
          <div className="font-display text-lg font-bold tracking-tight">
            Pro
            <span className="text-orange transition group-hover:text-[#ffb35c]">
              Q
            </span>
            Pay
          </div>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Payroll Operating System
          </p>
        </Link>
      </div>

      <nav
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin"
        aria-label="Primary"
      >
        {groups.map(({ category, items }) => {
          const CatIcon = category.icon;
          return (
            <div key={category.id}>
              <div className="mb-1.5 flex items-center gap-2 px-3">
                <CatIcon className="h-3 w-3 text-orange/80" strokeWidth={2.25} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {category.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-[var(--sidebar-active)] text-white shadow-soft"
                          : "text-white/65 hover:bg-[var(--sidebar-hover)] hover:text-white",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-2xl ring-1 ring-orange/35"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                          }}
                        />
                      ) : null}
                      <span
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                          active
                            ? "bg-orange/20 text-orange"
                            : "bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.85} />
                      </span>
                      <span className="relative truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div>
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
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
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--sidebar-active)] text-white"
                    : "text-white/65 hover:bg-[var(--sidebar-hover)] hover:text-white",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </span>
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-white/80">ProQ AI online</p>
          <p className="mt-0.5 text-[10px] text-white/40">
            Gemini worker pool · failover ready
          </p>
        </div>
        <p className="mt-3 text-[10px] text-white/35">
          Enterprise Payroll OS · MSG Technology
        </p>
      </div>
    </aside>
  );
}
