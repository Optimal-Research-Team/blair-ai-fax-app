"use client";

import { Communication } from "@/types/communication";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CONFIDENCE_THRESHOLD_HIGH, CONFIDENCE_THRESHOLD_MEDIUM } from "@/lib/constants";
import { format } from "date-fns";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Printer,
  Mail,
  Sparkles,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface CommunicationDetailPanelProps {
  communication: Communication;
  onClose: () => void;
}

export function CommunicationDetailPanel({
  communication,
  onClose,
}: CommunicationDetailPanelProps) {
  const isAI = communication.initiator === "ai";
  const isFax = communication.channel === "fax";
  const isScheduled = communication.status === "scheduled";
  const isCompleted = communication.status === "sent" || communication.status === "received";

  const getChannelIcon = () => {
    return isFax ? <Printer className="h-5 w-5" /> : <Mail className="h-5 w-5" />;
  };

  const getChannelColor = () => {
    return isFax ? "text-blue-600 bg-blue-50" : "text-cyan-600 bg-cyan-50";
  };

  const getStatusBadge = () => {
    switch (communication.status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "awaiting":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Response
          </Badge>
        );
      case "received":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Response Received
          </Badge>
        );
      case "escalated":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Escalated
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  // Stable AI confidence scores for missing items (using hash for unknown items)
  const getAiConfidenceForItem = (item: string) => {
    const scores: Record<string, number> = {
      "ECG": 95,
      "Bloodwork (BNP)": 88,
      "Recent Echocardiogram": 92,
      "CT Aorta": 97,
      "Medication List": 85,
      "Clinical History": 90,
      "Patient demographics": 78,
      "Referral Letter": 94,
      "Labs": 86,
      "Echocardiogram": 91,
    };
    if (scores[item]) return scores[item];
    // Stable hash for unknown items
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      hash = ((hash << 5) - hash) + item.charCodeAt(i);
      hash = hash & hash;
    }
    return 75 + Math.abs(hash % 20);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b", getChannelColor())}>
        <div className={cn("p-1.5 rounded", getChannelColor())}>
          {getChannelIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            {isFax ? "Fax" : "Email"}
            {isScheduled && " (Scheduled)"}
          </h3>
          <p className="text-xs opacity-80 truncate">
            {communication.recipientName}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta Info */}
      <div className="p-4 border-b bg-muted/30 space-y-3">
        {/* Status and Initiator */}
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          <Badge variant="outline" className={cn(
            "text-[10px]",
            isAI ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
          )}>
            {isAI ? (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Automated
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Manual
              </>
            )}
          </Badge>
        </div>

        {/* Recipient Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Recipient</p>
            <p className="font-medium">{communication.recipientName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isFax ? "Fax Number" : "Email"}
            </p>
            <p className="font-medium">
              {isFax ? communication.recipientFax : communication.recipientEmail || "N/A"}
            </p>
          </div>
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {isScheduled && communication.scheduledAt ? (
            <span>Scheduled for {format(new Date(communication.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</span>
          ) : communication.sentAt ? (
            <span>Sent on {format(new Date(communication.sentAt), "MMM d, yyyy 'at' h:mm a")}</span>
          ) : (
            <span>Created {format(new Date(communication.createdAt), "MMM d, yyyy")}</span>
          )}
        </div>

      </div>

      {/* Content Area - scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Subject */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
            <p className="text-sm font-medium">{communication.subject}</p>
          </div>

          {/* Requested Items */}
          {communication.missingItems && communication.missingItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Requested Items
              </p>
              <div className="space-y-2">
                {communication.missingItems.map((item, i) => {
                  const confidence = getAiConfidenceForItem(item);
                  return (
                    <div key={i} className="p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item}</span>
                        <span className={cn(
                          "text-xs font-medium",
                          confidence >= CONFIDENCE_THRESHOLD_HIGH ? "text-emerald-600" :
                          confidence >= CONFIDENCE_THRESHOLD_MEDIUM ? "text-blue-600" : "text-amber-600"
                        )}>
                          {confidence}%
                        </span>
                      </div>
                      <Progress
                        value={confidence}
                        className={cn(
                          "h-1.5",
                          confidence >= CONFIDENCE_THRESHOLD_HIGH ? "[&>div]:bg-emerald-500" :
                          confidence >= CONFIDENCE_THRESHOLD_MEDIUM ? "[&>div]:bg-blue-500" : "[&>div]:bg-amber-500"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isFax ? "Fax Content" : "Email Content"}
              </p>
              {isAI && (
                <span className="text-[10px] text-muted-foreground">
                  Auto-generated
                </span>
              )}
            </div>
            <div className={cn(
              "p-4 rounded-sm border",
              isFax ? "bg-blue-50/50 border-blue-200" : "bg-cyan-50/50 border-cyan-200"
            )}>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {communication.body}
              </pre>
            </div>
          </div>

          {/* Escalation Info */}
          {communication.escalationStrategy !== "none" && communication.status === "awaiting" && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Follow-up Scheduled</p>
                <p className="mt-1">
                  If no response received, a follow-up {isFax ? "fax" : "email"} will be sent in {communication.escalationDelayDays} day{communication.escalationDelayDays !== 1 ? "s" : ""}.
                </p>
              </div>
            </div>
          )}

          {/* Response Received Indicator */}
          {communication.status === "received" && communication.responseReceivedAt && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <p className="font-medium">Response Received</p>
                <p className="mt-1">
                  Documents received on {format(new Date(communication.responseReceivedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          )}

          {/* View Original Document (for fax) */}
          {isFax && isCompleted && (
            <Button variant="outline" className="w-full" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Original Fax Document
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
