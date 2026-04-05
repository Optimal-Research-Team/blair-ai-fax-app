"use client";

import { Fax } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/inbox/priority-badge";
import { StatusBadge } from "@/components/inbox/status-badge";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { formatRelativeTime } from "@/lib/format";
import { calculatePriorityScore } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { LOCK_COLORS, CALLOUT_COLORS } from "@/lib/constants";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/atoms/user";
import {
  Lock,
  HandMetal,
  FileText,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import Link from "next/link";

interface WorklistItemCardProps {
  fax: Fax;
  position: number;
  score: number;
  onClaim: (faxId: string) => void;
}

const MATCH_ICON = {
  matched: UserCheck,
  "not-found": UserX,
  "multiple-matches": Users,
  pending: UserX,
};

export function WorklistItemCard({
  fax,
  position,
  score,
  onClaim,
}: WorklistItemCardProps) {
  const authUser = useAtomValue(currentUserAtom);
  const isLockedByMe = fax.lockedBy === authUser?.id;
  const isLockedByOther = fax.lockedBy && !isLockedByMe;
  const MatchIcon = MATCH_ICON[fax.patientMatchStatus];

  return (
    <Card
      className={cn(
        "border transition-all",
        fax.priority === "abnormal" && "border-l-4 border-l-red-400 shadow-sm shadow-red-50",
        isLockedByOther && "opacity-75 bg-muted/30",
        isLockedByMe && "ring-2 ring-primary/50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Position indicator */}
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <span className="text-lg font-bold text-muted-foreground">
              #{position}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {score.toFixed(0)}pts
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Top row: priority + SLA + lock */}
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={fax.priority} />
              <SlaTimerCell
                deadline={fax.slaDeadline}
                receivedAt={fax.receivedAt}
                priority={fax.priority}
              />
              {isLockedByOther && (
                <div className={`flex items-center gap-1.5 ${LOCK_COLORS.other} text-xs ml-auto`}>
                  <Lock className="h-3 w-3" />
                  <span>Locked</span>
                </div>
              )}
              {isLockedByMe && (
                <div className={`flex items-center gap-1.5 ${LOCK_COLORS.self} text-xs ml-auto`}>
                  <Lock className="h-3 w-3" />
                  <span>You</span>
                </div>
              )}
            </div>

            {/* Sender + patient */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{fax.senderName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(fax.receivedAt)} &middot;{" "}
                  {fax.pageCount} {fax.pageCount === 1 ? "page" : "pages"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-right">
                <MatchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{fax.patientName || "Unknown"}</span>
              </div>
            </div>

            {/* Doc type */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                {fax.documentCategory}
              </span>
            </div>

            {/* Description */}
            {fax.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {fax.description}
              </p>
            )}

            {/* Notes/flags */}
            {fax.notes && (
              <div className={`text-xs ${CALLOUT_COLORS.warning.body} ${CALLOUT_COLORS.warning.bg} rounded px-2 py-1`}>
                {fax.notes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-0.5">
            {!isLockedByOther && (
              <>
                <Button size="sm" variant="default" asChild className="h-8">
                  <Link href={`/fax/${fax.id}`}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Open
                  </Link>
                </Button>
                {!fax.lockedBy && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => onClaim(fax.id)}
                  >
                    <HandMetal className="h-3.5 w-3.5 mr-1" />
                    Claim
                  </Button>
                )}
              </>
            )}
            {isLockedByOther && (
              <span className="text-[11px] text-muted-foreground text-center">
                Locked
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
