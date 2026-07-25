"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  EnterpriseContextBar,
  EnterpriseContextProvider,
} from "@/components/context/enterprise-context";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

export function AppShell({
  children,
  organizations = [],
  clients = [],
  projects = [],
  payrollGroups = [],
  periods = [],
}: {
  children: React.ReactNode;
  organizations?: Option[];
  clients?: Option[];
  projects?: Option[];
  payrollGroups?: Option[];
  periods?: Option[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <EnterpriseContextProvider
      organizations={organizations}
      clients={clients}
      projects={projects}
      payrollGroups={payrollGroups}
      periods={periods}
    >
      <div className="flex min-h-screen bg-[#F7F8FC]">
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[230px]">
          <Sidebar />
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
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className={cn("flex min-h-screen flex-1 flex-col lg:pl-[230px]")}>
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <EnterpriseContextBar />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </EnterpriseContextProvider>
  );
}
