import { UnsortedReason } from "@/types";
import { UNSORTED_REASON_LABELS, UNSORTED_REASON_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Zap,
  Users,
  AlertTriangle,
  HelpCircle,
  FileWarning,
  UserPlus,
  Copy,
} from "lucide-react";

const REASON_ICONS: Record<UnsortedReason, React.ElementType> = {
  urgent: Zap,
  "multiple-patients": Users,
  "low-confidence": AlertTriangle,
  "medium-confidence": HelpCircle,
  "incomplete-referral": FileWarning,
  "possible-new-patient": UserPlus,
  duplicate: Copy,
};

interface UnsortedReasonBadgeProps {
  reason: UnsortedReason;
}

export function UnsortedReasonBadge({ reason }: UnsortedReasonBadgeProps) {
  const colors = UNSORTED_REASON_COLORS[reason];
  const label = UNSORTED_REASON_LABELS[reason];
  const Icon = REASON_ICONS[reason];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm border px-1 py-px text-[9px] font-medium leading-tight",
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {label}
    </span>
  );
}
