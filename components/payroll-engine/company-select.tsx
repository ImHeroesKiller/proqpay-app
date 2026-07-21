"use client";

import { useEffect, useState } from "react";

type Co = { id: string; name: string };

export function CompanySelect({
  value,
  onChange,
  defaultCompanyId,
}: {
  value: string;
  onChange: (id: string) => void;
  defaultCompanyId?: string | null;
}) {
  const [items, setItems] = useState<Co[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/master-data/clients?take=100");
        const data = (await res.json()) as {
          items?: { id: string; name: string }[];
        };
        if (res.ok && data.items?.length) {
          setItems(data.items);
          if (!value && (defaultCompanyId || data.items[0])) {
            onChange(defaultCompanyId || data.items[0]!.id);
          }
          return;
        }
      } catch {
        /* fallthrough */
      }
      // Fallback: payroll groups expose company
      try {
        const res = await fetch("/api/master-data/payroll-groups?take=50");
        const data = (await res.json()) as {
          items?: { company?: { id: string; name: string } }[];
        };
        const map = new Map<string, string>();
        for (const g of data.items ?? []) {
          if (g.company?.id) map.set(g.company.id, g.company.name);
        }
        const list = [...map.entries()].map(([id, name]) => ({ id, name }));
        setItems(list);
        if (!value && list[0]) onChange(list[0].id);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select
      className="flex h-10 w-full max-w-md rounded-lg border border-input bg-card px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select company…</option>
      {items.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
