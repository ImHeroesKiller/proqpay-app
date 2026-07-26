"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Menu,
  LogOut,
  Bell,
  HelpCircle,
  Search,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { projects, selection, setSelection, isLoading } = useEnterpriseContext();

  useEffect(() => {
    setGreet(greetingPrefix());
  }, []);

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  function search(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) return setResults([]);
    searchTimer.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        if (response.ok) setResults((await response.json()).results);
      } finally { setLoadingSearch(false); }
    }, 220);
  }

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
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari karyawan, payroll, invoice…"
              className="h-10 w-[220px] rounded-xl border-border bg-[#F7F8FC] pl-9 text-sm lg:w-[280px]"
              aria-label="Pencarian global"
              value={query}
              onChange={(event) => search(event.target.value)}
            />
            {(results.length > 0 || loadingSearch) && (
              <div className="absolute right-0 top-12 z-50 w-[360px] rounded-xl border border-border bg-white p-2 shadow-lift">
                {loadingSearch ? <p className="px-3 py-2 text-sm text-muted-foreground">Mencari…</p> : results.map((result) => (
                  <button key={`${result.detail}-${result.id}`} type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted" onClick={() => { router.push(result.href); setQuery(""); setResults([]); }}>
                    <span className="block text-sm font-medium text-navy">{result.label}</span><span className="text-xs text-muted-foreground">{result.detail}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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

          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-2 py-1.5 shadow-soft">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
              {user.avatarInitials}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-semibold text-navy">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {user.role.replaceAll("_", " ")}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 rounded-xl sm:inline-flex"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.85} />
            <span>Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

type SearchResult = { id: string; label: string; detail: string; href: string };
type Notification = { id: string; title: string; body: string; readAt: string | null };
