"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { navigationByCategory } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const groups = navigationByCategory(role);
  const user = data?.user;

  return (
    <aside className="flex h-full w-[230px] flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="group block">
          <div className="font-display text-xl font-bold tracking-tight">
            Pro
            <span className="text-orange transition group-hover:text-[#ffb35c]">
              Q
            </span>
            Pay
          </div>
          <p className="mt-1 text-[11px] font-medium leading-snug text-white/50">
            Enterprise Payroll OS
          </p>
        </Link>
      </div>

      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin"
        aria-label="Primary"
      >
        {groups.map(({ category, items }) => (
          <div key={category.id}>
            <div className="mb-2.5 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {category.label}
              </span>
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`)) ||
                  (item.href === "/dashboard" && pathname === "/dashboard");
                // Prefer exact title match when multiple items share href
                const exactActive =
                  active &&
                  (items.filter((i) => i.href === item.href).length === 1 ||
                    pathname === item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.title}`}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                      exactActive
                        ? "text-white"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {exactActive ? (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-900/30"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        exactActive
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white",
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
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange/20 text-orange">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/90">
                ProQ AI Assistant
              </p>
              <p className="text-[10px] text-white/45">Siap membantu</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
            {user?.avatarInitials ?? "U"}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white/90">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-[11px] text-white/45">
              {user?.role?.replaceAll("_", " ") ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
