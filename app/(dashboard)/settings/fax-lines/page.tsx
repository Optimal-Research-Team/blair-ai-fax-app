"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { mockFaxLines } from "@/data/mock-fax-lines";
import { Phone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FaxLinesPage() {
  const [lineStates, setLineStates] = useState<Record<string, boolean>>(
    Object.fromEntries(mockFaxLines.map((l) => [l.id, l.isActive]))
  );

  const handleToggle = (id: string, enabled: boolean) => {
    setLineStates((prev) => ({ ...prev, [id]: enabled }));
    const line = mockFaxLines.find((l) => l.id === id);
    if (line) {
      toast.success(`${line.name} ${enabled ? "enabled" : "disabled"}`);
    }
  };

  return (
    <div className="space-y-2">
      <PageHeader
        title="Fax Lines"
        description="Manage fax line configurations and routing"
        action={
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => toast.info("Add fax line wizard...")}>
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-px bg-border border border-border">
        {mockFaxLines.map((line) => {
          const isActive = lineStates[line.id];

          return (
            <div
              key={line.id}
              className={cn("bg-background p-3 flex flex-col gap-2", !isActive && "opacity-60")}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Phone className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-muted-foreground")} />
                  <div>
                    <span className="text-sm font-medium">{line.name}</span>
                    <p className="text-xs text-muted-foreground font-mono">{line.number}</p>
                  </div>
                </div>
                <Switch checked={isActive} onCheckedChange={(checked) => handleToggle(line.id, checked)} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{line.assignedDepartment}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium tabular-nums">{line.dailyVolume}/day</span>
              </div>

              <div className="flex items-center justify-between mt-auto">
                {isActive ? (
                  <div className="flex items-center gap-1 text-emerald-600 text-[10px]">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Inactive</span>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2">
                  Configure
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
