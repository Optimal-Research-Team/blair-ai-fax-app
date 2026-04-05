"use client";

import { Communication } from "@/types/communication";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  X,
  Bot,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  VoicemailIcon,
  PhoneMissed,
  PhoneOff,
  Calendar,
  User,
  FileText,
} from "lucide-react";

interface AiCallTranscriptPanelProps {
  communication: Communication;
  onClose: () => void;
}

export function AiCallTranscriptPanel({
  communication,
  onClose,
}: AiCallTranscriptPanelProps) {
  const { voiceCallDetails } = communication;

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "voicemail":
        return <VoicemailIcon className="h-4 w-4 text-amber-500" />;
      case "no-answer":
        return <PhoneMissed className="h-4 w-4 text-red-500" />;
      case "busy":
        return <PhoneOff className="h-4 w-4 text-amber-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Phone className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOutcomeLabel = (outcome?: string) => {
    switch (outcome) {
      case "confirmed":
        return "Confirmed";
      case "voicemail":
        return "Left Voicemail";
      case "no-answer":
        return "No Answer";
      case "busy":
        return "Busy";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isScheduled = communication.status === "scheduled";
  const isCompleted = communication.status === "sent" && voiceCallDetails?.transcript;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-purple-50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-sm text-purple-900">
              AI Agent Call {isScheduled ? "(Scheduled)" : isCompleted ? "(Completed)" : ""}
            </h3>
            <p className="text-xs text-purple-700">
              {communication.recipientName}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Call Details */}
      <div className="p-4 border-b bg-muted/30 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {isScheduled ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Calendar className="h-3 w-3 mr-1" />
                Scheduled
              </Badge>
            ) : voiceCallDetails?.outcome ? (
              <Badge
                variant="outline"
                className={cn(
                  voiceCallDetails.outcome === "confirmed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : voiceCallDetails.outcome === "voicemail"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                {getOutcomeIcon(voiceCallDetails.outcome)}
                <span className="ml-1">{getOutcomeLabel(voiceCallDetails.outcome)}</span>
              </Badge>
            ) : (
              <Badge variant="outline">
                <Phone className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>

          {/* Duration */}
          {voiceCallDetails?.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(voiceCallDetails.duration)}</span>
            </div>
          )}
        </div>

        {/* Recipient Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{communication.recipientName}</span>
          </div>
          {communication.recipientPhone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{communication.recipientPhone}</span>
            </div>
          )}
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {isScheduled && communication.scheduledAt ? (
            <span>Scheduled for {format(new Date(communication.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</span>
          ) : communication.sentAt ? (
            <span>Called on {format(new Date(communication.sentAt), "MMM d, yyyy 'at' h:mm a")}</span>
          ) : (
            <span>Created {format(new Date(communication.createdAt), "MMM d, yyyy")}</span>
          )}
        </div>

        {/* Missing Items */}
        {communication.missingItems && communication.missingItems.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Items Requested</p>
            <div className="flex flex-wrap gap-1">
              {communication.missingItems.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 p-4">
        {isScheduled ? (
          /* Scheduled Call - Show Script */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm">AI Agent Script</h4>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-sm">
              <p className="text-sm text-purple-900 whitespace-pre-wrap font-mono leading-relaxed">
                {voiceCallDetails?.callScript || communication.body}
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-sm">
              <Bot className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">This call is scheduled</p>
                <p className="mt-1">
                  The AI agent will automatically make this call at the scheduled time.
                  You'll be notified once the call is complete and a transcript will be available here.
                </p>
              </div>
            </div>
          </div>
        ) : voiceCallDetails?.transcript ? (
          /* Completed Call - Show Transcript */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm">Call Transcript</h4>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm">
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
                {voiceCallDetails.transcript}
              </pre>
            </div>
            {voiceCallDetails.outcome === "confirmed" && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-medium">Call Completed Successfully</p>
                  <p className="mt-1">
                    The AI agent successfully completed this call and the requested information was confirmed.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* In Progress or No Transcript */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm">AI Agent Script</h4>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-sm">
              <p className="text-sm text-purple-900 whitespace-pre-wrap font-mono leading-relaxed">
                {voiceCallDetails?.callScript || communication.body}
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Transcript Not Available</p>
                <p className="mt-1">
                  The call transcript will be available once the AI agent completes this call.
                </p>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
