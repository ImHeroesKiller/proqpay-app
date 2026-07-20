"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/command/command-palette";
import { HelpCenter } from "@/components/help/help-center";
import {
  FirstLoginOnboarding,
  ProductTour,
} from "@/components/onboarding/product-tour";
import { useSidebarPreference } from "@/lib/hooks/use-sidebar-preference";
import { useOnboardingState } from "@/lib/hooks/use-onboarding";
import { useSession } from "next-auth/react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourForced, setTourForced] = useState(false);
  const { collapsed, toggle } = useSidebarPreference();
  const reduceMotion = useReducedMotion();
  const { data } = useSession();
  const role = data?.user?.role as Role | undefined;
  const onboarding = useOnboardingState(role);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  useCommandPaletteHotkey(openCommand);

  const showFirstLogin = onboarding.ready && !onboarding.firstLoginDone;
  const showTour =
    tourForced ||
    (onboarding.ready &&
      onboarding.firstLoginDone &&
      !onboarding.tourDone &&
      !showFirstLogin);

  const startTour = useCallback(() => {
    setHelpOpen(false);
    setCommandOpen(false);
    onboarding.resetTour();
    setTourForced(true);
  }, [onboarding]);

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex",
          collapsed ? "lg:w-[4.25rem]" : "lg:w-60",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggle} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 shadow-xl"
              initial={reduceMotion ? false : { x: -24, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { x: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 motion-reduce:transition-none",
          collapsed ? "lg:pl-[4.25rem]" : "lg:pl-60",
        )}
      >
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
        >
          {children}
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenHelp={() => setHelpOpen(true)}
        onStartTour={startTour}
      />
      <HelpCenter
        open={helpOpen}
        onOpenChange={setHelpOpen}
        onStartTour={startTour}
      />
      <FirstLoginOnboarding
        open={showFirstLogin}
        onSkip={() => {
          onboarding.completeFirstLogin();
          onboarding.completeTour();
        }}
        onContinue={() => {
          onboarding.completeFirstLogin();
          setTourForced(true);
        }}
      />
      <ProductTour
        open={!!showTour && !showFirstLogin}
        onSkip={() => {
          setTourForced(false);
          onboarding.completeTour();
        }}
        onComplete={() => {
          setTourForced(false);
          onboarding.completeTour();
        }}
      />
    </div>
  );
}
