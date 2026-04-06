"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { InboxDataTable } from "@/components/inbox/inbox-data-table";
import { columns } from "@/components/inbox/columns";
import { useAtomValue } from "jotai";
import { allInboxItemsAtom } from "@/atoms/inbox";
import { Fax } from "@/types";
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";

import { InboxGridCard } from "@/components/inbox/inbox-grid-card";
import { SearchBar } from "@/components/shared/search-bar";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Eye,
  Target,
  Scan,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tokenizedMatch } from "@/lib/search";
import { isToday, isThisMonth, startOfWeek, isAfter } from "date-fns";

type DateRange = "today" | "week" | "month" | "all";

/** Reusable date range check — week starts Monday */
function isInDateRange(date: Date, range: DateRange): boolean {
  if (range === "all") return true;
  if (range === "today") return isToday(date);
  if (range === "week") return isAfter(date, startOfWeek(new Date(), { weekStartsOn: 1 }));
  if (range === "month") return isThisMonth(date);
  return true;
}

/** Count faxes whose classifiedAt falls within a date range */
function countClassifiedInRange(faxes: Fax[], range: DateRange): number {
  return faxes.filter(
    (f) => f.classifiedAt && isInDateRange(new Date(f.classifiedAt), range)
  ).length;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<"all" | "auto-sorted" | "manual-sorted">("all");

  // ─── Unsorted tab state ──────────────────────────────
  const [search, setSearch] = useState("");
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<
    "needs_review" | "not_mri" | "routed" | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "MRI Requisition" | "Other" | "all"
  >("all");
  const [selectedFaxId, setSelectedFaxId] = useState<string | null>(null);
  const [isNavActive, setIsNavActive] = useState(false);
  const [splitHighlightIds, setSplitHighlightIds] = useState<Set<string>>(
    new Set()
  );

  // ─── History tab state ───────────────────────────────
  const [hSearch, setHSearch] = useState("");
  const [hDateRange, setHDateRange] = useState<DateRange>("all");
  const [hCategoryFilter, setHCategoryFilter] = useState<string>("all");
  const [hSelectedFaxId, setHSelectedFaxId] = useState<string | null>(null);
  const [hIsNavActive, setHIsNavActive] = useState(false);
  const [hCurrentPage, setHCurrentPage] = useState(1);
  const [hPageSize, setHPageSize] = useState(25);

  const debouncedSearch = useDebounce(search, 300);
  const hDebouncedSearch = useDebounce(hSearch, 300);
  const allFaxes = useAtomValue(allInboxItemsAtom);

  // ═══ All Faxes tab data ═════════════════════════════
  const stats = useMemo(() => {
    const needsReview = allFaxes.filter((f) => f.pipelineStatus === "needs_review").length;
    const mriCount = allFaxes.filter((f) => f.documentCategory === "MRI Requisition").length;
    const routedCount = allFaxes.filter((f) => f.pipelineStatus === "routed").length;
    const notMriCount = allFaxes.filter((f) => f.pipelineStatus === "not_mri").length;
    return { total: allFaxes.length, needsReview, mriCount, routedCount, notMriCount };
  }, [allFaxes]);

  const filteredFaxes = useMemo(() => {
    let result = [...allFaxes];
    if (pipelineStatusFilter !== "all")
      result = result.filter((f) => f.pipelineStatus === pipelineStatusFilter);
    if (categoryFilter !== "all")
      result = result.filter((f) => f.documentCategory === categoryFilter);
    if (debouncedSearch) {
      result = result.filter((f) =>
        tokenizedMatch(
          [f.patientName, f.documentSourceName, ...f.providers.map(p => p.providerName), f.senderName,
           f.documentCategory, f.senderFaxNumber, f.description].filter(Boolean).join(" "),
          debouncedSearch
        )
      );
    }
    return result;
  }, [allFaxes, debouncedSearch, pipelineStatusFilter, categoryFilter]);

  const handleKeyboardSelect = useCallback(
    (index: number) => {
      const fax = filteredFaxes[index];
      if (fax) setSelectedFaxId(fax.id);
    },
    [filteredFaxes]
  );
  const deactivateNav = useCallback(() => setIsNavActive(false), []);
  const { highlightedIndex } = useTableKeyboardNav({
    rowCount: filteredFaxes.length,
    onSelect: handleKeyboardSelect,
    enabled: isNavActive && activeTab === "all",
    onDeactivate: deactivateNav,
  });

  const handleSplitComplete = useCallback(
    (_originalFaxId: string, newFaxIds: string[]) => {
      setSplitHighlightIds(new Set(newFaxIds));
      setSelectedFaxId(null);
      setTimeout(() => setSplitHighlightIds(new Set()), 4000);
    },
    []
  );

  // ═══ Tab-specific data ═══════════════════════════════
  // "Discarded" tab = not_mri faxes
  const discardedFaxes = useMemo(
    () => allFaxes.filter((f) => f.pipelineStatus === "not_mri")
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
    [allFaxes]
  );

  // "Routed" tab = routed faxes (confirmed MRI requisitions sent to pipeline)
  const routedFaxes = useMemo(
    () => allFaxes.filter((f) => f.pipelineStatus === "routed")
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
    [allFaxes]
  );

  // Keep sortedFaxes for history filter compatibility
  const sortedFaxes = useMemo(
    () => [...discardedFaxes, ...routedFaxes],
    [discardedFaxes, routedFaxes]
  );

  // KPI stats
  const kpiStats = useMemo(() => {
    const avgConfidence = allFaxes.length > 0
      ? Math.round(allFaxes.reduce((sum, f) => sum + f.classificationConfidenceScore, 0) / allFaxes.length)
      : 0;
    return { avgConfidence };
  }, [allFaxes]);

  const applyHistoryFilters = useCallback(
    (faxes: Fax[]) => {
      let result = [...faxes];
      if (hDateRange !== "all") {
        result = result.filter((f) => {
          if (!f.completedAt) return false;
          return isInDateRange(new Date(f.completedAt), hDateRange);
        });
      }
      if (hCategoryFilter !== "all")
        result = result.filter((f) => f.documentCategory === hCategoryFilter);
      if (hDebouncedSearch) {
        result = result.filter((f) =>
          tokenizedMatch(
            [f.patientName, f.documentSourceName, ...f.providers.map(p => p.providerName), f.senderName,
             f.documentCategory, f.senderFaxNumber, f.description].filter(Boolean).join(" "),
            hDebouncedSearch
          )
        );
      }
      return result;
    },
    [hDateRange, hCategoryFilter, hDebouncedSearch]
  );

  // Keyboard nav for history tabs
  const activeHistoryFaxes = useMemo(
    () => activeTab === "auto-sorted" ? applyHistoryFilters(discardedFaxes) : applyHistoryFilters(routedFaxes),
    [activeTab, applyHistoryFilters, discardedFaxes, routedFaxes]
  );
  const hHandleKeyboardSelect = useCallback(
    (index: number) => {
      const fax = activeHistoryFaxes[index];
      if (fax) setHSelectedFaxId(fax.id);
    },
    [activeHistoryFaxes]
  );
  const hDeactivateNav = useCallback(() => setHIsNavActive(false), []);
  const { highlightedIndex: hHighlightedIndex } = useTableKeyboardNav({
    rowCount: activeHistoryFaxes.length,
    onSelect: hHandleKeyboardSelect,
    enabled: hIsNavActive && activeTab !== "all",
    onDeactivate: hDeactivateNav,
  });

  // ─── Shared handlers ────────────────────────────────
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "all" | "auto-sorted" | "manual-sorted");
    setSelectedFaxId(null);
    setHSelectedFaxId(null);
  };

  const handleUnsortedReset = () => {
    setSearch("");
    setPipelineStatusFilter("all");
    setCategoryFilter("all");
  };
  const handleHistoryReset = () => {
    setHSearch("");
    setHDateRange("all");
    setHCategoryFilter("all");
    setHCurrentPage(1);
  };

  const hasUnsortedFilters =
    search || pipelineStatusFilter !== "all" || categoryFilter !== "all";
  const hasHistoryFilters =
    hSearch || hDateRange !== "all" || hCategoryFilter !== "all";

  // Dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedFaxId(null);
      setHSelectedFaxId(null);
    }
  };

  const activeFaxId =
    activeTab === "all" ? selectedFaxId : hSelectedFaxId;

  return (
    <div className="space-y-2">
      <PageHeader
        title="Inbox"
        description="Manage incoming faxes"
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border rounded-sm overflow-hidden">
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-amber-50 flex items-center justify-center">
            <Eye
              className="h-4 w-4 text-amber-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {stats.needsReview || "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Needs Review
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-sky-50 flex items-center justify-center">
            <Scan
              className="h-4 w-4 text-sky-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {stats.mriCount || "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              MRI Requisitions
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-emerald-50 flex items-center justify-center">
            <ArrowRight
              className="h-4 w-4 text-emerald-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {stats.routedCount || "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Routed
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-violet-50 flex items-center justify-center">
            <Target
              className="h-4 w-4 text-violet-500"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {kpiStats.avgConfidence ? `${kpiStats.avgConfidence}%` : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Avg Confidence
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList variant="line">
          <TabsTrigger value="all" className="gap-1.5">
            <span>All Faxes</span>
            {stats.total > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {stats.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auto-sorted" className="gap-1.5">
            <span>Discarded</span>
            {discardedFaxes.length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {discardedFaxes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="manual-sorted" className="gap-1.5">
            <span>Routed</span>
            {routedFaxes.length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {routedFaxes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══ All Faxes Tab ═══ */}
        <TabsContent value="all" className="space-y-2">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search patient, provider, fax line, document..."
              aria-label="Search faxes by patient, provider, fax line, or document type"
              onCommandK={() => setIsNavActive(true)}
            />

            <div className="flex items-center gap-2">
              {stats.needsReview > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPipelineStatusFilter(pipelineStatusFilter === "needs_review" ? "all" : "needs_review")}
                  className={cn(
                    "h-8 font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm",
                    pipelineStatusFilter === "needs_review"
                      ? "border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-border text-amber-700 hover:bg-muted/50"
                  )}
                >
                  <Eye className="h-3 w-3 mr-1" strokeWidth={1.5} />
                  {stats.needsReview} Review
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryFilter(categoryFilter === "MRI Requisition" ? "all" : "MRI Requisition")}
                className={cn(
                  "h-8 font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm",
                  categoryFilter === "MRI Requisition"
                    ? "border-sky-500 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    : "border-border text-sky-700 hover:bg-muted/50"
                )}
              >
                <Scan className="h-3 w-3 mr-1" strokeWidth={1.5} />
                {stats.mriCount} MRI
              </Button>
            </div>

            <div className="hidden md:block h-6 w-px bg-border" />

            {/* Pipeline Status filter */}
            <Select
              value={pipelineStatusFilter}
              onValueChange={(v) => setPipelineStatusFilter(v as typeof pipelineStatusFilter)}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="not_mri">Not MRI</SelectItem>
                <SelectItem value="routed">Routed</SelectItem>
              </SelectContent>
            </Select>

            {hasUnsortedFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnsortedReset}
                className="h-8 px-2 text-xs"
                aria-label="Clear all filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
              {filteredFaxes.length} result
              {filteredFaxes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop: data table — TanStack handles sort + pagination */}
          <div className="hidden md:block">
            <InboxDataTable
              columns={columns}
              data={filteredFaxes}
              globalFilter={debouncedSearch}
              highlightedRowIndex={isNavActive ? highlightedIndex : -1}
              highlightedIds={splitHighlightIds}
              isKeyboardNavActive={isNavActive}
              onRowClick={(fax) => {
                const f = fax as Fax;
                if (!f.processingState) setSelectedFaxId(f.id);
              }}
            />
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {filteredFaxes
              .slice()
              .sort((a, b) =>
                new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
              )
              .map((fax) => (
                <InboxGridCard
                  key={fax.id}
                  fax={fax}
                  onClick={(f) => { if (!f.processingState) setSelectedFaxId(f.id); }}
                />
              ))}
            {filteredFaxes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No faxes found</p>
            )}
          </div>
        </TabsContent>

        {/* ═══ Auto Sorted Tab ═══ */}
        <TabsContent value="auto-sorted" className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              value={hSearch}
              onChange={(v) => {
                setHSearch(v);
                setHCurrentPage(1);
              }}
              placeholder="Search patient, provider, fax line, document..."
              aria-label="Search history"
              onCommandK={() => setHIsNavActive(true)}
            />

            <Select
              value={hDateRange}
              onValueChange={(v) => {
                setHDateRange(v as DateRange);
                setHCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={hCategoryFilter}
              onValueChange={(v) => {
                setHCategoryFilter(v);
                setHCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MRI Requisition">MRI Requisition</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {hasHistoryFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHistoryReset}
                className="h-8 px-2 text-xs"
                aria-label="Clear all filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
              {applyHistoryFilters(discardedFaxes).length}{" "}
              result
              {applyHistoryFilters(discardedFaxes).length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <InboxDataTable
              columns={columns}
              data={applyHistoryFilters(discardedFaxes).slice(
                (hCurrentPage - 1) * hPageSize,
                hCurrentPage * hPageSize
              )}
              globalFilter={hDebouncedSearch}
              defaultSortId="receivedAt"
              highlightedRowIndex={hIsNavActive ? hHighlightedIndex : -1}
              isKeyboardNavActive={hIsNavActive}
              onRowClick={(fax) => setHSelectedFaxId((fax as Fax).id)}
            />
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {applyHistoryFilters(discardedFaxes).slice(
              (hCurrentPage - 1) * hPageSize,
              hCurrentPage * hPageSize
            ).map((fax) => (
              <InboxGridCard
                key={fax.id}
                fax={fax}
                onClick={(f) => setHSelectedFaxId(f.id)}
              />
            ))}
          </div>

          <TablePagination
            totalItems={applyHistoryFilters(discardedFaxes).length}
            pageSize={hPageSize}
            currentPage={hCurrentPage}
            onPageChange={setHCurrentPage}
            onPageSizeChange={(size) => {
              setHPageSize(size);
              setHCurrentPage(1);
            }}
          />
        </TabsContent>

        {/* ═══ Manually Sorted Tab ═══ */}
        <TabsContent value="manual-sorted" className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              value={hSearch}
              onChange={(v) => {
                setHSearch(v);
                setHCurrentPage(1);
              }}
              placeholder="Search patient, provider, fax line, document..."
              aria-label="Search manually sorted"
              onCommandK={() => setHIsNavActive(true)}
            />

            <Select
              value={hDateRange}
              onValueChange={(v) => {
                setHDateRange(v as DateRange);
                setHCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={hCategoryFilter}
              onValueChange={(v) => {
                setHCategoryFilter(v);
                setHCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MRI Requisition">MRI Requisition</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {hasHistoryFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHistoryReset}
                className="h-8 px-2 text-xs"
                aria-label="Clear all filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
              {applyHistoryFilters(routedFaxes).length} result
              {applyHistoryFilters(routedFaxes).length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <InboxDataTable
              columns={columns}
              data={applyHistoryFilters(routedFaxes).slice(
                (hCurrentPage - 1) * hPageSize,
                hCurrentPage * hPageSize
              )}
              globalFilter={hDebouncedSearch}
              defaultSortId="receivedAt"
              highlightedRowIndex={-1}
              isKeyboardNavActive={false}
              onRowClick={(fax) => setHSelectedFaxId((fax as Fax).id)}
            />
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {applyHistoryFilters(routedFaxes).slice(
              (hCurrentPage - 1) * hPageSize,
              hCurrentPage * hPageSize
            ).map((fax) => (
              <InboxGridCard
                key={fax.id}
                fax={fax}
                onClick={(f) => setHSelectedFaxId(f.id)}
              />
            ))}
          </div>

          <TablePagination
            totalItems={applyHistoryFilters(routedFaxes).length}
            pageSize={hPageSize}
            currentPage={hCurrentPage}
            onPageChange={setHCurrentPage}
            onPageSizeChange={(size) => {
              setHPageSize(size);
              setHCurrentPage(1);
            }}
          />
        </TabsContent>

      </Tabs>

      <FaxViewerDialog
        faxId={activeFaxId}
        open={activeFaxId !== null}
        onOpenChange={handleDialogClose}
        onSplitComplete={handleSplitComplete}
      />
    </div>
  );
}
