"use client";

import { useState, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { simulatedReferralsAtom } from "@/atoms/simulation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Phone,
  ArrowRight,
} from "lucide-react";
import { SearchBar } from "@/components/shared/search-bar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Referral } from "@/types/referral";
import { CommunicationStatus } from "@/types";

// Group referrals by clinic
interface ClinicGroup {
  clinicName: string;
  clinicCity: string;
  physicians: string[];
  referrals: Referral[];
  awaitingCount: number;
  totalCommsCount: number;
  clinicPhone?: string;
}

// Get the clinic name for a referral
function getClinicInfo(referral: Referral): { clinicName: string; clinicCity: string; clinicPhone?: string } {
  if (referral.clinicName) {
    return { clinicName: referral.clinicName, clinicCity: referral.clinicCity || "" };
  }
  return { clinicName: "Unknown Clinic", clinicCity: "" };
}

// Count communications by status
function countByStatus(referral: Referral, status: CommunicationStatus): number {
  return referral.communications.filter(c => c.status === status).length;
}

// Get the oldest awaiting communication age in days
function getOldestAwaitingDays(referral: Referral): number | null {
  const awaitingComms = referral.communications.filter(c => c.status === "awaiting");
  if (awaitingComms.length === 0) return null;

  const oldest = awaitingComms.reduce((min, c) => {
    const date = new Date(c.sentAt || c.createdAt);
    return date < min ? date : min;
  }, new Date());

  const days = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
  return days;
}

// Get last message preview
function getLastMessagePreview(referral: Referral): string {
  if (referral.communications.length === 0) return "";

  const sorted = [...referral.communications].sort((a, b) =>
    new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime()
  );

  const last = sorted[0];
  if (last.missingItems && last.missingItems.length > 0) {
    return `Requesting: ${last.missingItems.join(", ")}`;
  }
  return last.subject || "";
}

type FilterType = "all" | "awaiting" | "sent-today";

// Check if referral matches search query
function matchesSearch(referral: Referral, query: string): boolean {
  if (!query.trim()) return true;

  const searchLower = query.toLowerCase().trim();

  // Search across multiple fields
  const searchableFields = [
    referral.patientName,
    referral.referringPhysicianName,
    referral.clinicName,
    referral.clinicCity,
    referral.referringPhysicianFax,
    referral.referringPhysicianPhone,
    referral.referringPhysicianEmail,
  ].filter(Boolean);

  return searchableFields.some(field =>
    field?.toLowerCase().includes(searchLower)
  );
}

export default function ReferralCommunicationsPage() {
  const allReferrals = useAtomValue(simulatedReferralsAtom);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClinics, setExpandedClinics] = useState<Set<string> | null>(null);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);

  const openReferral = useCallback((id: string) => {
    setSelectedReferralId(id);
  }, []);

  // Group referrals by clinic
  const clinicGroups = useMemo(() => {
    const groups = new Map<string, ClinicGroup>();

    allReferrals.forEach(referral => {
      // Apply search filter
      if (!matchesSearch(referral, searchQuery)) return;

      const { clinicName, clinicCity, clinicPhone } = getClinicInfo(referral);
      const key = clinicName;

      if (!groups.has(key)) {
        groups.set(key, {
          clinicName,
          clinicCity,
          physicians: [],
          referrals: [],
          awaitingCount: 0,
          totalCommsCount: 0,
          clinicPhone,
        });
      }

      const group = groups.get(key)!;

      // Add physician if not already present
      if (!group.physicians.includes(referral.referringPhysicianName)) {
        group.physicians.push(referral.referringPhysicianName);
      }

      // Check if this referral should be included based on filter
      const awaitingCount = countByStatus(referral, "awaiting");
      const hasAwaiting = awaitingCount > 0;

      // Filter logic
      if (filter === "awaiting" && !hasAwaiting) return;

      group.referrals.push(referral);
      group.awaitingCount += awaitingCount;
      group.totalCommsCount += referral.communications.length;
    });

    // Sort by awaiting count (most urgent first)
    return Array.from(groups.values())
      .filter(g => g.referrals.length > 0)
      .sort((a, b) => b.awaitingCount - a.awaitingCount);
  }, [allReferrals, filter, searchQuery]);

  // Auto-expand clinics with awaiting items on first load only
  if (expandedClinics === null && clinicGroups.length > 0) {
    const toExpand = new Set<string>();
    clinicGroups.forEach(group => {
      if (group.awaitingCount > 0) {
        toExpand.add(group.clinicName);
      }
    });
    setExpandedClinics(toExpand);
  }

  const expanded = expandedClinics ?? new Set<string>();

  const toggleClinic = (clinicName: string) => {
    setExpandedClinics(prev => {
      const next = new Set(prev ?? []);
      if (next.has(clinicName)) {
        next.delete(clinicName);
      } else {
        next.add(clinicName);
      }
      return next;
    });
  };

  const totalAwaiting = clinicGroups.reduce((acc, g) => acc + g.awaitingCount, 0);

  return (
    <div className="space-y-2">
      <PageHeader
        title="Referral Communications"
        description="Track outbound communications grouped by referring clinic"
        action={
          <div className="flex items-center gap-3">
            {totalAwaiting > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold">{totalAwaiting} awaiting response</span>
              </div>
            )}
          </div>
        }
      />

      {/* Search and filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search physician, clinic, fax, phone..."
          aria-label="Search referral communications"
        />

        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="awaiting">Awaiting Response</SelectItem>
            <SelectItem value="all">All Communications</SelectItem>
            <SelectItem value="sent-today">Sent Today</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {clinicGroups.length} clinic{clinicGroups.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Clinic groups */}
      <div className="space-y-2">
        {clinicGroups.length === 0 ? (
          <div className="border rounded-sm py-8 text-center text-muted-foreground">
            {searchQuery ? (
              <>
                <Phone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No results for &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Phone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No communications {filter === "awaiting" ? "awaiting response" : "yet"}</p>
                <p className="text-xs">Communications will appear as referrals are processed</p>
              </>
            )}
          </div>
        ) : (
          clinicGroups.map((group) => (
            <Collapsible
              key={group.clinicName}
              open={expanded.has(group.clinicName)}
              onOpenChange={() => toggleClinic(group.clinicName)}
            >
              <div className="border rounded-sm overflow-hidden">
                {/* Clinic header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{group.clinicName}</span>
                          {group.awaitingCount > 0 && (
                            <span className="font-mono text-[10px] text-amber-700 font-bold tabular-nums">
                              {group.awaitingCount} awaiting
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{group.clinicCity}</span>
                          <span>·</span>
                          <span>{group.physicians.join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {group.awaitingCount > 0 && group.clinicPhone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info(`Calling ${group.clinicName}...`);
                            }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call Clinic
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {group.referrals.length} referral{group.referrals.length !== 1 ? "s" : ""}
                        </span>
                        {expanded.has(group.clinicName) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Referrals within clinic */}
                <CollapsibleContent>
                  <div className="border-t border-border divide-y divide-border">
                    {group.referrals.map((referral) => (
                      <ReferralCommRow key={referral.id} referral={referral} onOpen={openReferral} />
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </div>

      <FaxViewerDialog
        faxId={null}
        referralId={selectedReferralId}
        open={selectedReferralId !== null}
        onOpenChange={(open) => { if (!open) setSelectedReferralId(null); }}
      />
    </div>
  );
}

// Individual referral row within a clinic - simplified, click to open popup
function ReferralCommRow({ referral, onOpen }: { referral: Referral; onOpen: (id: string) => void }) {
  const awaitingCount = countByStatus(referral, "awaiting");
  const hasAwaiting = awaitingCount > 0;
  const oldestDays = getOldestAwaitingDays(referral);
  const preview = getLastMessagePreview(referral);

  return (
    <button
      onClick={() => onOpen(referral.id)}
      className="w-full text-left flex items-center justify-between pl-6 pr-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {referral.patientName}
            </span>
          </div>
          {preview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Waiting duration badge */}
        {hasAwaiting && oldestDays !== null && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 bg-background",
              oldestDays >= 3 ? "text-red-700 border-red-600" :
              oldestDays >= 1 ? "text-amber-700 border-amber-600" :
              "text-muted-foreground border-border"
            )}
          >
            <Clock className="h-3 w-3 mr-0.5" />
            {oldestDays === 0 ? "Today" : `${oldestDays}d`}
          </Badge>
        )}

        {/* Arrow indicator */}
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
