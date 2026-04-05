"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { mockDocumentTypes } from "@/data/mock-document-types";

type TimeUnit = "minutes" | "hours" | "days";

interface SlaValue {
  value: number;
  unit: TimeUnit;
}

interface SlaConfig {
  abnormal: SlaValue;
  normal: SlaValue;
}

function minutesToSlaValue(minutes: number): SlaValue {
  if (minutes < 60) return { value: minutes, unit: "minutes" };
  const hours = minutes / 60;
  if (hours < 24) return { value: hours, unit: "hours" };
  return { value: hours / 24, unit: "days" };
}

function slaValueToMinutes(sla: SlaValue): number {
  switch (sla.unit) {
    case "minutes":
      return sla.value;
    case "hours":
      return sla.value * 60;
    case "days":
      return sla.value * 60 * 24;
  }
}

function formatSlaDisplay(sla: SlaValue): string {
  const suffix = sla.unit === "minutes" ? "m" : sla.unit === "hours" ? "h" : "d";
  return `${sla.value}${suffix}`;
}

export default function SlaPage() {
  const [slaConfigs, setSlaConfigs] = useState<Record<string, SlaConfig>>(() => {
    const initial: Record<string, SlaConfig> = {};
    mockDocumentTypes.forEach((dt) => {
      initial[dt.id] = {
        abnormal: minutesToSlaValue(dt.slaMinutes.abnormal),
        normal: minutesToSlaValue(dt.slaMinutes.normal),
      };
    });
    return initial;
  });

  const updateSla = (
    docId: string,
    type: "abnormal" | "normal",
    field: "value" | "unit",
    newValue: number | TimeUnit
  ) => {
    setSlaConfigs((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [type]: {
          ...prev[docId][type],
          [field]: newValue,
        },
      },
    }));
  };

  return (
    <div className="space-y-2">
      <PageHeader
        title="SLA Rules"
        description="Configure SLA targets per document type and priority level"
      />

      <div className="border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8 px-3">
                Document Type
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8 px-3 text-center">
                Abnormal SLA
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8 px-3 text-center">
                Normal SLA
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockDocumentTypes.map((dt) => {
              const config = slaConfigs[dt.id];
              return (
                <TableRow key={dt.id} className="group">
                  <TableCell className="py-1.5 px-3">
                    <span className="text-xs font-medium">{dt.category}</span>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={config.abnormal.value}
                        onChange={(e) =>
                          updateSla(dt.id, "abnormal", "value", Number(e.target.value) || 1)
                        }
                        className="h-7 w-14 text-xs text-center tabular-nums"
                      />
                      <select
                        value={config.abnormal.unit}
                        onChange={(e) =>
                          updateSla(dt.id, "abnormal", "unit", e.target.value as TimeUnit)
                        }
                        className="h-7 px-2 text-xs border border-input rounded-md bg-background"
                      >
                        <option value="minutes">minutes</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={config.normal.value}
                        onChange={(e) =>
                          updateSla(dt.id, "normal", "value", Number(e.target.value) || 1)
                        }
                        className="h-7 w-14 text-xs text-center tabular-nums"
                      />
                      <select
                        value={config.normal.unit}
                        onChange={(e) =>
                          updateSla(dt.id, "normal", "unit", e.target.value as TimeUnit)
                        }
                        className="h-7 px-2 text-xs border border-input rounded-md bg-background"
                      >
                        <option value="minutes">minutes</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Card className="border">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-xs">SLA Legend</CardTitle>
        </CardHeader>
        <CardContent className="text-[10px] text-muted-foreground space-y-0.5 px-3 pb-2">
          <p>
            <span className="text-red-700 font-medium">Abnormal:</span> Clinically abnormal results requiring
            prompt attention.
          </p>
          <p>
            <span className="text-emerald-700 font-medium">Normal:</span> Standard processing
            timeline. No immediate clinical concern.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
