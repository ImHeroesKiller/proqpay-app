"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { navigationGroupsForRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

/**
 * Routes that may intent-prefetch on hover/focus.
 * All sidebar Links use prefetch={false} to avoid mass RSC fan-out on first paint.
 */
const INTENT_PREFETCH_HREFS = new Set([
  "/dashboard",
  "/employees",
  "/payroll",
  "/approval",
  "/payment-confirmation",
  "/reports",
]);

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  mobile = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const groups = navigationGroupsForRole(role);
  const isCollapsed = collapsed && !mobile;

  const intentPrefetch = useCallback(
    (href: string) => {
      if (!INTENT_PREFETCH_HREFS.has(href)) return;
      router.prefetch(href);
    },
    [router],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        data-tour="sidebar"
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none",
          isCollapsed ? "w-[4.25rem]" : "w-60",
          mobile && "w-60",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-white/10",
            isCollapsed ? "justify-center px-2 py-4" : "px-4 py-4",
          )}
        >
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={onNavigate}
            onMouseEnter={() => intentPrefetch("/dashboard")}
            onFocus={() => intentPrefetch("/dashboard")}
            className={cn("block min-w-0", isCollapsed && "text-center")}
          >
            {isCollapsed ? (
              <span className="font-heading text-sm font-bold tracking-tight text-white">
                PQ
              </span>
            ) : (
              <>
                <div className="font-heading text-[15px] font-bold tracking-tight text-white">
                  ProQPay
                </div>
                <p className="mt-1 text-[10px] font-medium leading-snug text-white/50">
                  Enterprise Payroll Operating System
                </p>
              </>
            )}
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <nav
            className={cn("space-y-4 p-2", isCollapsed && "px-1.5")}
            aria-label="Primary"
          >
            {groups.map((group) => (
              <div key={group.id}>
                {!isCollapsed ? (
                  <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    {group.label}
                  </div>
                ) : (
                  <div className="mx-auto mb-1 h-px w-6 bg-white/10" aria-hidden />
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    const link = (
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={onNavigate}
                        onMouseEnter={() => intentPrefetch(item.href)}
                        onFocus={() => intentPrefetch(item.href)}
                        data-tour={`nav-${item.module}`}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
                          isCollapsed
                            ? "justify-center px-2 py-2.5"
                            : "px-2.5 py-2",
                          active
                            ? "bg-white/12 text-white shadow-[inset_3px_0_0_0_#F28C28]"
                            : "text-white/70 hover:bg-white/6 hover:text-white",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {!isCollapsed ? (
                          <span className="truncate">{item.title}</span>
                        ) : (
                          <span className="sr-only">{item.title}</span>
                        )}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div
          className={cn(
            "border-t border-white/10 p-2",
            isCollapsed ? "flex flex-col items-center gap-2" : "space-y-2",
          )}
        >
          {onToggleCollapse && !mobile ? (
            <Button
              type="button"
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              onClick={onToggleCollapse}
              className="w-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  Collapse
                </>
              )}
            </Button>
          ) : null}
          {!isCollapsed ? (
            <p className="px-2 text-[10px] leading-snug text-white/35">
              Fortune-grade payroll control plane
            </p>
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}
