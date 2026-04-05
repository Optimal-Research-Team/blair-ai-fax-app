"use client";

import { ClassificationStage } from "@/types";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, Zap, UserCheck } from "lucide-react";

const STAGE_CONFIG: Record<
  ClassificationStage,
  {
    label: string;
    icon: React.ElementType;
    bg: string;
    text: string;
    border: string;
    spin?: boolean;
  }
> = {
  [ClassificationStage.Unfiled]: {
    label: "Unfiled",
    icon: Inbox,
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-300",
  },
  [ClassificationStage.FilingInProgress]: {
    label: "Filing",
    icon: Loader2,
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-300",
    spin: true,
  },
  [ClassificationStage.AutoFiled]: {
    label: "Auto-Filed",
    icon: Zap,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  [ClassificationStage.ManuallyFiled]: {
    label: "Filed",
    icon: UserCheck,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
};

interface StageBadgeProps {
  stage: ClassificationStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap",
        "font-mono text-[10px] font-semibold uppercase tracking-wider",
        config.bg,
        config.text,
        config.border,
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", config.spin && "animate-spin")} />
      {config.label}
    </span>
  );
}
