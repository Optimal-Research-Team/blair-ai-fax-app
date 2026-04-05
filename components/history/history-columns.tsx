"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Fax } from "@/types";
import { PatientMatchBadge } from "@/components/inbox/patient-match-badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockStaff } from "@/data/mock-staff";

function getSortedByLabel(sortedBy?: string): { label: string; isAuto: boolean } {
  if (!sortedBy) return { label: "AUTO", isAuto: true };
  const user = mockStaff.find((u) => u.id === sortedBy);
  return { label: user?.name.split(" ")[0] ?? sortedBy, isAuto: false };
}

export const historyColumns: ColumnDef<Fax>[] = [
  {
    accessorKey: "completedAt",
    header: "Sorted",
    cell: ({ row }) => (
      <div className="font-mono text-[11px] tabular-nums whitespace-nowrap">
        <RelativeTime
          date={row.original.completedAt!}
          className="text-foreground"
        />
      </div>
    ),
    size: 145,
  },
  {
    accessorKey: "documentCategory",
    header: "Category",
    cell: ({ row }) => {
      return (
        <div className="text-xs min-w-0">
          <span className="font-medium truncate block">
            {row.original.documentCategory}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 160,
  },
  {
    accessorKey: "senderName",
    header: "From",
    cell: ({ row }) => (
      <div className="text-xs">
        <span className="font-medium text-foreground truncate block max-w-[160px]">
          {row.original.senderName}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {row.original.senderFaxNumber.replace(
            /(\d{3})(\d{3})(\d{4})/,
            "($1) $2-$3"
          )}
        </span>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "patientName",
    header: "Patient",
    cell: ({ row }) => (
      <PatientMatchBadge
        status={row.original.patientMatchStatus}
        patientName={row.original.patientName}
        isManual={row.original.manuallyEditedFields?.includes("patient_id")}
      />
    ),
    size: 150,
  },
  {
    id: "sortedBy",
    header: "Sorted By",
    cell: ({ row }) => {
      const { label, isAuto } = getSortedByLabel(row.original.sortedBy);
      return isAuto ? (
        <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          <Zap className="h-3 w-3" />
          Auto
        </span>
      ) : (
        <span className="text-xs text-foreground">{label}</span>
      );
    },
    size: 100,
  },
  {
    id: "forwardedTo",
    header: "Sent To",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.forwardedTo ?? "—"}
      </span>
    ),
    size: 120,
  },
  {
    id: "actions",
    header: "",
    cell: () => (
      <span className="text-xs text-muted-foreground group-hover:text-foreground flex items-center gap-0.5">
        View <ChevronRight className="h-3 w-3" />
      </span>
    ),
    size: 60,
  },
];
