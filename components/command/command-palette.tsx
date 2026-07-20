"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  ArrowRight,
  LifeBuoy,
  Sparkles,
  Settings,
  Wallet,
  ClipboardCheck,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchableNavForRole } from "@/config/navigation";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  group: string;
  href?: string;
  action?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  keywords?: string[];
};

export function CommandPalette({
  open,
  onOpenChange,
  onOpenHelp,
  onStartTour,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenHelp?: () => void;
  onStartTour?: () => void;
}) {
  const router = useRouter();
  const { data } = useSession();
  const role = (data?.user?.role as Role) ?? "VIEWER";
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo<CommandItem[]>(() => {
    const nav = searchableNavForRole(role).map((n) => ({
      id: `nav-${n.href}`,
      label: n.title,
      description: n.group.replaceAll("_", " "),
      group: "Navigate",
      href: n.href,
      icon: n.icon,
      keywords: n.keywords,
    }));

    const actions: CommandItem[] = [
      {
        id: "action-payroll",
        label: "Open payroll periods",
        group: "Quick actions",
        href: "/payroll",
        icon: Wallet,
        keywords: ["run", "salary"],
      },
      {
        id: "action-confirm",
        label: "Payment confirmation queue",
        group: "Quick actions",
        href: "/payment-confirmation",
        icon: ClipboardCheck,
      },
      {
        id: "action-employees",
        label: "Employee directory",
        group: "Quick actions",
        href: "/employees",
        icon: Users,
      },
      {
        id: "action-settings",
        label: "Open settings",
        group: "Quick actions",
        href: "/settings",
        icon: Settings,
      },
      {
        id: "action-help",
        label: "Open help center",
        group: "Help",
        icon: LifeBuoy,
        action: () => onOpenHelp?.(),
        keywords: ["support", "faq", "guide"],
      },
      {
        id: "action-tour",
        label: "Start product tour",
        group: "Help",
        icon: Sparkles,
        action: () => onStartTour?.(),
        keywords: ["onboarding", "guide", "walkthrough"],
      },
    ];

    return [...nav, ...actions];
  }, [role, onOpenHelp, onStartTour]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.label,
        item.description ?? "",
        item.group,
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      if (item.action) {
        item.action();
        return;
      }
      if (item.href) router.push(item.href);
    },
    [onOpenChange, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        run(filtered[active]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, run]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[16%]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menus, pages, and actions…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Command search"
            role="combobox"
            aria-expanded
            aria-controls="command-list"
            aria-autocomplete="list"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div
          id="command-list"
          role="listbox"
          className="max-h-[min(50vh,360px)] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matches for “{query}”. Try another keyword or open Help Center.
            </div>
          ) : (
            groups.map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const Icon = item.icon ?? ArrowRight;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === active}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition",
                            index === active
                              ? "bg-msg-blue/10 text-foreground"
                              : "hover:bg-muted",
                          )}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => run(item)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{item.label}</span>
                            {item.description ? (
                              <span className="block text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-50" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Navigate with ↑ ↓ · Enter to open · Esc to close. Results respect your
          role permissions.
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
