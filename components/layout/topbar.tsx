"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Menu,
  LogOut,
  Bell,
  HelpCircle,
  ChevronDown,
  Building2,
  UserRound,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnterpriseContext } from "@/components/context/enterprise-context";
import type { ShellUser } from "@/components/layout/app-shell";

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export function Topbar({
  user,
  onMenuClick,
}: {
  user: ShellUser;
  onMenuClick?: () => void;
}) {
  const [greet, setGreet] = useState("Selamat datang");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { projects, selection, setSelection, isLoading } = useEnterpriseContext();

  useEffect(() => {
    setGreet(greetingPrefix());
  }, []);

  async function openNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (!nextOpen) return;
    const response = await fetch("/api/notifications");
    if (response.ok) setNotifications((await response.json()).notifications);
  }

  async function markNotificationsRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.85} />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-navy sm:text-2xl">
              {greet}, {user.name} 👋
            </h1>
            <p className="mt-0.5 hidden text-[13px] text-muted-foreground sm:block">
              Kendalikan payroll perusahaan Anda dengan lebih cerdas.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative">
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl" aria-label="Notifikasi" onClick={openNotifications}>
            <Bell className="h-5 w-5 text-navy/70" strokeWidth={1.85} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange ring-2 ring-white" />
          </Button>
          {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-white p-2 shadow-lift"><div className="flex items-center justify-between px-2 py-1"><span className="text-sm font-semibold">Notifikasi</span><button type="button" onClick={markNotificationsRead} className="text-xs text-orange">Tandai terbaca</button></div>{notifications.length ? notifications.map((item) => <div key={item.id} className="rounded-lg px-2 py-2 text-sm hover:bg-muted"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.body}</p></div>) : <p className="px-2 py-3 text-sm text-muted-foreground">Tidak ada notifikasi baru.</p>}</div>}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 rounded-xl sm:inline-flex"
            aria-label="Bantuan"
            onClick={() => window.dispatchEvent(new Event("open-ida"))}
          >
            <HelpCircle className="h-5 w-5 text-navy/70" strokeWidth={1.85} />
          </Button>

          <label className="hidden items-center gap-2 rounded-xl border border-border bg-[#F7F8FC] px-3 py-2 text-left text-sm transition hover:bg-muted lg:flex">
            <Building2 className="h-4 w-4 text-navy/60" strokeWidth={1.85} />
            <select aria-label="Project aktif" disabled={isLoading} value={selection.projectId} onChange={(event) => setSelection({ projectId: event.target.value })} className="max-w-[120px] appearance-none bg-transparent font-medium text-navy outline-none"><option value="ALL">Semua proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}</select>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </label>

          <div className="relative">
          <button type="button" aria-label="Menu akun" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-border bg-white px-2 py-1.5 shadow-soft transition hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
              {user.avatarInitials}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-semibold text-navy">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {user.role.replaceAll("_", " ")}
              </p>
            </div>
          </button>
          {accountOpen ? <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-border bg-white p-2 shadow-lift"><Link href="/settings#account" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy hover:bg-muted"><UserRound className="h-4 w-4" /> Profile</Link><Link href="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-navy hover:bg-muted"><Settings className="h-4 w-4" /> Settings</Link><button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Keluar</button></div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}

type Notification = { id: string; title: string; body: string; readAt: string | null };
