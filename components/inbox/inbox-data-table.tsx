"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface InboxDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  globalFilter?: string;
  highlightedIds?: Set<string>;
  /** Index of the keyboard-highlighted row (-1 = none) */
  highlightedRowIndex?: number;
  /** Whether keyboard navigation mode is active (shows ring around table) */
  isKeyboardNavActive?: boolean;
  defaultSortId?: string;
  /** Externally controlled sort override (e.g. SLA sort button) */
  sortingOverride?: SortingState;
  onRowClick?: (row: TData) => void;
}

export function InboxDataTable<TData, TValue>({
  columns,
  data,
  globalFilter = "",
  highlightedIds,
  highlightedRowIndex = -1,
  isKeyboardNavActive = false,
  defaultSortId = "receivedAt",
  sortingOverride,
  onRowClick,
}: InboxDataTableProps<TData, TValue>) {
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedRowIndex >= 0) {
      const el = rowRefs.current.get(highlightedRowIndex);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedRowIndex]);
  const [internalSorting, setInternalSorting] = useState<SortingState>([
    { id: defaultSortId, desc: true },
  ]);
  const sorting = sortingOverride ?? internalSorting;
  const setSorting = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const next = typeof updater === "function" ? updater(internalSorting) : updater;
    setInternalSorting(next);
  };
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div>
      <div className={cn(
        "border transition-shadow",
        isKeyboardNavActive && "ring-2 ring-primary/20 border-primary/30"
      )}>
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              const totalSize = headerGroup.headers.reduce((sum, h) => sum + h.getSize(), 0);
              return (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-9 px-3 border-r last:border-r-0"
                    style={{ width: `${(header.getSize() / totalSize) * 100}%` }}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : header.column.getCanSort()
                      ? (
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}`}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === "asc" && " ↑"}
                          {header.column.getIsSorted() === "desc" && " ↓"}
                        </button>
                      )
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
              );
            })}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => {
                const rowData = row.original as Record<string, unknown>;
                const isIdHighlighted =
                  highlightedIds &&
                  highlightedIds.size > 0 &&
                  typeof rowData.id === "string" &&
                  highlightedIds.has(rowData.id);
                const isKeyboardHighlighted = highlightedRowIndex === rowIndex;
                return (
                <TableRow
                  key={row.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(rowIndex, el);
                    else rowRefs.current.delete(rowIndex);
                  }}
                  className={`group cursor-pointer hover:bg-muted/50 border-b last:border-0 ${
                    isKeyboardHighlighted ? "bg-accent ring-1 ring-inset ring-primary/20" : ""
                  } ${
                    isIdHighlighted ? "border-l-2 border-l-sky-500 bg-sky-50/30" : ""
                  }`}
                  onClick={() => onRowClick?.(row.original as TData)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 px-3 overflow-hidden">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-40" aria-hidden="true" />
                    <p className="text-sm font-medium">No faxes found</p>
                    <p className="text-xs">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <nav aria-label="Fax inbox pagination" className="flex items-center justify-end gap-4 pt-3">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
