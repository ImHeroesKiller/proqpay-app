"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  Rows3,
  Search,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  className?: string;
  exportName?: string;
}

type Density = "comfortable" | "compact";

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  className,
  exportName = "export",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [density, setDensity] = useState<Density>("comfortable");
  const [showColumns, setShowColumns] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const exportCsv = () => {
    const visibleCols = table.getVisibleLeafColumns();
    const headers = visibleCols.map((c) => String(c.id));
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleCols
        .map((col) => {
          const v = row.getValue(col.id);
          const s = v == null ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellPad = density === "compact" ? "px-3 py-2" : "px-4 py-3";

  const columnIds = useMemo(
    () => table.getAllLeafColumns().map((c) => c.id),
    [table],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.85}
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-2xl pl-9"
            aria-label="Search table"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowColumns((v) => !v)}
              aria-expanded={showColumns}
            >
              <Columns3 className="h-3.5 w-3.5" strokeWidth={1.85} />
              Columns
            </Button>
            {showColumns ? (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-2xl border border-border bg-card p-2 shadow-lift">
                {columnIds.map((id) => {
                  const col = table.getColumn(id);
                  if (!col) return null;
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                      />
                      {id}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDensity((d) =>
                d === "comfortable" ? "compact" : "comfortable",
              )
            }
          >
            <Rows3 className="h-3.5 w-3.5" strokeWidth={1.85} />
            {density === "comfortable" ? "Compact" : "Comfortable"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.85} />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1",
                              header.column.getCanSort() &&
                                "cursor-pointer select-none hover:text-foreground",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : null}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/35"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn(cellPad, "align-middle")}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
