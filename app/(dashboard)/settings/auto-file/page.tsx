"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Zap, Eye, AlertTriangle } from "lucide-react";

export default function AutoFilePage() {
  const [autoFileEnabled, setAutoFileEnabled] = useState(true);
  const [shadowMode, setShadowMode] = useState(false);
  const [globalThreshold, setGlobalThreshold] = useState(90);

  return (
    <div className="space-y-2">
      <PageHeader title="Auto-File Settings" description="Configure automatic filing thresholds and shadow mode" />

      <div className="grid grid-cols-2 gap-px bg-border border border-border">
        <div className={cn("bg-background p-2 flex flex-col gap-2", !autoFileEnabled && "opacity-60")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Auto-File Engine</span>
            </div>
            <Switch checked={autoFileEnabled} onCheckedChange={setAutoFileEnabled} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Threshold</span>
              <span className="text-sm font-bold tabular-nums">{globalThreshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              value={globalThreshold}
              onChange={(e) => setGlobalThreshold(Number(e.target.value))}
              className="w-full h-1 bg-muted appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Aggressive</span>
              <span>Conservative</span>
            </div>
          </div>
        </div>

        <div className={cn("bg-background p-2 flex flex-col gap-2", shadowMode && "bg-amber-50/30")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Shadow Mode</span>
            </div>
            <Switch checked={shadowMode} onCheckedChange={setShadowMode} />
          </div>
          <p className="text-xs text-muted-foreground">AI processes but holds for human review</p>
          {shadowMode && (
            <div className="flex items-center gap-1 text-amber-700 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              <span>Overrides auto-file</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
