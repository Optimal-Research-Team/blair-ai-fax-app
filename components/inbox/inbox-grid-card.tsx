"use client";

import { Fax } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { FileText, User, Eye, ArrowRight, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STATUS_COLORS } from "@/lib/constants";

interface InboxGridCardProps {
  fax: Fax;
  onClick?: (fax: Fax) => void;
}

export function InboxGridCard({ fax, onClick }: InboxGridCardProps) {
  const colors = PIPELINE_STATUS_COLORS[fax.pipelineStatus];
  const StatusIcon = fax.pipelineStatus === "needs_review" ? Eye
    : fax.pipelineStatus === "routed" ? ArrowRight
    : Ban;
  const statusLabel = fax.pipelineStatus === "needs_review" ? "Needs Review"
    : fax.pipelineStatus === "routed" ? "Routed"
    : "Not MRI";

  return (
    <button type="button" onClick={() => onClick?.(fax)} className="block group w-full text-left">
      <div
        className={cn(
          "relative rounded-sm border transition-all bg-background",
          fax.pipelineStatus === "needs_review" && "border-amber-200 shadow-sm hover:shadow-md",
          fax.pipelineStatus === "routed" && "border-emerald-200 bg-emerald-50/30",
          fax.pipelineStatus === "not_mri" && "bg-muted/50 border-border",
        )}
      >
        <div className="px-3 py-2.5">
          {/* Header: Status + Time */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
              <StatusIcon className="h-3 w-3" />
              {statusLabel}
            </span>
            <span className="text-[11px] text-gray-500">{formatRelativeTime(fax.receivedAt)}</span>
          </div>

          {/* Sender */}
          <p className={cn(
            "text-[13px] font-medium leading-snug truncate",
            fax.pipelineStatus === "not_mri" ? "text-gray-600" : "text-gray-900"
          )}>
            {fax.senderName}
          </p>

          {/* Doc type + Patient */}
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className="flex items-center gap-1 text-gray-500 min-w-0">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{fax.documentCategory === "MRI Requisition" ? "MRI Req" : "Other"}</span>
            </span>
            {fax.patientName && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 text-gray-600 min-w-0">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fax.patientName}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
