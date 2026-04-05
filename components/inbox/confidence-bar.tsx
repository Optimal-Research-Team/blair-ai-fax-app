"use client";

import { cn } from "@/lib/utils";
import { getConfidenceColor } from "@/lib/constants";

interface ConfidenceBarProps {
  confidence: number;
  label?: string;
  showPercentage?: boolean;
}

export function ConfidenceBar({
  confidence,
  label,
  showPercentage = true,
}: ConfidenceBarProps) {

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="h-1.5 flex-1 bg-muted overflow-hidden min-w-[40px]">
          <div
            className={cn("h-full transition-all", getConfidenceColor(confidence))}
            style={{ width: `${confidence}%` }}
          />
        </div>
        {showPercentage && (
          <span className="font-mono text-[11px] font-medium text-muted-foreground tabular-nums w-[38px] text-right">
            {confidence.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
