"use client";

import { TriageTimelineEvent } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, Zap, ClipboardCheck, Mail, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const EVENT_STYLES: Record<TriageTimelineEvent["type"], { icon: React.ElementType; color: string; bg: string }> = {
  received: { icon: Inbox, color: "text-sky-600", bg: "bg-sky-100" },
  classified: { icon: Zap, color: "text-violet-600", bg: "bg-violet-100" },
  triage_started: { icon: ClipboardCheck, color: "text-indigo-600", bg: "bg-indigo-100" },
  info_requested: { icon: Mail, color: "text-amber-600", bg: "bg-amber-100" },
  info_received: { icon: FileText, color: "text-emerald-600", bg: "bg-emerald-100" },
  approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

interface MRITimelineProps {
  events: TriageTimelineEvent[];
}

export function MRITimeline({ events }: MRITimelineProps) {
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[12px] font-medium text-foreground">No timeline events yet</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Events will appear here as the referral progresses.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60" />

        <div className="space-y-0">
          {sorted.map((event, idx) => {
            const style = EVENT_STYLES[event.type];
            const Icon = style.icon;
            const isLast = idx === sorted.length - 1;

            return (
              <div key={event.id} className={cn("relative flex gap-3 pb-5", isLast && "pb-0")}>
                {/* Icon */}
                <div className={cn("relative z-10 h-[30px] w-[30px] rounded-full flex items-center justify-center shrink-0", style.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", style.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/70">{format(new Date(event.timestamp), "MMM d, h:mm a")}</span>
                    {event.actorName && (
                      <span className="text-[10px] text-muted-foreground/70">· {event.actorName}</span>
                    )}
                    {event.actor === "ai" && !event.actorName && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-200/80 rounded px-1 py-px">
                        <Zap className="h-2 w-2" />AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
