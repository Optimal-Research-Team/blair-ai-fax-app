"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { InboxDataTable } from "@/components/inbox/inbox-data-table";
import { columns } from "@/components/inbox/columns";
import { useAtomValue, useAtom } from "jotai";
import { allInboxItemsAtom, faxesAtom } from "@/atoms/inbox";
import { viewedAutoFiledIdsAtom } from "@/atoms/viewed-auto-filed";
import { ClassificationStage, ClassificationStatus, Fax } from "@/types";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { CLASSIFICATION_STATUS_LABELS, STAGE_LABELS } from "@/lib/constants";
import {
  X,
  AlertTriangle,
  Eye,
  CalendarCheck,
  TrendingUp,
  Wand2,
  Target,
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
  const [statusFilters, setStatusFilters] = useState<ClassificationStatus[]>([]);
  const [stageFilters, setStageFilters] = useState<ClassificationStage[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<
    "normal" | "abnormal" | "all"
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
  const classifiedFaxes = useAtomValue(faxesAtom);

  // Hydration guard for localStorage-backed store
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [viewedIds, setViewedIds] = useAtom(viewedAutoFiledIdsAtom);
  const markAsViewed = useCallback(
    (id: string) =>
      setViewedIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setViewedIds]
  );

  // ═══ All Faxes tab data ═════════════════════════════
  const stats = useMemo(() => {
    const pendingReview = allFaxes.filter(
      (f) => f.classificationStatus === ClassificationStatus.NeedsReview
    ).length;
    const urgentCount = allFaxes.filter(
      (f) => f.priority === "abnormal"
    ).length;
    return { total: allFaxes.length, pendingReview, urgentCount };
  }, [allFaxes]);

  const filteredFaxes = useMemo(() => {
    let result = [...allFaxes];
    if (statusFilters.length > 0)
      result = result.filter((f) => statusFilters.includes(f.classificationStatus));
    if (stageFilters.length > 0)
      result = result.filter((f) => stageFilters.includes(f.classificationStage));
    if (priorityFilter !== "all")
      result = result.filter((f) => f.priority === priorityFilter);
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
  }, [allFaxes, debouncedSearch, statusFilters, stageFilters, priorityFilter]);

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

  // ═══ History tab data ════════════════════════════════
  const sortedFaxes = useMemo(
    () =>
      allFaxes
        .filter(
          (f) =>
            f.classificationStage === ClassificationStage.ManuallyFiled ||
            f.classificationStage === ClassificationStage.AutoFiled
        )
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() -
            new Date(a.receivedAt).getTime()
        ),
    [allFaxes]
  );

  const newAutoSorted = useMemo(
    () =>
      hydrated
        ? sortedFaxes.filter(
            (f) => f.classificationStage === ClassificationStage.AutoFiled && !viewedIds.includes(f.id)
          )
        : [],
    [sortedFaxes, viewedIds, hydrated]
  );

  const regularHistory = useMemo(
    () =>
      hydrated
        ? sortedFaxes.filter(
            (f) =>
              f.classificationStage === ClassificationStage.ManuallyFiled ||
              (f.classificationStage === ClassificationStage.AutoFiled && viewedIds.includes(f.id))
          )
        : sortedFaxes,
    [sortedFaxes, viewedIds, hydrated]
  );

  // Manually sorted = manually filed faxes
  const manuallySorted = useMemo(
    () => sortedFaxes.filter((f) => f.classificationStage === ClassificationStage.ManuallyFiled),
    [sortedFaxes]
  );

  const docTypes = useMemo(() => {
    const types = new Set(sortedFaxes.map((f) => f.documentCategory));
    return Array.from(types).sort();
  }, [sortedFaxes]);

  // KPI stats — counts classifications from real DB data using classifiedAt
  const kpiStats = useMemo(() => {
    const today = countClassifiedInRange(allFaxes, "today");
    const thisWeek = countClassifiedInRange(allFaxes, "week");
    const filedCount = classifiedFaxes.filter(
      (f) => f.classificationStage === ClassificationStage.AutoFiled || f.classificationStage === ClassificationStage.ManuallyFiled
    ).length;
    const autoRate = classifiedFaxes.length > 0 ? Math.round((filedCount / classifiedFaxes.length) * 100) : 0;
    const avgConfidence = allFaxes.length > 0
      ? Math.round(allFaxes.reduce((sum, f) => sum + f.classificationConfidenceScore, 0) / allFaxes.length)
      : 0;
    return { today, thisWeek, autoRate, avgConfidence };
  }, [allFaxes, classifiedFaxes]);

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

  const filteredNewAutoSorted = useMemo(
    () => applyHistoryFilters(newAutoSorted),
    [applyHistoryFilters, newAutoSorted]
  );
  const filteredRegularHistory = useMemo(
    () => applyHistoryFilters(regularHistory),
    [applyHistoryFilters, regularHistory]
  );
  const filteredManuallySorted = useMemo(
    () => applyHistoryFilters(manuallySorted),
    [applyHistoryFilters, manuallySorted]
  );
  const paginatedRegularHistory = useMemo(() => {
    const start = (hCurrentPage - 1) * hPageSize;
    return filteredRegularHistory.slice(start, start + hPageSize);
  }, [filteredRegularHistory, hCurrentPage, hPageSize]);

  // Keyboard nav for history
  const allHistoryFaxes = useMemo(
    () => [...filteredNewAutoSorted, ...paginatedRegularHistory],
    [filteredNewAutoSorted, paginatedRegularHistory]
  );
  const hHandleKeyboardSelect = useCallback(
    (index: number) => {
      const fax = allHistoryFaxes[index];
      if (fax) setHSelectedFaxId(fax.id);
    },
    [allHistoryFaxes]
  );
  const hDeactivateNav = useCallback(() => setHIsNavActive(false), []);
  const { highlightedIndex: hHighlightedIndex } = useTableKeyboardNav({
    rowCount: allHistoryFaxes.length,
    onSelect: hHandleKeyboardSelect,
    enabled: hIsNavActive && activeTab === "auto-sorted",
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
    setStatusFilters([]);
    setStageFilters([]);
    setPriorityFilter("all");
  };
  const handleHistoryReset = () => {
    setHSearch("");
    setHDateRange("all");
    setHCategoryFilter("all");
    setHCurrentPage(1);
  };

  const hasUnsortedFilters =
    search || statusFilters.length > 0 || stageFilters.length > 0 || priorityFilter !== "all";
  const hasHistoryFilters =
    hSearch || hDateRange !== "all" || hCategoryFilter !== "all";

  const toggleUrgentFilter = () => {
    if (priorityFilter === "abnormal") {
      setPriorityFilter("all");
    } else {
      setPriorityFilter("abnormal");
    }
  };

  const toggleNeedsReviewFilter = () => {
    if (statusFilters.includes(ClassificationStatus.NeedsReview)) {
      setStatusFilters(statusFilters.filter((s) => s !== ClassificationStatus.NeedsReview));
    } else {
      setStatusFilters([...statusFilters, ClassificationStatus.NeedsReview]);
    }
  };

  const toggleStatusFilter = (status: ClassificationStatus) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter((s) => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const toggleStageFilter = (stage: ClassificationStage) => {
    if (stageFilters.includes(stage)) {
      setStageFilters(stageFilters.filter((s) => s !== stage));
    } else {
      setStageFilters([...stageFilters, stage]);
    }
  };

  // Dialog close: mark auto-filed as viewed
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      const faxId =
        activeTab === "all" ? selectedFaxId : hSelectedFaxId;
      if (faxId) {
        const fax = allFaxes.find((f) => f.id === faxId);
        if (fax?.classificationStage === ClassificationStage.AutoFiled) markAsViewed(faxId);
      }
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
          <div className="h-8 w-8 rounded-sm bg-emerald-50 flex items-center justify-center">
            <CalendarCheck
              className="h-4 w-4 text-emerald-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {kpiStats.today || "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Sorted Today
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-sky-50 flex items-center justify-center">
            <TrendingUp
              className="h-4 w-4 text-sky-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {kpiStats.thisWeek || "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              This Week
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-amber-50 flex items-center justify-center">
            <Wand2
              className="h-4 w-4 text-amber-600"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums leading-none">
              {kpiStats.autoRate}%
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Auto-File Rate
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
            <span className="hidden sm:inline">Unsorted</span>
            <span className="sm:hidden">Unsorted</span>
            {stats.total > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {stats.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auto-sorted" className="gap-1.5">
            <span className="hidden sm:inline">Auto Sorted</span>
            <span className="sm:hidden">Auto</span>
            {sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled).length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="manual-sorted" className="gap-1.5">
            <span className="hidden sm:inline">Manually Sorted</span>
            <span className="sm:hidden">Manual</span>
            {manuallySorted.length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {manuallySorted.length}
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
              {stats.urgentCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleUrgentFilter}
                  className={cn(
                    "h-8 font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm",
                    priorityFilter === "abnormal"
                      ? "border-red-600 bg-background text-red-700 hover:bg-muted/50"
                      : "border-border text-red-700 hover:bg-muted/50"
                  )}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" strokeWidth={1.5} />
                  {stats.urgentCount} ABNORMAL
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleNeedsReviewFilter}
                className={cn(
                  "h-8 font-mono text-[11px] font-bold uppercase tracking-wider rounded-sm",
                  statusFilters.includes(ClassificationStatus.NeedsReview)
                    ? "border-foreground bg-background text-foreground hover:bg-muted/50"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Eye className="h-3 w-3 mr-1" strokeWidth={1.5} />
                {stats.pendingReview} Review
              </Button>
            </div>

            <div className="hidden md:block h-6 w-px bg-border" />

            {/* Status filter (DB enum: classification_status_type) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs w-[160px] justify-between">
                  {statusFilters.length === 0
                    ? "All Statuses"
                    : statusFilters.length === 1
                    ? CLASSIFICATION_STATUS_LABELS[statusFilters[0]]
                    : `${statusFilters.length} selected`}
                  <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-2">
                <div className="space-y-1">
                  {(Object.entries(CLASSIFICATION_STATUS_LABELS) as [ClassificationStatus, string][]).map(
                    ([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={statusFilters.includes(value)}
                          onCheckedChange={() => toggleStatusFilter(value)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Stage filter (DB enum: classification_stage) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs w-[140px] justify-between">
                  {stageFilters.length === 0
                    ? "All Stages"
                    : stageFilters.length === 1
                    ? STAGE_LABELS[stageFilters[0]]
                    : `${stageFilters.length} selected`}
                  <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[180px] p-2">
                <div className="space-y-1">
                  {(Object.entries(STAGE_LABELS) as [ClassificationStage, string][]).map(
                    ([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={stageFilters.includes(value)}
                          onCheckedChange={() => toggleStageFilter(value)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>

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
                <SelectItem value="all">All Categories</SelectItem>
                {docTypes.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {dt}
                  </SelectItem>
                ))}
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
              {applyHistoryFilters(sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled)).length}{" "}
              result
              {applyHistoryFilters(sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled)).length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <InboxDataTable
              columns={columns}
              data={applyHistoryFilters(sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled)).slice(
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
            {applyHistoryFilters(sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled)).slice(
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
            totalItems={applyHistoryFilters(sortedFaxes.filter(f => f.classificationStage === ClassificationStage.AutoFiled)).length}
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
                <SelectItem value="all">All Categories</SelectItem>
                {docTypes.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {dt}
                  </SelectItem>
                ))}
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
              {filteredManuallySorted.length} result
              {filteredManuallySorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <InboxDataTable
              columns={columns}
              data={filteredManuallySorted.slice(
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
            {filteredManuallySorted.slice(
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
            totalItems={filteredManuallySorted.length}
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
