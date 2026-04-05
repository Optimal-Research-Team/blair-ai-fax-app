"use client";

import { Priority } from "@/types";
import { PRIORITY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap",
        "font-mono text-[11px] font-bold uppercase tracking-wider",
        colors.bg,
        colors.text,
        colors.border,
        priority === "normal" && "opacity-70",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", colors.dot)}
        aria-hidden="true"
      />
      {priority}
    </span>
  );
}
