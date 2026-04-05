"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WorklistItem } from "@/types/worklist";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { formatRelativeTime } from "@/lib/format";
import {
  FileText,
  Stethoscope,
  ChevronRight,
  Lock,
  MessageSquare,
  AlertTriangle,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralCardProps {
  item: WorklistItem;
  onOpen: (id: string) => void;
  isLocked?: boolean;
  lockedByName?: string;
}

export function ReferralCard({
  item,
  onOpen,
  isLocked,
  lockedByName,
}: ReferralCardProps) {
  const completeness = item.completenessScore ?? 0;

  const hasPendingComms = (item.pendingCommunications ?? 0) > 0;

  const isUrgent = item.priority === "abnormal";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pl-4 pr-4 py-3 transition-colors border-l-4",
        isLocked && "opacity-50",
        isUrgent && "border-l-red-500 bg-red-50/80 hover:bg-red-100/80",
        !isUrgent && "border-l-blue-400 hover:bg-muted/50"
      )}
    >
      {/* Left: Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {isUrgent && (
            <Badge className="bg-red-600 text-white text-[10px] h-5 font-semibold">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Urgent
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-blue-700">
            <Send className="h-3.5 w-3.5" />
            <span className="font-medium">Referral</span>
          </span>
          {hasPendingComms && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5">
              <MessageSquare className="h-3 w-3 mr-0.5" />
              Awaiting
            </Badge>
          )}
          <span className="text-muted-foreground">·</span>
          <SlaTimerCell deadline={item.slaDeadline} receivedAt={item.receivedAt} priority={item.priority} faxStatus={"pending-review"} compact />
        </div>

        <p className={cn(
          "text-sm mb-0.5 line-clamp-1",
          isUrgent ? "font-semibold text-foreground" : "font-medium text-foreground"
        )}>
          {item.patientName}
        </p>
        <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
          {item.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.documentSourceName && (
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              {item.documentSourceName}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {item.pageCount}p
          </span>
          <span>{formatRelativeTime(item.receivedAt)}</span>
        </div>
      </div>

      {/* Right: Completeness + Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Completeness indicator */}
        <div className="w-20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              {completeness}%
            </span>
          </div>
          <Progress value={completeness} className="h-1.5" />
        </div>

        {isLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <Lock className="h-3 w-3" />
            <span>{lockedByName}</span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => onOpen(item.referralId ?? item.faxId)}
            className={cn(
              "h-8",
              isUrgent && "bg-primary hover:bg-primary/90"
            )}
          >
            Review
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
