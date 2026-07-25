"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const user = data?.user;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.85} />
        </Button>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-orange" strokeWidth={1.85} />
          <span className="font-medium text-foreground/80">
            Enterprise Payroll Operating System
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" strokeWidth={1.85} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.85} />
          )}
        </Button>
        <div className="hidden items-center gap-2 rounded-2xl border border-border/80 bg-card/70 px-2.5 py-1.5 shadow-soft sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white dark:bg-orange dark:text-white">
            {user?.avatarInitials ?? "U"}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-muted-foreground">
              {user?.role?.replaceAll("_", " ") ?? "—"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.85} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
