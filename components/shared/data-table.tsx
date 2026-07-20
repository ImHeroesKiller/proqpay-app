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
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DataTableDensity = "compact" | "comfortable";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  className?: string;
  density?: DataTableDensity;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyGuidance?: string;
  toolbarExtra?: React.ReactNode;
  bulkActions?: React.ReactNode;
  pageSize?: number;
  onRowSelectionChange?: (rows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search…",
  className,
  density = "comfortable",
  enableRowSelection = false,
  enableColumnVisibility = true,
  isLoading = false,
  isError = false,
  errorMessage = "Unable to load data. Try again or contact support.",
  emptyTitle = "No results",
  emptyDescription = "Adjust filters or clear search to see records.",
  emptyGuidance,
  toolbarExtra,
  bulkActions,
  pageSize = 10,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectCol: ColumnDef<TData, TValue> = {
      id: "__select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border"
          aria-label="Select all rows"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    return [selectCol, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (onRowSelectionChange) {
          const selected = Object.keys(next)
            .filter((k) => next[k])
            .map((k) => data[Number(k)])
            .filter(Boolean);
          onRowSelectionChange(selected as TData[]);
        }
        return next;
      });
    },
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const cellPad =
    density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const headPad =
    density === "compact" ? "h-9 px-3" : "h-11 px-4";
  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k])
    .length;

  if (isError) {
    return (
      <EmptyState
        title="Something went wrong"
        description={errorMessage}
        guidance="Check your connection or open Help Center for support contacts."
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-9"
            aria-label="Search table"
          />
          {globalFilter ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setGlobalFilter("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {globalFilter ? (
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Filter active
            </span>
          ) : null}
          {toolbarExtra}
          {enableColumnVisibility ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-3.5 w-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      className="capitalize"
                      onSelect={(e) => {
                        e.preventDefault();
                        col.toggleVisibility(!col.getIsVisible());
                      }}
                    >
                      <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-border text-[10px]">
                        {col.getIsVisible() ? "✓" : ""}
                      </span>
                      {col.id.replaceAll("_", " ")}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {selectedCount > 0 && bulkActions ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          {bulkActions}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetRowSelection()}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          headPad,
                          "text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        )}
                        scope="col"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 transition hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc" ? (
                              <ArrowUp className="h-3 w-3" aria-hidden />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="h-3 w-3" aria-hidden />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {tableColumns.map((_, j) => (
                      <td key={j} className={cellPad}>
                        <Skeleton className="h-4 w-full max-w-[12rem]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="border-b border-border last:border-0 hover:bg-muted/30 data-[state=selected]:bg-msg-blue/5"
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
                  <td colSpan={tableColumns.length} className="p-0">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      guidance={emptyGuidance}
                      className="rounded-none border-0"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
          {globalFilter ? " matching filters" : ""}
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
