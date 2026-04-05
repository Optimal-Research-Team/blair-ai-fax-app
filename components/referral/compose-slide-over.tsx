"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AI_COLORS, CALLOUT_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import {
  Send,
  FileText,
  Mail,
  Clock,
  Sparkles,
} from "lucide-react";
import { CompletenessItem } from "@/types/referral";

interface ComposeSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientClinic?: string;
  recipientFax?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  missingItems: CompletenessItem[];
  preSelectedChannel?: "fax" | "email";
  onSend: (data: ComposeData) => void;
}

export interface ComposeData {
  channel: "fax" | "email";
  selectedItems: string[];
  message: string;
  scheduleFollowUp: boolean;
  followUpDays: number;
  followUpMethod: "fax" | "email";
}

// AI-generated message templates based on missing items
function generateMessage(items: CompletenessItem[], channel: "fax" | "email", recipientName: string): string {
  if (channel === "email") {
    return `Dear ${recipientName},\n\nWe are processing a referral from your office and require the following documentation to proceed:\n\n${items.map(i => `• ${i.label}`).join("\n")}\n\nPlease reply to this email with the requested documents or fax them to our office at your earliest convenience.\n\nThank you for your assistance.\n\nBest regards,\nCardiology Clinic`;
  }

  // Fax (default)
  return `RE: Request for Additional Documentation\n\nDear ${recipientName},\n\nWe have received a referral from your office and require the following documentation to complete our review:\n\n${items.map(i => `• ${i.label}`).join("\n")}\n\nPlease fax the requested documents to our office at your earliest convenience.\n\nThank you for your prompt attention to this matter.\n\nCardiology Clinic`;
}

export function ComposeSlideOver({
  isOpen,
  onClose,
  recipientName,
  recipientClinic,
  recipientFax,
  recipientEmail,
  missingItems,
  preSelectedChannel,
  onSend,
}: ComposeSlideOverProps) {
  // Determine best channel based on available contact info
  const getRecommendedChannel = (): "fax" | "email" => {
    if (recipientFax) return "fax";
    if (recipientEmail) return "email";
    return "fax";
  };

  const [channel, setChannel] = useState<"fax" | "email">(
    preSelectedChannel || getRecommendedChannel()
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    missingItems.map(i => i.id)
  );
  const [message, setMessage] = useState(() =>
    generateMessage(missingItems, preSelectedChannel || getRecommendedChannel(), recipientName)
  );
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDays, setFollowUpDays] = useState(2);
  const [followUpMethod, setFollowUpMethod] = useState<"fax" | "email">("fax");
  const [isSending, setIsSending] = useState(false);

  // Reset state when opened with new data
  useEffect(() => {
    if (isOpen) {
      const recommended = preSelectedChannel || getRecommendedChannel();
      setChannel(recommended);
      setSelectedItemIds(missingItems.map(i => i.id));
      setMessage(generateMessage(missingItems, recommended, recipientName));
    }
  }, [isOpen, missingItems, preSelectedChannel, recipientName]);

  // Update message when channel changes
  const handleChannelChange = (newChannel: "fax" | "email") => {
    setChannel(newChannel);
    const selectedItems = missingItems.filter(i => selectedItemIds.includes(i.id));
    setMessage(generateMessage(selectedItems, newChannel, recipientName));
  };

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newIds = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

      // Regenerate message with new selection
      const selectedItems = missingItems.filter(i => newIds.includes(i.id));
      if (selectedItems.length > 0) {
        setMessage(generateMessage(selectedItems, channel, recipientName));
      }
      return newIds;
    });
  };

  const handleSend = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to request");
      return;
    }

    setIsSending(true);

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));

    onSend({
      channel,
      selectedItems: selectedItemIds,
      message,
      scheduleFollowUp,
      followUpDays,
      followUpMethod,
    });

    const channelLabel = channel === "fax" ? "Fax" : "Email";

    toast.success(
      <div className="space-y-1">
        <div className="font-medium">{channelLabel} sent successfully</div>
        {scheduleFollowUp && (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Follow-up {followUpMethod} scheduled in {followUpDays} day{followUpDays !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    );

    setIsSending(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] sm:max-w-[90vw] p-0 flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 px-6 py-4 border-b bg-muted/30">
          <SheetTitle>Request Missing Items</SheetTitle>
          <SheetDescription>
            {recipientName}{recipientClinic ? ` · ${recipientClinic}` : ""}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Communication Channel</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => handleChannelChange(v as typeof channel)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="channel-fax"
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-sm border-2 cursor-pointer transition-colors",
                  channel === "fax"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground",
                  !recipientFax && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem value="fax" id="channel-fax" className="sr-only" disabled={!recipientFax} />
                <FileText className={cn("h-5 w-5", channel === "fax" ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">Fax</span>
                {recipientFax && (
                  <span className="text-[10px] text-muted-foreground">{recipientFax}</span>
                )}
                {channel === "fax" && getRecommendedChannel() === "fax" && (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Recommended
                  </Badge>
                )}
              </Label>

              <Label
                htmlFor="channel-email"
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-sm border-2 cursor-pointer transition-colors",
                  channel === "email"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground",
                  !recipientEmail && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem value="email" id="channel-email" className="sr-only" disabled={!recipientEmail} />
                <Mail className={cn("h-5 w-5", channel === "email" ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">Email</span>
                {recipientEmail && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{recipientEmail}</span>
                )}
              </Label>
            </RadioGroup>
          </div>

          {/* Items to Request */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Items to Request</Label>
              <span className="text-xs text-muted-foreground">
                {selectedItemIds.length} of {missingItems.length} selected
              </span>
            </div>
            <div className="space-y-2 p-3 bg-muted/30 rounded-sm border">
              {missingItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md transition-colors",
                    selectedItemIds.includes(item.id) ? "bg-background" : "opacity-60"
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <Label
                    htmlFor={item.id}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {item.label}
                  </Label>
                  {item.required && (
                    <Badge variant="outline" className={`text-[10px] h-4 ${CALLOUT_COLORS.error.icon} ${CALLOUT_COLORS.error.border}`}>
                      Required
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Message</Label>
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                AI Generated
              </Badge>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[180px] text-sm font-mono"
              placeholder="Enter message..."
              maxLength={5000}
              aria-label="Message content"
            />
          </div>

          {/* Follow-up Scheduling */}
          <div className={`space-y-4 p-4 ${AI_COLORS.info.bg} border ${AI_COLORS.info.border} rounded-sm`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`h-5 w-5 ${AI_COLORS.info.text} mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schedule-followup" className={`text-sm font-medium ${AI_COLORS.info.heading}`}>
                    Schedule Follow-up
                  </Label>
                  <Switch
                    id="schedule-followup"
                    checked={scheduleFollowUp}
                    onCheckedChange={setScheduleFollowUp}
                  />
                </div>
                <p className={`text-xs ${AI_COLORS.info.body} mt-1`}>
                  Automatically follow up if no response is received
                </p>
              </div>
            </div>

            {scheduleFollowUp && (
              <div className={`grid grid-cols-2 gap-3 pt-2 border-t ${AI_COLORS.info.border}`}>
                <div className="space-y-1.5">
                  <Label className={`text-xs ${AI_COLORS.info.heading}`}>Follow up in</Label>
                  <Select
                    value={followUpDays.toString()}
                    onValueChange={(v) => setFollowUpDays(parseInt(v))}
                  >
                    <SelectTrigger className="h-8 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-xs ${AI_COLORS.info.heading}`}>Follow-up method</Label>
                  <Select
                    value={followUpMethod}
                    onValueChange={(v) => setFollowUpMethod(v as typeof followUpMethod)}
                  >
                    <SelectTrigger className="h-8 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fax">
                        <span className="flex items-center gap-2">
                          <FileText className="h-3 w-3" /> Fax Reminder
                        </span>
                      </SelectItem>
                      <SelectItem value="email">
                        <span className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> Email
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <SheetFooter className="shrink-0 border-t px-6 py-4 bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={isSending || selectedItemIds.length === 0}
                onClick={() => {
                  toast.info("Draft saved");
                  onClose();
                }}
              >
                Save as Draft
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || selectedItemIds.length === 0}
                className="min-w-[120px]"
              >
                {isSending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {channel === "fax" ? "Fax" : "Email"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
