"use client";

import { FaxStatus } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Zap, Eye, Loader2, CheckCircle2, Sparkles, UserCheck, AlertTriangle } from "lucide-react";

const STATUS_ICONS: Record<FaxStatus, React.ElementType> = {
  classified: Sparkles,
  "manually-classified": UserCheck,
  "auto-filed": Zap,
  "pending-review": Eye,
  "in-progress": Loader2,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

interface StatusBadgeProps {
  status: FaxStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap",
        "font-mono text-[10px] font-semibold uppercase tracking-wider",
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", status === "in-progress" && "animate-spin")} />
      {STATUS_LABELS[status]}
    </span>
  );
}
