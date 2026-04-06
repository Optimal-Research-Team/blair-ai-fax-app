"use client";

import type { PipelineStatus } from "@/types";
import { PIPELINE_STATUS_COLORS, PIPELINE_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Eye, Ban, ArrowRight } from "lucide-react";

const PIPELINE_STATUS_ICONS: Record<PipelineStatus, React.ElementType> = {
  needs_review: Eye,
  not_mri: Ban,
  routed: ArrowRight,
};

interface PipelineStatusBadgeProps {
  status: PipelineStatus;
}

export function PipelineStatusBadge({ status }: PipelineStatusBadgeProps) {
  const colors = PIPELINE_STATUS_COLORS[status];
  const Icon = PIPELINE_STATUS_ICONS[status];

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
      <Icon className="h-3 w-3 shrink-0" />
      {PIPELINE_STATUS_LABELS[status]}
    </span>
  );
}
