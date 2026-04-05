"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Referral } from "@/types/referral";
import { cn } from "@/lib/utils";
import { CALLOUT_COLORS, AVAILABILITY_COLORS } from "@/lib/constants";
import { Callout } from "@/components/shared/callout";
import {
  ChevronDown,
  Send,
  User,
  CheckCircle2,
} from "lucide-react";

interface RoutingPanelProps {
  referral: Referral;
  onRoute?: (cardiologistId: string, notes?: string) => void;
  isComplete: boolean;
}

// Mock cardiologists
const CARDIOLOGISTS = [
  { id: "card-1", name: "Dr. Michael Chen", specialty: "Interventional", availability: "Available" },
  { id: "card-2", name: "Dr. Sarah Johnson", specialty: "Electrophysiology", availability: "Available" },
  { id: "card-3", name: "Dr. David Kim", specialty: "Heart Failure", availability: "Busy until 3pm" },
  { id: "card-4", name: "Dr. Lisa Park", specialty: "General Cardiology", availability: "Available" },
  { id: "card-5", name: "Dr. James Wilson", specialty: "Imaging", availability: "On vacation" },
];

export function RoutingPanel({ referral, onRoute, isComplete }: RoutingPanelProps) {
  const [isOpen, setIsOpen] = useState(isComplete);
  const [selectedCardiologist, setSelectedCardiologist] = useState(
    referral.assignedCardiologist || ""
  );
  const [notes, setNotes] = useState("");

  const handleRoute = () => {
    if (selectedCardiologist) {
      onRoute?.(selectedCardiologist, notes);
    }
  };

  // Suggest cardiologist based on reason for referral
  const suggestedCardiologist = referral.reasonForReferral.toLowerCase().includes("arrhythmia") ||
    referral.reasonForReferral.toLowerCase().includes("syncope") ||
    referral.reasonForReferral.toLowerCase().includes("brugada")
      ? CARDIOLOGISTS.find((c) => c.specialty === "Electrophysiology")
      : referral.reasonForReferral.toLowerCase().includes("heart failure")
      ? CARDIOLOGISTS.find((c) => c.specialty === "Heart Failure")
      : referral.reasonForReferral.toLowerCase().includes("cath") ||
        referral.reasonForReferral.toLowerCase().includes("stent")
      ? CARDIOLOGISTS.find((c) => c.specialty === "Interventional")
      : CARDIOLOGISTS.find((c) => c.specialty === "General Cardiology");

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-sm transition-colors">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="font-medium">Routing</span>
            {referral.assignedCardiologist && (
              <Badge className={`${CALLOUT_COLORS.success.bg} ${CALLOUT_COLORS.success.heading} hover:opacity-90`}>
                Assigned
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-3">
        {!isComplete && (
          <Callout
            variant="warning"
            heading="Referral Incomplete"
            body="Complete all required items before routing to a cardiologist."
            className="mb-4"
          />
        )}

        {/* AI Suggestion */}
        {suggestedCardiologist && !referral.assignedCardiologist && (
          <Callout variant="info" icon={<User className="h-4 w-4" />} className="mb-4">
            <p className={`text-xs ${CALLOUT_COLORS.info.icon} mb-2`}>AI Recommendation</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{suggestedCardiologist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {suggestedCardiologist.specialty}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCardiologist(suggestedCardiologist.id)}
              >
                Select
              </Button>
            </div>
          </Callout>
        )}

        {/* Cardiologist selection */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Assign to Cardiologist</Label>
            <Select value={selectedCardiologist} onValueChange={setSelectedCardiologist}>
              <SelectTrigger>
                <SelectValue placeholder="Select a cardiologist..." />
              </SelectTrigger>
              <SelectContent>
                {CARDIOLOGISTS.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{doc.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {doc.specialty}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected cardiologist details */}
          {selectedCardiologist && (
            <div className="p-3 bg-muted/50 rounded-sm">
              {(() => {
                const doc = CARDIOLOGISTS.find((c) => c.id === selectedCardiologist);
                if (!doc) return null;
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        doc.availability === "Available"
                          ? AVAILABILITY_COLORS.available
                          : doc.availability.includes("vacation")
                          ? AVAILABILITY_COLORS.unavailable
                          : AVAILABILITY_COLORS.busy
                      )}
                    >
                      {doc.availability}
                    </Badge>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Routing Notes (optional)
            </Label>
            <Textarea
              placeholder="Add any notes for the cardiologist..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Route button */}
          <Button
            className="w-full"
            disabled={!selectedCardiologist || !isComplete}
            onClick={handleRoute}
          >
            {referral.assignedCardiologist ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Update Assignment
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Route to Cardiologist
              </>
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
