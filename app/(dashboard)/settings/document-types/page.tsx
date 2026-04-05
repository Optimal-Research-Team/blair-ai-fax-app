"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockDocumentTypes } from "@/data/mock-document-types";
import { cn } from "@/lib/utils";
import { Zap, Eye, AlertTriangle } from "lucide-react";

export default function DocumentTypesPage() {
  const [autoFileEnabled, setAutoFileEnabled] = useState(true);
  const [shadowMode, setShadowMode] = useState(false);
  const [globalThreshold, setGlobalThreshold] = useState(90);

  const autoFileCount = mockDocumentTypes.filter((dt) => dt.autoFileEnabled).length;

  return (
    <div className="space-y-2">
      <PageHeader
        title="Document Categories & Auto-File"
        description="Manage document categories and automatic filing rules"
      />

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
          <p className="text-xs text-muted-foreground">
            AI processes documents but holds all decisions for human review. Ideal for testing and validation.
          </p>
          <div className={cn("text-xs", shadowMode ? "text-amber-700" : "text-muted-foreground")}>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{shadowMode ? "Active — overrides auto-file" : "Inactive — auto-file enabled"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7 px-2">
                Category
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7 px-2 text-center">
                Auto-File
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7 px-2 text-center">
                Threshold
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7 px-2 text-center">
                Abnormal
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7 px-2 text-center">
                Normal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockDocumentTypes.map((dt) => (
              <TableRow key={dt.id}>
                <TableCell className="py-1 px-2">
                  <span className="text-xs font-medium">{dt.category}</span>
                </TableCell>
                <TableCell className="py-1 px-2 text-center">
                  <Switch checked={dt.autoFileEnabled} className="scale-75" />
                </TableCell>
                <TableCell className="py-1 px-2 text-center">
                  <span className="text-xs tabular-nums">{dt.autoFileThreshold}%</span>
                </TableCell>
                <TableCell className="py-1 px-2 text-center">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dt.slaMinutes.abnormal < 120 ? `${dt.slaMinutes.abnormal}m` : `${dt.slaMinutes.abnormal / 60}h`}
                  </span>
                </TableCell>
                <TableCell className="py-1 px-2 text-center">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dt.slaMinutes.normal < 120 ? `${dt.slaMinutes.normal}m` : `${dt.slaMinutes.normal / 60}h`}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {autoFileCount}/{mockDocumentTypes.length} auto-file enabled · Per-type thresholds override global
      </div>
    </div>
  );
}
