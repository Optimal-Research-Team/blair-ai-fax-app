"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClassificationStage, Fax } from "@/types";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { StageBadge } from "./stage-badge";
import { PatientMatchBadge } from "./patient-match-badge";
import { UnsortedReasonBadge } from "./unsorted-reason-badge";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { LockIndicator } from "./lock-indicator";
import { computeUnsortedReasons } from "@/lib/fax-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatPhone } from "@/lib/format";
import { FormattedValue } from "@/components/shared/formatted-value";

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
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const ps = row.original.processingState;
      if (ps) return <Shimmer className="w-16" />;
      return <PriorityBadge priority={row.original.priority} />;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 100,
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
      const isFailed = row.original.status === "failed";
      const isManualCategory = row.original.manuallyEditedFields?.includes("document_category");
      return (
        <div className="text-xs min-w-0">
          <span className="font-medium truncate block">{row.original.documentCategory}</span>
          {!isFailed && isManualCategory && (
            <span className="text-[10px] text-muted-foreground">Manually Classified</span>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 120,
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
    accessorKey: "providers",
    header: "Providers",
    cell: ({ row }) => {
      const ps = row.original.processingState;
      if (ps) {
        return <Shimmer className="w-24" />;
      }
      const providers = row.original.providers;
      if (!providers || providers.length === 0) {
        return <span className="inline-flex items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-gray-500">Not Matched</span>;
      }
      const first = providers[0];
      const rest = providers.length - 1;
      return (
        <div className="flex items-center gap-1 text-xs min-w-0">
          <span className="font-medium truncate">{first.providerName}</span>
          {first.source === "ai" ? (
            <span className="inline-flex items-center rounded px-1 py-0 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">AI</span>
          ) : (
            <span className="inline-flex items-center rounded px-1 py-0 text-[9px] bg-violet-50 text-violet-700 border border-violet-200">Manual</span>
          )}
          {rest > 0 && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px] bg-muted text-muted-foreground border">
              +{rest}
            </span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const fax = row.original;
      const ps = fax.processingState;

      if (ps === "receiving") return <ProcessingTag label="Receiving" />;
      if (ps === "classifying") return <ProcessingTag label="Classifying" />;
      if (ps === "matching") return <ProcessingTag label="Matching" />;
      if (ps === "filing") return <ProcessingTag label="Filing" />;

      const isUnsorted =
        fax.status !== "completed" && fax.status !== "auto-filed";
      const reasons = isUnsorted ? computeUnsortedReasons(fax) : [];
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={fax.status} />
            <LockIndicator documentId={fax.id} />
          </div>
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {reasons.map((r) => (
                <UnsortedReasonBadge key={r} reason={r} />
              ))}
            </div>
          )}
          {fax.filingError && (
            <span className="inline-flex items-center gap-0.5 rounded-sm border border-red-300 bg-red-50 px-1 py-px text-[9px] font-medium leading-tight text-red-700">
              <AlertCircle className="h-2.5 w-2.5 shrink-0" />
              Filing Error
            </span>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 190,
  },
  {
    accessorKey: "classificationStage",
    header: "Stage",
    cell: ({ row }) => {
      if (row.original.processingState) {
        return <Shimmer className="w-16" />;
      }
      return <StageBadge stage={row.original.classificationStage} />;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    size: 110,
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
