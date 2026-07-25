"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { IdaAssistant } from "@/components/ida/ida-assistant";
import {
  EnterpriseContextBar,
  EnterpriseContextProvider,
} from "@/components/context/enterprise-context";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export type ShellUser = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  avatarInitials: string;
  organizationId?: string;
  companyId?: string | null;
};

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <EnterpriseContextProvider>
      <div className="flex min-h-screen bg-[#F7F8FC]">
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[230px]">
          <Sidebar user={user} />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[230px] shadow-lift">
              <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className={cn("flex min-h-screen flex-1 flex-col lg:pl-[230px]")}>
          <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />
          <EnterpriseContextBar />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <IdaAssistant />
      </div>
    </EnterpriseContextProvider>
  );
}
