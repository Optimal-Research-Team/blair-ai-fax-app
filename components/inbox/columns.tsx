"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Fax } from "@/types";
import { PatientMatchBadge } from "./patient-match-badge";
import { PipelineStatusBadge } from "./pipeline-status-badge";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatPhone } from "@/lib/format";
import { FormattedValue } from "@/components/shared/formatted-value";
import { DOCUMENT_CATEGORY_COLORS } from "@/lib/constants";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 rounded bg-muted-foreground/10 animate-pulse",
        className,
      )}
    />
  );
}

function ProcessingTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-violet-300 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-600">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      {label}
    </span>
  );
}

export const columns: ColumnDef<Fax>[] = [
  {
    accessorKey: "receivedAt",
    header: "Received",
    cell: ({ row }) => (
      <div className="font-mono text-[11px] tabular-nums">
        <span className="text-foreground">{format(new Date(row.original.receivedAt), "MMM d, h:mm a")}</span>
        <span className="text-muted-foreground ml-1 whitespace-nowrap">· {row.original.pageCount}p</span>
      </div>
    ),
    size: 145,
  },
  {
    accessorKey: "senderName",
    header: "From",
    cell: ({ row }) => {
      const ps = row.original.processingState;
      if (ps === "receiving") {
        return (
          <div className="space-y-1.5">
            <Shimmer className="w-28" />
            <Shimmer className="w-20 h-2.5" />
          </div>
        );
      }
      return (
        <div className="text-xs min-w-0">
          <span className="font-medium text-foreground truncate block">
            {row.original.senderName}
          </span>
          <FormattedValue
            raw={row.original.senderFaxNumber}
            formatted={formatPhone(row.original.senderFaxNumber)}
            className="font-mono text-[11px] text-muted-foreground tabular-nums"
          />
        </div>
      );
    },
    size: 145,
  },
  {
    accessorKey: "documentCategory",
    header: "Document",
    cell: ({ row }) => {
      const ps = row.original.processingState;
      if (ps === "receiving" || ps === "classifying") {
        return (
          <div className="space-y-1.5">
            <Shimmer className="w-24" />
            <Shimmer className="w-12 h-2.5" />
          </div>
        );
      }
      const category = row.original.documentCategory as keyof typeof DOCUMENT_CATEGORY_COLORS;
      const colors = DOCUMENT_CATEGORY_COLORS[category] ?? DOCUMENT_CATEGORY_COLORS["Other"];
      return (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border", colors.bg, colors.text, colors.border)}>
          {category === "MRI Requisition" ? "MRI Req" : "Other"}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 100,
  },
  {
    accessorKey: "patientName",
    header: "Patient",
    cell: ({ row }) => {
      const ps = row.original.processingState;
      if (ps) {
        return (
          <div className="space-y-1.5">
            <Shimmer className="w-24" />
            <Shimmer className="w-16 h-2.5" />
          </div>
        );
      }
      return (
        <PatientMatchBadge
          status={row.original.patientMatchStatus}
          patientName={row.original.patientName}
          isManual={row.original.manuallyEditedFields?.includes("patient_id")}
        />
      );
    },
    size: 130,
  },
  {
    accessorKey: "pipelineStatus",
    header: "Status",
    cell: ({ row }) => {
      const fax = row.original;
      const ps = fax.processingState;

      if (ps === "receiving") return <ProcessingTag label="Receiving" />;
      if (ps === "classifying") return <ProcessingTag label="Classifying" />;
      if (ps === "matching") return <ProcessingTag label="Matching" />;

      return <PipelineStatusBadge status={fax.pipelineStatus} />;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 130,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      if (row.original.processingState) return null;
      return (
        <span className="text-xs text-muted-foreground group-hover:text-foreground flex items-center gap-0.5">
          View <ChevronRight className="h-3 w-3" />
        </span>
      );
    },
    size: 45,
  },
];
