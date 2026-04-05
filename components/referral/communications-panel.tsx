"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Communication, EscalationStrategy } from "@/types/communication";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  User,
  Plus,
  Printer,
  ArrowUpRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { CommunicationDetailPanel } from "./communication-detail-panel";

interface CommunicationsPanelProps {
  referralId: string;
  communications: Communication[];
  pendingCount: number;
  recipientName: string;
  recipientFax?: string;
  recipientPhone?: string;
  onSendRequest?: (data: {
    channel: "fax" | "voice" | "email";
    items: string[];
    message: string;
    escalationStrategy: EscalationStrategy;
  }) => void;
}

const CHANNEL_ICONS = {
  fax: Printer,
  voice: Phone,
  email: Mail,
};

const STATUS_ICONS = {
  scheduled: Clock,
  sent: Send,
  awaiting: Clock,
  received: CheckCircle2,
  escalated: AlertTriangle,
  failed: AlertTriangle,
  closed: CheckCircle2,
};

export function CommunicationsPanel({
  referralId,
  communications,
  pendingCount,
  recipientName,
  recipientFax,
  recipientPhone,
  onSendRequest,
}: CommunicationsPanelProps) {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<"fax" | "voice" | "email">("fax");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [escalationStrategy, setEscalationStrategy] = useState<EscalationStrategy>("fax-then-voice");
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

  // Sort communications by date (newest first), limit to 3 for summary
  const recentComms = [...communications]
    .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime())
    .slice(0, 3);

  const handleSend = () => {
    onSendRequest?.({
      channel: selectedChannel,
      items: selectedItems,
      message,
      escalationStrategy,
    });
    setShowNewRequest(false);
    setSelectedItems([]);
    setMessage("");
  };

  return (
    <div className="space-y-3">
      {/* Header with count and action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Communications</span>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 h-5 text-[10px]">
              {pendingCount} awaiting
            </Badge>
          )}
        </div>
        <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Missing Items</DialogTitle>
              <DialogDescription>
                Send a request to {recipientName} for missing documents
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Channel selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Send via</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedChannel === "fax" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChannel("fax")}
                    className="justify-start"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Fax
                  </Button>
                  <Button
                    variant={selectedChannel === "voice" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChannel("voice")}
                    className="justify-start"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Voice
                  </Button>
                  <Button
                    variant={selectedChannel === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChannel("email")}
                    className="justify-start"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              {/* Recipient info */}
              <div className="p-3 bg-muted/50 rounded-sm text-sm">
                <p className="font-medium">{recipientName}</p>
                {selectedChannel === "fax" && recipientFax && (
                  <p className="text-muted-foreground">{recipientFax}</p>
                )}
                {selectedChannel === "voice" && recipientPhone && (
                  <p className="text-muted-foreground">{recipientPhone}</p>
                )}
              </div>

              {/* Common missing items */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  What are you requesting?
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {["OHIP Card", "Referral Form", "Cardiac Echo", "ECG", "Stress Test", "Lab Results"].map(
                    (item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedItems.includes(item)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item]);
                            } else {
                              setSelectedItems(selectedItems.filter((i) => i !== item));
                            }
                          }}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Additional Notes (optional)
                </Label>
                <Textarea
                  placeholder="Add any specific instructions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Escalation strategy */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  If no response...
                </Label>
                <RadioGroup
                  value={escalationStrategy}
                  onValueChange={(v) => setEscalationStrategy(v as EscalationStrategy)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="text-sm font-normal">
                      No automatic follow-up
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fax-then-voice" id="fax-then-voice" />
                    <Label htmlFor="fax-then-voice" className="text-sm font-normal">
                      <span className="font-medium text-primary">Fax + Auto-Call (Recommended)</span>
                      <span className="text-muted-foreground ml-1">
                        — Voice call in 2 days if no response
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi-fax" id="multi-fax" />
                    <Label htmlFor="multi-fax" className="text-sm font-normal">
                      Re-send fax in 2 days if no response
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Send button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNewRequest(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={selectedItems.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact communication list */}
      {communications.length > 0 ? (
        <div className="space-y-1">
          {recentComms.map((comm) => {
            const ChannelIcon = CHANNEL_ICONS[comm.channel];
            const StatusIcon = STATUS_ICONS[comm.status];
            const isAI = comm.initiator === "ai";
            const isAwaiting = comm.status === "awaiting";
            const isReceived = comm.status === "received";
            const isScheduled = comm.status === "scheduled";
            const isAiVoiceCall = comm.channel === "voice" && isAI;

            return (
              <div
                key={comm.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md text-sm cursor-pointer hover:bg-muted/50 transition-colors",
                  isAwaiting && "bg-amber-50/50",
                  isScheduled && isAiVoiceCall && "bg-purple-50/50"
                )}
                onClick={() => setSelectedComm(comm)}
              >
                {/* Initiator icon */}
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5",
                  isAiVoiceCall ? "bg-purple-100" : isAI ? "bg-blue-100" : "bg-gray-100"
                )}>
                  {isAiVoiceCall ? (
                    <Bot className="h-3 w-3 text-purple-600" />
                  ) : isAI ? (
                    <Bot className="h-3 w-3 text-blue-600" />
                  ) : (
                    <User className="h-3 w-3 text-gray-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ChannelIcon className={cn(
                      "h-3 w-3 flex-shrink-0",
                      isAiVoiceCall ? "text-purple-600" : "text-muted-foreground"
                    )} />
                    <span className="truncate">
                      {isAiVoiceCall
                        ? `AI Agent Call${isScheduled ? " (Scheduled)" : ""}`
                        : comm.missingItems && comm.missingItems.length > 0
                        ? `Requesting ${comm.missingItems.join(", ")}`
                        : comm.subject}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4 px-1",
                      isAiVoiceCall ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-muted text-muted-foreground"
                    )}>
                      View
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-xs flex items-center gap-0.5",
                      isScheduled && "text-purple-600",
                      isAwaiting && "text-amber-600",
                      isReceived && "text-emerald-600",
                      !isAwaiting && !isReceived && !isScheduled && "text-muted-foreground"
                    )}>
                      {isScheduled ? <Calendar className="h-3 w-3" /> : <StatusIcon className="h-3 w-3" />}
                      {isScheduled ? "Scheduled" : isAwaiting ? "Awaiting" : isReceived ? "Received" : comm.status}
                    </span>
                    {isAwaiting && comm.escalationStrategy !== "none" && (
                      <span className="text-[10px] text-muted-foreground">
                        · Auto-call in {comm.escalationDelayDays}d
                      </span>
                    )}
                    {isAiVoiceCall && comm.missingItems && comm.missingItems.length > 0 && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        · {comm.missingItems.slice(0, 2).join(", ")}
                        {comm.missingItems.length > 2 && `...`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {isScheduled && comm.scheduledAt
                    ? formatRelativeTime(comm.scheduledAt)
                    : formatRelativeTime(comm.sentAt || comm.createdAt)}
                </span>
              </div>
            );
          })}

          {/* Show more link */}
          {communications.length > 3 && (
            <Link
              href={`/referrals/${referralId}?tab=comms`}
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
            >
              View all {communications.length} communications
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No communications yet
        </p>
      )}

      {/* Communication Detail Sheet */}
      <Sheet open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0">
          {selectedComm && (
            <CommunicationDetailPanel
              communication={selectedComm}
              onClose={() => setSelectedComm(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
