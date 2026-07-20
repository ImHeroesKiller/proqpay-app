"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const user = data?.user;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden text-sm text-muted-foreground sm:block">
          Enterprise Payroll Operating System
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
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <div className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white dark:bg-white dark:text-navy">
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
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
