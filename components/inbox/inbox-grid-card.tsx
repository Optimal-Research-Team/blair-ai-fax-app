"use client";

import { ClassificationStatus, Fax } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { Lock, FileText, User, Zap, AlertTriangle, Eye, CheckCircle2, Clock } from "lucide-react";
import { mockStaff } from "@/data/mock-staff";
import { cn } from "@/lib/utils";
import { useSlaTimer } from "@/hooks/use-sla-timer";

interface InboxGridCardProps {
  fax: Fax;
  onClick?: (fax: Fax) => void;
}

export function InboxGridCard({ fax, onClick }: InboxGridCardProps) {
  const lockedUser = fax.lockedBy
    ? mockStaff.find((s) => s.id === fax.lockedBy)
    : null;
  const isActive = fax.status !== "completed" && fax.status !== "auto-filed";
  const { timeRemaining, status: slaStatus, isBreached } = useSlaTimer(fax.slaDeadline, fax.receivedAt);

  const needsAction = fax.status === "pending-review";
  const isResolved = fax.status === "completed" || fax.status === "auto-filed";

  const isManual = fax.classificationStatus === ClassificationStatus.ManuallyClassified;

  return (
    <button type="button" onClick={() => onClick?.(fax)} className="block group w-full text-left">
      <div
        className={cn(
          "relative rounded-sm border transition-all",
          // Base states
          isResolved && "bg-muted/50 border-border",
          needsAction && "bg-background border-border shadow-sm hover:shadow-md",
          fax.status === "in-progress" && "bg-white border-purple-200 shadow-sm",
          // Priority overrides
          fax.priority === "abnormal" && !isResolved && "bg-red-50 border-red-200 shadow-sm hover:shadow-md",
        )}
      >
        {/* Top accent bar for priority items */}
        {fax.priority !== "normal" && !isResolved && (
          <div className={cn(
            "absolute inset-x-0 top-0 h-0.5 rounded-t-sm",
            "bg-red-500"
          )} />
        )}

        {/* Card content */}
        <div className="px-3 py-2.5">
          {/* Header: Priority/Status indicator + Time */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              {fax.priority === "abnormal" && (
                <span className="inline-flex items-center gap-0.5 text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  Abnormal
                </span>
              )}
              {fax.status === "auto-filed" && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-filed
                </span>
              )}
              {fax.status === "in-progress" && (
                <span className="inline-flex items-center gap-0.5 text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  <Clock className="h-3 w-3" />
                  In Progress
                </span>
              )}
              {fax.lockedBy && (
                <span className="inline-flex items-center gap-0.5 text-amber-700">
                  <Lock className="h-3 w-3" />
                  {lockedUser?.initials}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500">{formatRelativeTime(fax.receivedAt)}</span>
          </div>

          {/* Sender - main content */}
          <p className={cn(
            "text-[13px] font-medium leading-snug truncate",
            isResolved ? "text-gray-600" : "text-gray-900"
          )}>
            {fax.senderName}
          </p>

          {/* Doc type + Patient in single dense row */}
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className="flex items-center gap-1 text-gray-500 min-w-0">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{fax.documentCategory}</span>
              {isManual && (
                <span className="shrink-0 text-[10px] text-muted-foreground">Manual</span>
              )}
            </span>
            {fax.patientName && (
              <>
                <span className="text-gray-300">·</span>
                <span className={cn(
                  "flex items-center gap-1 min-w-0",
                  fax.patientMatchStatus === "matched" ? "text-gray-600" :
                  fax.patientMatchStatus === "not-found" ? "text-red-600" : "text-amber-600"
                )}>
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fax.patientName}</span>
                </span>
              </>
            )}
          </div>

          {/* Footer: Only show for active items - SLA timer */}
          {isActive && (
            <div className={cn(
              "mt-2 pt-2 border-t flex items-center justify-between text-[11px]",
              isBreached ? "border-red-200" : "border-gray-100"
            )}>
              <span className="text-gray-500">
                {fax.status === "pending-review" ? "Needs review" :
                 fax.status === "in-progress" ? "Being processed" : "Requires attention"}
              </span>
              <span className={cn(
                "font-semibold tabular-nums",
                isBreached ? "text-red-600" :
                slaStatus === "red" ? "text-red-600" :
                slaStatus === "yellow" ? "text-amber-600" : "text-emerald-600"
              )}>
                {isBreached ? `${timeRemaining} overdue` : timeRemaining}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
