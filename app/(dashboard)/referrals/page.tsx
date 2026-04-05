"use client";

import { useState, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { simulatedReferralsAtom } from "@/atoms/simulation";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  CircleDot,
  Filter,
  ChevronDown,
} from "lucide-react";
import { SearchBar } from "@/components/shared/search-bar";
import { Referral, ReferralStatus } from "@/types/referral";

const ALL_STATUSES: ReferralStatus[] = [
  "triage",
  "incomplete",
  "pending-review",
  "routed-to-cerebrum",
];

const statusLabels: Record<ReferralStatus, string> = {
  "triage": "Triage",
  "incomplete": "Incomplete",
  "pending-review": "Pending Review",
  "routed-to-cerebrum": "Completed",
};

const statusColors: Record<ReferralStatus, string> = {
  "triage": "bg-muted text-muted-foreground border-border",
  "incomplete": "bg-amber-50 text-amber-700 border-amber-300",
  "pending-review": "bg-blue-50 text-blue-700 border-blue-300",
  "routed-to-cerebrum": "bg-emerald-50 text-emerald-700 border-emerald-300",
};

function matchesSearch(referral: Referral, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return [
    referral.patientName,
    referral.referringPhysicianName,
    referral.clinicName,
    referral.clinicCity,
    referral.reasonForReferral,
    referral.assignedCardiologistName,
    referral.waitListType,
  ].some((field) => field?.toLowerCase().includes(q));
}

export default function AllReferralsPage() {
  const referrals = useAtomValue(simulatedReferralsAtom);
  const [selectedStatuses, setSelectedStatuses] = useState<ReferralStatus[]>(ALL_STATUSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const openReferral = useCallback((id: string) => {
    setSelectedReferralId(id);
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<ReferralStatus, number> = {
      triage: 0,
      incomplete: 0,
      "pending-review": 0,
      "routed-to-cerebrum": 0,
    };
    referrals.forEach((r) => {
      counts[r.status]++;
    });
    return counts;
  }, [referrals]);

  const toggleStatus = useCallback((status: ReferralStatus) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
    setCurrentPage(1);
  }, []);

  const filteredReferrals = useMemo(() => {
    let items = [...referrals];

    // Status filter
    items = items.filter((r) => selectedStatuses.includes(r.status));

    if (searchQuery) {
      items = items.filter((r) => matchesSearch(r, searchQuery));
    }

    // Sort: urgent first, then by received date (newest first)
    items.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
    });

    return items;
  }, [referrals, selectedStatuses, searchQuery]);

  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReferrals.slice(start, start + pageSize);
  }, [filteredReferrals, currentPage, pageSize]);

  return (
    <div className="space-y-2">
      <PageHeader
        title="All Referrals"
        description="Overview of all referrals across all statuses"
      />

      {/* Filters and search bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Status
              {selectedStatuses.length < ALL_STATUSES.length && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {selectedStatuses.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <div className="space-y-1">
              {ALL_STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <span className="flex-1 text-sm">{statusLabels[status]}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {statusCounts[status]}
                  </span>
                </label>
              ))}
            </div>
            <div className="border-t mt-2 pt-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => { setSelectedStatuses(ALL_STATUSES); setCurrentPage(1); }}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => { setSelectedStatuses(["triage"]); setCurrentPage(1); }}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <SearchBar
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
          placeholder="Search patient, physician, clinic..."
          aria-label="Search referrals"
        />

        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {filteredReferrals.length} referral{filteredReferrals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Referral list */}
      <div className="rounded-sm border bg-card">
        {paginatedReferrals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No referrals found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Referrals will appear as faxes are processed"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {paginatedReferrals.map((referral) => (
              referral.status === "routed-to-cerebrum"
                ? <CompletedReferralRow key={referral.id} referral={referral} onOpen={openReferral} />
                : <ReferralRow key={referral.id} referral={referral} onOpen={openReferral} />
            ))}
          </div>
        )}
      </div>

      <TablePagination
        totalItems={filteredReferrals.length}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

      <FaxViewerDialog
        faxId={null}
        referralId={selectedReferralId}
        open={selectedReferralId !== null}
        onOpenChange={(open) => { if (!open) setSelectedReferralId(null); }}
      />
    </div>
  );
}

function ReferralRow({ referral, onOpen }: { referral: Referral; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(referral.id)}
      className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {referral.isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
        ) : (
          <CircleDot className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{referral.patientName}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5", statusColors[referral.status])}
            >
              {statusLabels[referral.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{referral.referringPhysicianName}</span>
            <span>·</span>
            <span>{referral.clinicName}</span>
            {referral.assignedCardiologistName && (
              <>
                <span>·</span>
                <span>Assigned: {referral.assignedCardiologistName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {referral.completenessScore === 100 ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <span className={cn(
              "font-mono text-[11px] tabular-nums",
              referral.completenessScore >= 80 ? "text-amber-600" : "text-red-600"
            )}>
              {referral.completenessScore}%
            </span>
          )}
        </div>

        {referral.pendingCommunicationsCount > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 text-amber-700 border-amber-300">
            <Clock className="h-3 w-3 mr-0.5" />
            {referral.pendingCommunicationsCount}
          </Badge>
        )}

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(referral.receivedDate)}
        </span>

        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

function CompletedReferralRow({ referral, onOpen }: { referral: Referral; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(referral.id)}
      className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{referral.patientName}</span>
            {referral.waitListType && (
              <Badge variant="outline" className="text-[10px] h-5 bg-background">
                {referral.waitListType}
              </Badge>
            )}
            {referral.declineReason && (
              <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-700 border-red-300">
                Declined
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{referral.referringPhysicianName}</span>
            <span>·</span>
            <span>{referral.clinicName}</span>
            {referral.assignedCardiologistName && (
              <>
                <span>·</span>
                <span>{referral.assignedCardiologistName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {referral.appointmentDate && (
          <Badge variant="outline" className="text-[10px] h-5 bg-background">
            <Calendar className="h-3 w-3 mr-0.5" />
            {referral.appointmentDate}
          </Badge>
        )}

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(referral.receivedDate)}
        </span>

        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
