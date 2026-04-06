"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Mail, Phone, X, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CHANNELS = [
  { id: "fax" as const, label: "Fax", icon: FileText, color: "border-sky-300 bg-sky-50 text-sky-700" },
  { id: "email" as const, label: "Email", icon: Mail, color: "border-cyan-300 bg-cyan-50 text-cyan-700" },
  { id: "phone" as const, label: "Phone", icon: Phone, color: "border-purple-300 bg-purple-50 text-purple-700" },
];

interface MRIComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientFax?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  patientName: string;
  missingFields: string[];
  onSend: (data: { channel: string; subject: string; body: string; missingItems: string[]; scheduleFollowUp: boolean; followUpDays: number }) => void;
}

function generateTemplate(channel: string, recipientName: string, patientName: string, items: string[]): { subject: string; body: string } {
  const subject = `Request for Missing Information — MRI Requisition`;
  const itemsList = items.map(i => `• ${i}`).join("\n");

  if (channel === "fax") {
    return {
      subject,
      body: `RE: ${patientName}\n\nDear ${recipientName},\n\nWe are processing an MRI requisition for the above patient at KMH Cardiology Centres. To proceed with scheduling, we require the following information:\n\n${itemsList}\n\nPlease fax the completed information to (905) 731-6419 at your earliest convenience.\n\nThank you,\nKMH Cardiology Centres\nMRI Booking Team`,
    };
  }
  if (channel === "email") {
    return {
      subject,
      body: `Dear ${recipientName},\n\nWe are writing regarding an MRI requisition for ${patientName}. To proceed with booking, we require the following:\n\n${itemsList}\n\nPlease reply to this email or fax the information to (905) 731-6419.\n\nBest regards,\nKMH Cardiology Centres\nMRI Booking Team`,
    };
  }
  return {
    subject: `Phone call: ${patientName} MRI requisition`,
    body: `Call ${recipientName} regarding ${patientName}'s MRI requisition.\n\nItems to discuss:\n${itemsList}\n\nRequest they fax missing information to (905) 731-6419.`,
  };
}

export function MRIComposePanel({ isOpen, onClose, recipientName, recipientFax, recipientEmail, recipientPhone, patientName, missingFields, onSend }: MRIComposePanelProps) {
  const [channel, setChannel] = useState<"fax" | "email" | "phone">(recipientFax ? "fax" : recipientEmail ? "email" : "phone");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(missingFields));
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDays, setFollowUpDays] = useState(3);

  const template = generateTemplate(channel, recipientName, patientName, [...selectedItems]);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  const toggleItem = (item: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleChannelChange = (ch: typeof channel) => {
    setChannel(ch);
    const t = generateTemplate(ch, recipientName, patientName, [...selectedItems]);
    setSubject(t.subject);
    setBody(t.body);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold">Request Missing Information</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{recipientName} · Re: {patientName}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Channel selection */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => {
                const isSelected = channel === ch.id;
                const contactInfo = ch.id === "fax" ? recipientFax : ch.id === "email" ? recipientEmail : recipientPhone;
                const isDisabled = !contactInfo;
                return (
                  <button key={ch.id} type="button" disabled={isDisabled}
                    onClick={() => handleChannelChange(ch.id)}
                    className={cn("flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 text-[11px] font-medium transition-all",
                      isSelected ? cn(ch.color, "border-current") : "border-border bg-background hover:bg-muted/50",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}>
                    <ch.icon className="h-4 w-4" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items to request */}
          {missingFields.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Items to Request <span className="text-foreground/50 font-normal">({selectedItems.size} of {missingFields.length})</span>
              </label>
              <div className="space-y-1.5 p-3 bg-muted/30 border rounded-lg">
                {missingFields.map(item => (
                  <label key={item} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <Checkbox checked={selectedItems.has(item)} onCheckedChange={() => toggleItem(item)} className="h-4 w-4" />
                    <span className={cn("text-[12px]", selectedItems.has(item) ? "text-foreground font-medium" : "text-muted-foreground")}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-[12px]" />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-200/80 rounded px-1.5 py-px">
                <Zap className="h-2.5 w-2.5" />AI Generated
              </span>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="text-[12px] font-mono min-h-[180px] leading-relaxed" />
          </div>

          {/* Follow-up scheduling */}
          <div className="p-3 bg-sky-50/80 border border-sky-200/60 rounded-lg space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={scheduleFollowUp} onCheckedChange={(v) => setScheduleFollowUp(!!v)} className="h-4 w-4" />
              <span className="text-[12px] font-medium text-sky-800">Schedule automated follow-up</span>
            </label>
            {scheduleFollowUp && (
              <div className="ml-6.5">
                <Select value={String(followUpDays)} onValueChange={(v) => setFollowUpDays(Number(v))}>
                  <SelectTrigger className="h-8 w-48 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Follow up in 1 day</SelectItem>
                    <SelectItem value="2">Follow up in 2 days</SelectItem>
                    <SelectItem value="3">Follow up in 3 days</SelectItem>
                    <SelectItem value="5">Follow up in 5 days</SelectItem>
                    <SelectItem value="7">Follow up in 1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" className="text-[12px]" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-[12px] min-w-[120px]"
            onClick={() => onSend({ channel, subject, body, missingItems: [...selectedItems], scheduleFollowUp, followUpDays })}>
            <Send className="h-3.5 w-3.5 mr-1.5" />Send {CHANNELS.find(c => c.id === channel)?.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
