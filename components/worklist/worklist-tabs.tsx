"use client";

import { cn } from "@/lib/utils";
import { WorklistView } from "@/types/worklist";
import { LayoutList, FileQuestion, FileText, Trash2, AlertCircle } from "lucide-react";

interface WorklistTabsProps {
  activeView: WorklistView;
  onViewChange: (view: WorklistView) => void;
  counts: {
    all: number;
    unclassified: number;
    referral: number;
    junk: number;
    "filing-error": number;
  };
}

const tabs: { id: WorklistView; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: LayoutList },
  { id: "unclassified", label: "Unclassified", icon: FileQuestion },
  { id: "referral", label: "Referrals", icon: FileText },
  { id: "junk", label: "Junk", icon: Trash2 },
  { id: "filing-error", label: "Filing Errors", icon: AlertCircle },
];

export function WorklistTabs({ activeView, onViewChange, counts }: WorklistTabsProps) {
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const count = counts[tab.id];
        const isActive = activeView === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            <span
              className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
