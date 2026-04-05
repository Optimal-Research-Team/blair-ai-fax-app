"use client";

import { Fax } from "@/types";
import { Inbox, Clock, Zap, AlertTriangle, Eye } from "lucide-react";

interface InboxStatsProps {
  faxes: Fax[];
}

export function InboxStats({ faxes }: InboxStatsProps) {
  const total = faxes.length;
  const pendingReview = faxes.filter((f) => f.status === "pending-review").length;
  const inProgress = faxes.filter((f) => f.status === "in-progress").length;
  const autoFiled = faxes.filter((f) => f.status === "auto-filed").length;
  const urgentCount = faxes.filter(
    (f) => f.priority === "abnormal" && f.status !== "completed" && f.status !== "auto-filed"
  ).length;

  const stats = [
    { label: "Total", value: total, icon: Inbox, color: "text-foreground" },
    { label: "Pending", value: pendingReview, icon: Eye, color: "text-blue-600" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-purple-600" },
    { label: "Auto-Filed", value: autoFiled, icon: Zap, color: "text-emerald-600" },
  ];

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className={`h-4 w-4 ${stat.color}`} />
          <span className="text-sm text-muted-foreground">{stat.label}:</span>
          <span className="text-sm font-semibold">{stat.value}</span>
        </div>
      ))}
      {urgentCount > 0 && (
        <div className="flex items-center gap-1.5 bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-semibold animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          {urgentCount} Urgent
        </div>
      )}
    </div>
  );
}
