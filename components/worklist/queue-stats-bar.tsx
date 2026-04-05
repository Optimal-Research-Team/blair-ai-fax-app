"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Fax } from "@/types";
import {
  ListTodo,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { STAT_CARD_COLORS } from "@/lib/constants";

interface QueueStatsBarProps {
  faxes: Fax[];
}

export function QueueStatsBar({ faxes }: QueueStatsBarProps) {
  const actionable = faxes.filter(
    (f) =>
      f.status === "pending-review" ||
      f.status === "in-progress"
  );

  const urgentCount = actionable.filter(
    (f) => f.priority === "abnormal"
  ).length;

  const now = new Date();
  const breachedCount = actionable.filter(
    (f) => new Date(f.slaDeadline) <= now
  ).length;

  const avgWait =
    actionable.length > 0
      ? Math.round(
          actionable.reduce(
            (sum, f) => sum + differenceInMinutes(now, new Date(f.receivedAt)),
            0
          ) / actionable.length
        )
      : 0;

  const completedToday = faxes.filter((f) => {
    if (!f.completedAt) return false;
    const completed = new Date(f.completedAt);
    return (
      completed.toDateString() === now.toDateString()
    );
  }).length;

  const stats = [
    {
      label: "Queue Depth",
      value: actionable.length,
      icon: ListTodo,
      color: STAT_CARD_COLORS.sky.iconColor,
      bgColor: STAT_CARD_COLORS.sky.bg,
    },
    {
      label: "Abnormal",
      value: urgentCount,
      icon: AlertTriangle,
      color: urgentCount > 0 ? STAT_CARD_COLORS.red.iconColor : STAT_CARD_COLORS.neutral.iconColor,
      bgColor: urgentCount > 0 ? STAT_CARD_COLORS.red.bg : STAT_CARD_COLORS.neutral.bg,
    },
    {
      label: "SLA Breached",
      value: breachedCount,
      icon: Clock,
      color: breachedCount > 0 ? STAT_CARD_COLORS.red.iconColor : STAT_CARD_COLORS.emerald.iconColor,
      bgColor: breachedCount > 0 ? STAT_CARD_COLORS.red.bg : STAT_CARD_COLORS.emerald.bg,
    },
    {
      label: "Avg Wait",
      value: `${avgWait}m`,
      icon: Clock,
      color: STAT_CARD_COLORS.amber.iconColor,
      bgColor: STAT_CARD_COLORS.amber.bg,
    },
    {
      label: "Processed Today",
      value: completedToday,
      icon: Zap,
      color: STAT_CARD_COLORS.emerald.iconColor,
      bgColor: STAT_CARD_COLORS.emerald.bg,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border border-gray-200">
          <CardContent className="p-3 flex items-center gap-3">
            <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.5} />
            <div>
              <p className="font-mono text-lg font-bold leading-none tabular-nums">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
