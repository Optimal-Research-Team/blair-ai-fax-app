"use client";

import { TriageCommunication } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, Mail, Phone, Zap, Clock, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";

const CHANNEL_STYLES = {
  fax: { icon: FileText, bg: "bg-sky-50", border: "border-sky-200/80", text: "text-sky-700", label: "Fax" },
  email: { icon: Mail, bg: "bg-cyan-50", border: "border-cyan-200/80", text: "text-cyan-700", label: "Email" },
  phone: { icon: Phone, bg: "bg-purple-50", border: "border-purple-200/80", text: "text-purple-700", label: "Phone" },
};

const STATUS_STYLES = {
  sent: { icon: CheckCircle2, color: "text-sky-500", label: "Sent" },
  awaiting: { icon: Clock, color: "text-amber-500", label: "Awaiting response" },
  received: { icon: CheckCircle2, color: "text-emerald-500", label: "Response received" },
  failed: { icon: AlertTriangle, color: "text-red-500", label: "Failed" },
};

interface MRICommsThreadProps {
  communications: TriageCommunication[];
  recipientName: string;
  recipientFax?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  onCompose?: () => void;
}

export function MRICommsThread({ communications, recipientName, recipientFax, recipientPhone, recipientEmail, onCompose }: MRICommsThreadProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Recipient header */}
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="text-[13px] font-semibold text-foreground">{recipientName}</div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          {recipientFax && (
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{recipientFax}</span>
          )}
          {recipientPhone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{recipientPhone}</span>
          )}
          {recipientEmail && (
            <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{recipientEmail}</span>
          )}
        </div>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[12px] font-medium text-foreground">No communications yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Use "Request Missing Info" to start a conversation.</p>
          </div>
        ) : (
          communications.map((comm) => {
            const channel = CHANNEL_STYLES[comm.channel];
            const status = STATUS_STYLES[comm.status];
            const ChannelIcon = channel.icon;
            const StatusIcon = status.icon;
            const isOutbound = comm.direction === "outbound";

            return (
              <div key={comm.id} className={cn("max-w-[90%]", isOutbound ? "ml-auto" : "mr-auto")}>
                <div className={cn("rounded-lg border p-3", channel.bg, channel.border)}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon className={cn("h-3.5 w-3.5", channel.text)} />
                      <span className={cn("text-[11px] font-semibold", channel.text)}>{channel.label}</span>
                      {isOutbound ? (
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                      )}
                      {comm.initiator === "ai" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-semibold bg-violet-50 text-violet-700 border border-violet-200/80 rounded">
                          <Zap className="h-2.5 w-2.5" />Auto
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(comm.sentAt), "MMM d, h:mm a")}</span>
                  </div>

                  {/* Subject */}
                  <div className="text-[12px] font-semibold text-foreground mb-1">{comm.subject}</div>

                  {/* Missing items */}
                  {comm.missingItems && comm.missingItems.length > 0 && (
                    <div className="text-[11px] text-foreground/70 mb-1.5">
                      Requesting: {comm.missingItems.join(", ")}
                    </div>
                  )}

                  {/* Body preview */}
                  <div className="text-[11px] text-foreground/60 whitespace-pre-line line-clamp-3">{comm.body.split("\n").slice(0, 3).join("\n")}</div>

                  {/* Status footer */}
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-black/5">
                    <StatusIcon className={cn("h-3 w-3", status.color)} />
                    <span className={cn("text-[10px] font-medium", status.color)}>{status.label}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-border/40 shrink-0">
        <button type="button" onClick={onCompose}
          className="w-full h-8 text-[12px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
          <Mail className="h-3.5 w-3.5" />Send Communication
        </button>
      </div>
    </div>
  );
}
