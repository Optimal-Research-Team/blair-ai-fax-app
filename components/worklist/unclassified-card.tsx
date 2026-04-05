"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorklistItem } from "@/types/worklist";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { formatRelativeTime } from "@/lib/format";
import {
  FileQuestion,
  User,
  FileText,
  ChevronRight,
  Lock,
  AlertTriangle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UnclassifiedCardProps {
  item: WorklistItem;
  onOpen: (id: string) => void;
  isLocked?: boolean;
  lockedByName?: string;
}

export function UnclassifiedCard({
  item,
  onOpen,
  isLocked,
  lockedByName,
}: UnclassifiedCardProps) {

  const isUrgent = item.priority === "abnormal";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pl-4 pr-4 py-3 transition-colors border-l-4 cursor-pointer",
        isLocked && "opacity-50 cursor-default",
        isUrgent && "border-l-red-500 bg-red-50/80 hover:bg-red-100/80",
        !isUrgent && item.category === "filing-error" && "border-l-red-400 hover:bg-red-50/50",
        !isUrgent && item.category !== "filing-error" && "border-l-amber-400 hover:bg-muted/50"
      )}
      onClick={() => !isLocked && onOpen(item.faxId)}
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
          {item.category === "filing-error" ? (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-medium">Filing Error</span>
            </span>
          ) : item.category === "junk" ? (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="font-medium">Junk</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-700">
              <FileQuestion className="h-3.5 w-3.5" />
              <span className="font-medium">Unclassified</span>
            </span>
          )}
          <span className="text-muted-foreground">·</span>
          <SlaTimerCell deadline={item.slaDeadline} receivedAt={item.receivedAt} priority={item.priority} compact />
        </div>

        <p className={cn(
          "text-sm mb-1.5 line-clamp-1",
          isUrgent ? "font-medium text-foreground" : "text-foreground"
        )}>
          {item.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.patientName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.patientName}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {item.pageCount}p
          </span>
          <span>{formatRelativeTime(item.receivedAt)}</span>
          {item.suggestedDocCategory && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                AI: {item.suggestedDocCategory}
                <span className="font-medium">
                  {item.suggestedConfidenceScore}%
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {isLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <Lock className="h-3 w-3" />
            <span>{lockedByName}</span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpen(item.faxId); }}
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
