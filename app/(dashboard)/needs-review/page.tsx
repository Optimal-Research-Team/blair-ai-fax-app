"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { UnclassifiedCard } from "@/components/worklist/unclassified-card";
import { ReferralCard } from "@/components/worklist/referral-card";
import { Button } from "@/components/ui/button";
import { WorklistView } from "@/types/worklist";
import { useAtomValue } from "jotai";
import { allWorklistItemsAtom, computeQueueStats } from "@/atoms/worklist";
import { useLocks } from "@/atoms/lock";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  FileText,
  Clock,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function WorklistPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading worklist...</div>}>
      <WorklistPageContent />
    </Suspense>
  );
}

function WorklistPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") as WorklistView | null;
  const [activeView, setActiveView] = useState<WorklistView>(viewParam || "all");
  const [priorityFilter, setPriorityFilter] = useState<"abnormal" | "all">("all");

  const { getLockedByUser } = useLocks();
  const worklistItems = useAtomValue(allWorklistItemsAtom);
  const queueStats = useMemo(() => computeQueueStats(worklistItems), [worklistItems]);

  // Sync view with URL query parameter
  useEffect(() => {
    if (viewParam && ["all", "unclassified", "referral", "junk", "filing-error"].includes(viewParam)) {
      setActiveView(viewParam);
    } else if (!viewParam) {
      setActiveView("all");
    }
  }, [viewParam]);

  const counts = useMemo(() => ({
    all: worklistItems.length,
    unclassified: worklistItems.filter((i) => i.category === "unclassified").length,
    referral: worklistItems.filter((i) => i.category === "referral").length,
    junk: worklistItems.filter((i) => i.category === "junk").length,
    "filing-error": worklistItems.filter((i) => i.category === "filing-error").length,
  }), [worklistItems]);

  const urgentCount = useMemo(() =>
    worklistItems.filter((i) => i.priority === "abnormal").length,
  [worklistItems]);

  const filteredItems = useMemo(() => {
    let items = [...worklistItems];
    if (activeView !== "all") {
      items = items.filter((i) => i.category === activeView);
    }
    if (priorityFilter !== "all") {
      items = items.filter((i) => i.priority === priorityFilter);
    }
    // Sort: urgent first, then by priority score desc
    items.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return b.priorityScore - a.priorityScore;
    });
    return items;
  }, [worklistItems, activeView, priorityFilter]);

  const [selectedFaxId, setSelectedFaxId] = useState<string | null>(null);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleOpen = useCallback((id: string) => {
    const item = worklistItems.find((i) => i.id === id || i.faxId === id || i.referralId === id);
    if (item?.category === "referral" && item.referralId) {
      // Always open referral viewer for referral-categorized items
      setSelectedReferralId(item.referralId);
      setSelectedFaxId(item.faxId); // Pass faxId for synthetic referral construction
      return;
    }
    setSelectedFaxId(item?.faxId ?? id);
  }, [worklistItems]);

  const handleViewChange = (view: WorklistView) => {
    setActiveView(view);
    setPriorityFilter("all");
    if (view === "all") {
      router.push("/needs-review", { scroll: false });
    } else {
      router.push(`/needs-review?view=${view}`, { scroll: false });
    }
  };

  const toggleUrgentFilter = () => {
    setPriorityFilter(priorityFilter === "abnormal" ? "all" : "abnormal");
  };

  return (
    <div className="space-y-2">
      <PageHeader
        title="Needs Review"
        description="Follow-up actions on reviewed faxes"
      />

      {/* Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Category filter buttons */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-sm p-1">
          <Button
            variant={activeView === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange("all")}
            className="h-7 text-xs px-3"
          >
            All
            <span className="ml-1.5 text-muted-foreground">{counts.all}</span>
          </Button>
          <Button
            variant={activeView === "unclassified" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange("unclassified")}
            className="h-7 text-xs px-3"
          >
            <FileQuestion className="h-3 w-3 mr-1" />
            Unclassified
            <span className="ml-1.5 text-muted-foreground">{counts.unclassified}</span>
          </Button>
          <Button
            variant={activeView === "referral" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange("referral")}
            className="h-7 text-xs px-3"
          >
            <FileText className="h-3 w-3 mr-1" />
            Referrals
            <span className="ml-1.5 text-muted-foreground">{counts.referral}</span>
          </Button>
          <Button
            variant={activeView === "junk" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange("junk")}
            className="h-7 text-xs px-3"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Junk
            <span className="ml-1.5 text-muted-foreground">{counts.junk}</span>
          </Button>
          <Button
            variant={activeView === "filing-error" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewChange("filing-error")}
            className="h-7 text-xs px-3"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Filing Errors
            <span className="ml-1.5 text-muted-foreground">{counts["filing-error"]}</span>
          </Button>
        </div>

        {/* Priority quick filter */}
        {urgentCount > 0 && (
          <Button
            variant={priorityFilter === "abnormal" ? "default" : "outline"}
            size="sm"
            onClick={toggleUrgentFilter}
            className={cn(
              "h-8 text-xs",
              priorityFilter === "abnormal"
                ? "bg-red-600 hover:bg-red-700"
                : "border-red-200 text-red-700 hover:bg-red-50"
            )}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {urgentCount} Abnormal
          </Button>
        )}

        {/* Avg wait time */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{queueStats.averageWaitMinutes}m avg</span>
        </div>

        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Items list - no Card wrapper, cleaner */}
      <div className="rounded-sm border bg-card">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No items match your filters.</p>
          </div>
        ) : (
          <div className="divide-y">
            {paginatedItems.map((item) => {
              // Check lock status from store
              const lockedUser = getLockedByUser(item.faxId);
              const isLocked = !!lockedUser;

              if (item.category === "unclassified" || item.category === "junk" || item.category === "filing-error") {
                return (
                  <UnclassifiedCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpen}
                    isLocked={isLocked}
                    lockedByName={lockedUser?.isMe ? "You" : isLocked ? "Another user" : undefined}
                  />
                );
              }

              return (
                <ReferralCard
                  key={item.id}
                  item={item}
                  onOpen={handleOpen}
                  isLocked={isLocked}
                  lockedByName={lockedUser?.isMe ? "You" : isLocked ? "Another user" : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      <TablePagination
        totalItems={filteredItems.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

      <FaxViewerDialog
        faxId={selectedFaxId}
        referralId={selectedReferralId}
        open={selectedFaxId !== null || selectedReferralId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFaxId(null);
            setSelectedReferralId(null);
          }
        }}
      />
    </div>
  );
}
