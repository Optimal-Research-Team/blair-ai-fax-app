"use client";

import { useSlaTimer } from "@/hooks/use-sla-timer";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import type { FaxStatus } from "@/types/fax";

interface SlaTimerCellProps {
  deadline: string;
  receivedAt: string;
  compact?: boolean;
  priority?: "normal" | "abnormal";
  faxStatus?: FaxStatus;
}

export function SlaTimerCell({ deadline, receivedAt, compact, priority = "normal", faxStatus }: SlaTimerCellProps) {
  const { timeRemaining, status, isBreached } = useSlaTimer(deadline, receivedAt);

  if (faxStatus === "completed" || faxStatus === "auto-filed" || faxStatus === "manually-classified") {
    return null;
  }

  // Color logic based on priority and time remaining
  const getStatusConfig = () => {
    // Breached is always red regardless of priority
    if (isBreached) {
      return {
        icon: AlertTriangle,
        label: "OVERDUE",
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
        animate: "",
      };
    }

    // Urgent items use red palette with escalating intensity
    if (priority === "abnormal") {
      switch (status) {
        case "red":
          return {
            icon: AlertTriangle,
            label: "Critical",
            bg: "bg-red-100",
            text: "text-red-700",
            border: "border-red-300",
            animate: "",
          };
        case "yellow":
          return {
            icon: Zap,
            label: "Urgent",
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
            animate: "",
          };
        case "green":
        default:
          return {
            icon: Zap,
            label: "Urgent",
            bg: "bg-red-50",
            text: "text-red-600",
            border: "border-red-200",
            animate: "",
          };
      }
    }

    // Routine items use green → amber → red escalation
    switch (status) {
      case "red":
        return {
          icon: AlertTriangle,
          label: "Due Soon",
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          animate: "",
        };
      case "yellow":
        return {
          icon: Clock,
          label: "On Track",
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          animate: "",
        };
      case "green":
      default:
        return {
          icon: CheckCircle2,
          label: "On Track",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          animate: "",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap",
        "font-mono text-[11px] font-semibold tabular-nums",
        config.bg,
        config.text,
        config.border,
        config.animate
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {compact ? (
        <span>{timeRemaining}</span>
      ) : (
        <span>
          {isBreached ? timeRemaining : `${timeRemaining} left`}
        </span>
      )}
    </div>
  );
}
