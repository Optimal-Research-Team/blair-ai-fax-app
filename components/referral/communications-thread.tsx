"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Communication } from "@/types/communication";
import { ReferralDocument } from "@/types/referral";
import { cn } from "@/lib/utils";
import { CHANNEL_COLORS, COMM_STATUS_COLORS, CALLOUT_COLORS, AI_COLORS, LOCK_COLORS } from "@/lib/constants";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Eye,
} from "lucide-react";
import { CommunicationDetailPanel } from "./communication-detail-panel";

interface CommunicationsThreadProps {
  communications: Communication[];
  documents: ReferralDocument[];
  recipientName: string;
  recipientClinic?: string;
  recipientCity?: string;
  recipientPhone?: string;
  recipientFax?: string;
  recipientEmail?: string;
  onViewDocument?: (docId: string) => void;
  onSendFax?: () => void;
  onEmail?: () => void;
}

// Group communications by date
interface DateGroup {
  label: string;
  date: Date;
  items: ThreadItem[];
}

// Unified thread item (can be a communication or a document receipt)
interface ThreadItem {
  id: string;
  type: "outbound" | "inbound" | "system";
  timestamp: Date;
  data: Communication | ReferralDocument;
  isDocument?: boolean;
}

const CHANNEL_CONFIG = {
  fax: { icon: Printer, label: "Fax", bgOut: CHANNEL_COLORS.fax.bg, borderOut: CHANNEL_COLORS.fax.border },
  email: { icon: Mail, label: "Email", bgOut: CHANNEL_COLORS.email.bg, borderOut: CHANNEL_COLORS.email.border },
};

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", icon: Clock, color: COMM_STATUS_COLORS.scheduled },
  sent: { label: "Sent", icon: CheckCircle2, color: COMM_STATUS_COLORS.sent },
  awaiting: { label: "Awaiting", icon: Clock, color: COMM_STATUS_COLORS.awaiting },
  received: { label: "Received", icon: CheckCircle2, color: COMM_STATUS_COLORS.received },
  escalated: { label: "Escalated", icon: AlertTriangle, color: COMM_STATUS_COLORS.escalated },
  failed: { label: "Failed", icon: AlertTriangle, color: COMM_STATUS_COLORS.failed },
  closed: { label: "Closed", icon: CheckCircle2, color: COMM_STATUS_COLORS.closed },
};

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function CommunicationsThread({
  communications,
  documents,
  recipientName,
  recipientClinic,
  recipientCity,
  recipientPhone,
  recipientFax,
  recipientEmail,
  onViewDocument,
  onSendFax,
  onEmail,
}: CommunicationsThreadProps) {
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

  // Build unified timeline
  const dateGroups = useMemo(() => {
    const items: ThreadItem[] = [];

    // Add communications with their original array index for stable sorting
    communications.forEach((comm, index) => {
      // Use sentAt for sent comms, createdAt for scheduled/pending
      const timestamp = new Date(comm.sentAt || comm.createdAt);
      items.push({
        id: comm.id,
        type: comm.status === "received" ? "inbound" : "outbound",
        timestamp,
        data: comm,
        isDocument: false,
        _sortIndex: index, // Track original position for stable sort
      } as ThreadItem & { _sortIndex: number });
    });

    // Add document receipts (responses)
    documents.forEach((doc, index) => {
      if (doc.type === "response" || doc.communicationId) {
        const timestamp = new Date(doc.receivedAt);
        items.push({
          id: doc.id,
          type: "inbound",
          timestamp,
          data: doc,
          isDocument: true,
          _sortIndex: communications.length + index, // Documents come after communications in index
        } as ThreadItem & { _sortIndex: number });
      }
    });

    // Sort by timestamp (oldest first for chronological order - newest at bottom)
    // Use original array index as tiebreaker for items with same timestamp
    items.sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      // If timestamps are equal, maintain original array order
      return ((a as ThreadItem & { _sortIndex: number })._sortIndex || 0) -
             ((b as ThreadItem & { _sortIndex: number })._sortIndex || 0);
    });

    // Group by date
    const groups: DateGroup[] = [];
    let currentGroup: DateGroup | null = null;

    items.forEach((item) => {
      if (!currentGroup || !isSameDay(currentGroup.date, item.timestamp)) {
        currentGroup = {
          label: formatDateLabel(item.timestamp),
          date: item.timestamp,
          items: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    });

    return groups;
  }, [communications, documents]);

  const hasAwaitingItems = communications.some((c) => c.status === "awaiting");

  return (
    <div className="flex flex-col h-full">
      {/* Header with recipient info */}
      <div className="flex-shrink-0 p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{recipientName}</h3>
            {(recipientClinic || recipientCity) && (
              <p className="text-xs text-muted-foreground">
                {recipientClinic}{recipientClinic && recipientCity ? ", " : ""}{recipientCity}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {recipientPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {recipientPhone}
                </span>
              )}
              {recipientFax && (
                <span className="flex items-center gap-1">
                  <Printer className="h-3 w-3" />
                  {recipientFax}
                </span>
              )}
              {recipientEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {recipientEmail}
                </span>
              )}
            </div>
          </div>
          {hasAwaitingItems && (
            <Badge className={`${CALLOUT_COLORS.warning.bg} ${CALLOUT_COLORS.warning.body} ${CALLOUT_COLORS.warning.border} shrink-0`}>
              <Clock className="h-3 w-3 mr-1" />
              Awaiting response
            </Badge>
          )}
        </div>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {dateGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Printer className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No communications yet</p>
            <p className="text-xs mt-1">Send a fax or make a call to start the conversation</p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.label}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Items for this date */}
              <div className="space-y-3">
                {group.items.map((item) => (
                  <ThreadItemCard
                    key={item.id}
                    item={item}
                    onViewDocument={onViewDocument}
                    onViewComm={(comm) => setSelectedComm(comm)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Communication Detail Sheet */}
      <Sheet open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-hidden" showCloseButton={false}>
          <SheetTitle className="sr-only">Communication Details</SheetTitle>
          {selectedComm && (
            <CommunicationDetailPanel
              communication={selectedComm}
              onClose={() => setSelectedComm(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Action bar */}
      <div className="flex-shrink-0 p-3 border-t bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onSendFax}>
            <Printer className="h-4 w-4 mr-1.5" />
            Send Fax
          </Button>
          <Button variant="outline" size="sm" onClick={onEmail}>
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
        </div>
      </div>
    </div>
  );
}

// Individual thread item card
function ThreadItemCard({
  item,
  onViewDocument,
  onViewComm,
}: {
  item: ThreadItem;
  onViewDocument?: (docId: string) => void;
  onViewComm?: (comm: Communication) => void;
}) {
  const isOutbound = item.type === "outbound";

  if (item.isDocument) {
    // Document receipt card
    const doc = item.data as ReferralDocument;
    return (
      <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[85%] rounded-sm border p-3",
            `${CALLOUT_COLORS.success.bg} ${CALLOUT_COLORS.success.border}`
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className={`h-3.5 w-3.5 ${CALLOUT_COLORS.success.icon}`} />
            <span className={`text-xs font-medium ${CALLOUT_COLORS.success.heading}`}>
              Document Received
            </span>
            <span className={`text-xs ${CALLOUT_COLORS.success.icon} ml-auto`}>
              {formatTime(item.timestamp)}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{doc.label}</p>
          <p className={`text-xs ${CALLOUT_COLORS.success.body} mt-0.5`}>
            {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}
          </p>
          {onViewDocument && (
            <Button
              variant="ghost"
              size="sm"
              className={`mt-2 h-7 text-xs ${CALLOUT_COLORS.success.heading} hover:opacity-80 p-0`}
              onClick={() => onViewDocument(doc.id)}
            >
              View Document
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Communication card
  const comm = item.data as Communication;
  const channel = CHANNEL_CONFIG[comm.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.fax;
  const status = STATUS_CONFIG[comm.status];
  const ChannelIcon = channel.icon;
  const StatusIcon = status.icon;
  const isAI = comm.initiator === "ai";
  const isScheduled = comm.status === "scheduled";

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-sm border p-3 cursor-pointer hover:shadow-md transition-shadow",
          isOutbound
            ? cn(channel.bgOut, channel.borderOut)
            : "bg-background border-border"
        )}
        onClick={() => onViewComm?.(comm)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{channel.label}</span>
          </div>
          {isAI && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted/50 text-muted-foreground border-muted-foreground/20">
              Auto
            </Badge>
          )}
          <Badge variant="outline" className="ml-auto text-[10px] h-5 px-1.5 bg-muted text-muted-foreground">
            <Eye className="h-2.5 w-2.5 mr-0.5" />
            View
          </Badge>
        </div>

        {/* AI auto-action callout */}
        {isOutbound && isAI && comm.type === "missing-items" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Badge variant="outline" className="text-[10px] h-5 bg-muted/50 text-muted-foreground border-muted-foreground/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Custom Trigger · Auto Requested
            </Badge>
          </div>
        )}

        {/* Subject */}
        <p className="text-sm font-medium mb-1">{comm.subject}</p>

        {/* Missing items */}
        {comm.missingItems && comm.missingItems.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            Requesting: {comm.missingItems.join(", ")}
          </p>
        )}

        {/* Status and escalation */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
          <div className={cn("flex items-center gap-1 text-xs", status.color)}>
            {isScheduled ? <Calendar className="h-3 w-3" /> : <StatusIcon className="h-3 w-3" />}
            <span>{status.label}</span>
          </div>
          {comm.status === "awaiting" && comm.escalationStrategy !== "none" && (
            <span className="text-[10px] text-muted-foreground">
              Follow-up in {comm.escalationDelayDays}d
            </span>
          )}
          {isScheduled && comm.scheduledAt && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(comm.scheduledAt), "MMM d 'at' h:mm a")}
            </span>
          )}
        </div>

        {/* Linked document indicator */}
        {comm.status === "received" && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${CALLOUT_COLORS.success.icon}`}>
            <FileText className="h-3 w-3" />
            <span>Response received</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
