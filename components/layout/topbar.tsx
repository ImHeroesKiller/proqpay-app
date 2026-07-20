"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Menu,
  LogOut,
  Moon,
  Sun,
  Search,
  HelpCircle,
  User,
  Keyboard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { resolveRouteMeta } from "@/config/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Topbar({
  onMenuClick,
  onOpenCommand,
  onOpenHelp,
}: {
  onMenuClick?: () => void;
  onOpenCommand?: () => void;
  onOpenHelp?: () => void;
}) {
  const { data } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const user = data?.user;
  const meta = resolveRouteMeta(pathname);
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <TooltipProvider delayDuration={300}>
      <header
        data-tour="topbar"
        className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="flex h-12 items-center gap-2 px-3 sm:h-13 sm:px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <Breadcrumb pathname={pathname} className="hidden sm:block" />
            <p className="truncate text-sm font-semibold sm:mt-0.5">
              {meta.title}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 px-2.5 text-muted-foreground md:inline-flex"
              onClick={onOpenCommand}
              data-tour="command-trigger"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {isMac ? "⌘" : "Ctrl"}K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onOpenCommand}
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenHelp}
                  aria-label="Help center"
                  data-tour="help-trigger"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help center</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 px-1.5 sm:px-2"
                  aria-label="User menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-msg-blue text-[10px] font-bold text-white">
                    {user?.avatarInitials ?? "U"}
                  </div>
                  <div className="hidden max-w-[9rem] text-left leading-tight lg:block">
                    <p className="truncate text-xs font-semibold">
                      {user?.name ?? "User"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {user?.role?.replaceAll("_", " ") ?? "—"}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span>{user?.name ?? "User"}</span>
                    <span className="font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                    <span className="font-normal text-muted-foreground">
                      Role · {user?.role?.replaceAll("_", " ") ?? "—"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenCommand}>
                  <Keyboard className="h-4 w-4" />
                  Command palette
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenHelp}>
                  <HelpCircle className="h-4 w-4" />
                  Help center
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/settings">
                    <User className="h-4 w-4" />
                    Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
