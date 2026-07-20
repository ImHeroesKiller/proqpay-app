"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Building2 } from "lucide-react";

type Mode = "list" | "create" | "edit";

export function MasterDataCrudShell({
  title,
  description,
  endpoint,
  columns,
  createFields,
  canManage,
  mapRow,
  buildCreateBody,
  emptyTitle = "No records",
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: { key: string; label: string }[];
  createFields: {
    key: string;
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
  }[];
  canManage: boolean;
  mapRow: (item: Record<string, unknown>) => Record<string, string>;
  buildCreateBody: (form: Record<string, string>) => Record<string, unknown>;
  emptyTitle?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [form, setForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const body = buildCreateBody(form);
      const res = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "edit" ? { id: editId, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMode("list");
      setForm({});
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, status: string) {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canManage && mode === "list" ? (
          <Button
            onClick={() => {
              setMode("create");
              setForm({});
            }}
          >
            Create
          </Button>
        ) : null}
      </div>

      {mode === "list" ? (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="secondary" onClick={() => void load()}>
              Search
            </Button>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={emptyTitle}
              description="Create a record or adjust your search filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-medium">
                        {c.label}
                      </th>
                    ))}
                    {canManage ? (
                      <th className="px-3 py-2 font-medium">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((raw) => {
                    const row = mapRow(raw);
                    const id = String(raw.id ?? "");
                    const status = String(raw.status ?? raw.lifecycleStatus ?? "");
                    return (
                      <tr key={id} className="border-b last:border-0">
                        {columns.map((c) => (
                          <td key={c.key} className="px-3 py-2">
                            {c.key === "status" || c.key === "lifecycleStatus" ? (
                              <Badge variant="secondary">{row[c.key] ?? status}</Badge>
                            ) : (
                              row[c.key] ?? "—"
                            )}
                          </td>
                        ))}
                        {canManage ? (
                          <td className="space-x-2 px-3 py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditId(id);
                                setMode("edit");
                                const f: Record<string, string> = {};
                                for (const field of createFields) {
                                  f[field.key] = String(raw[field.key] ?? "");
                                }
                                setForm(f);
                              }}
                            >
                              Edit
                            </Button>
                            {status === "ACTIVE" || status === "INACTIVE" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void toggleStatus(id, status)}
                              >
                                {status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </Button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {total} record(s)
              </p>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">
              {mode === "create" ? "Create" : "Edit"} {title}
            </h3>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {createFields.map((f) => (
                <label key={f.key} className="space-y-1 text-sm">
                  <span className="text-muted-foreground">
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  <Input
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button disabled={saving} onClick={() => void onSave()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMode("list");
                  setForm({});
                  setEditId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
