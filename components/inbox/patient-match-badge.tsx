"use client";

import { PatientMatchStatus } from "@/types";
import { MATCH_STATUS_LABELS, MATCH_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { UserCheck, UserX, Users, HelpCircle } from "lucide-react";

const MATCH_ICONS: Record<PatientMatchStatus, React.ElementType> = {
  matched: UserCheck,
  "not-found": UserX,
  "multiple-matches": Users,
  pending: HelpCircle,
};

interface PatientMatchBadgeProps {
  status: PatientMatchStatus;
  patientName?: string;
  confidence?: number;
  isManual?: boolean;
}

export function PatientMatchBadge({
  status,
  patientName,
  confidence,
  isManual,
}: PatientMatchBadgeProps) {
  const colors = MATCH_STATUS_COLORS[status];
  const Icon = MATCH_ICONS[status];

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", colors.text)} />
        <span className="text-xs font-medium truncate max-w-[140px]">
          {patientName || MATCH_STATUS_LABELS[status]}
        </span>
      </div>
      {isManual && (
        <span className="text-[10px] text-muted-foreground ml-5">Manually Classified</span>
      )}
    </div>
  );
}
