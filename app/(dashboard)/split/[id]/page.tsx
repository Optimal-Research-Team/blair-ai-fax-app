"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { faxesAtom, splitFaxAtom } from "@/atoms/inbox";
import { simulatedPatientsAtom } from "@/atoms/simulation";
import { orgCategoriesAtom } from "@/atoms/organization";
import { ClassificationStage, ClassificationStatus, Fax, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { ArrowLeft, Scissors, Save, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addMinutes } from "date-fns";

interface Segment {
  id: string;
  pages: number[];
  label: string;
  docType: string;
  patient: string;
  patientId: string;
  priority: Priority;
}

interface Props {
  params: Promise<{ id: string }>;
}

function getSlaMinutes(_docTypeName: string, priority: Priority): number {
  // TODO: per-category SLA config will come from a future document_category_configs table
  if (priority === "abnormal") return 120;
  return 480;
}

export default function SplitPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const faxes = useAtomValue(faxesAtom);
  const splitFaxRaw = useSetAtom(splitFaxAtom);
  const simulatedPatients = useAtomValue(simulatedPatientsAtom);
  const categories = useAtomValue(orgCategoriesAtom);
  const fax = faxes.find((f) => f.id === id);

  const [segments, setSegments] = useState<Segment[]>(() => {
    if (!fax) return [];
    return [
      {
        id: "seg-1",
        pages: fax.pages.map((p) => p.pageNumber),
        label: "Segment 1",
        docType: fax.documentCategory,
        patient: fax.patientName || "Unknown",
        patientId: fax.patientId || "",
        priority: fax.priority,
      },
    ];
  });

  const [splitAfter, setSplitAfter] = useState<Set<number>>(new Set());

  if (!fax) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-lg text-muted-foreground">Fax not found</p>
        <Button variant="outline" asChild>
          <Link href="/inbox">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Link>
        </Button>
      </div>
    );
  }

  const toggleSplit = (afterPage: number) => {
    const newSplits = new Set(splitAfter);
    if (newSplits.has(afterPage)) {
      newSplits.delete(afterPage);
    } else {
      newSplits.add(afterPage);
    }
    setSplitAfter(newSplits);

    // Recalculate segments based on splits
    const sortedSplits = Array.from(newSplits).sort((a, b) => a - b);
    const fresh: Segment[] = [];
    let startPage = 1;
    let segIndex = 0;

    for (const splitPage of sortedSplits) {
      const pages: number[] = [];
      for (let p = startPage; p <= splitPage; p++) pages.push(p);
      segIndex++;
      const firstPage = fax.pages.find((fp) => fp.pageNumber === startPage);
      fresh.push({
        id: `seg-${segIndex}`,
        pages,
        label: `Segment ${segIndex}`,
        docType: firstPage?.detectedDocType || fax.documentCategory,
        patient: firstPage?.detectedPatient || fax.patientName || "Unknown",
        patientId: fax.patientId || "",
        priority: fax.priority,
      });
      startPage = splitPage + 1;
    }

    if (startPage <= fax.pageCount) {
      segIndex++;
      const pages: number[] = [];
      for (let p = startPage; p <= fax.pageCount; p++) pages.push(p);
      const firstPage = fax.pages.find((fp) => fp.pageNumber === startPage);
      fresh.push({
        id: `seg-${segIndex}`,
        pages,
        label: `Segment ${segIndex}`,
        docType: firstPage?.detectedDocType || fax.documentCategory,
        patient: firstPage?.detectedPatient || fax.patientName || "Unknown",
        patientId: fax.patientId || "",
        priority: fax.priority,
      });
    }

    // Preserve user edits for segments whose page range didn't change
    setSegments((prev) => {
      return fresh.map((seg) => {
        const match = prev.find(
          (p) => p.pages.length === seg.pages.length && p.pages[0] === seg.pages[0]
        );
        return match ? { ...match, id: seg.id, label: seg.label } : seg;
      });
    });
  };

  const updateSegment = (segId: string, field: keyof Segment, value: string) => {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segId) return s;
        if (field === "patientId") {
          const patient = simulatedPatients.find((p) => p.id === value);
          return {
            ...s,
            patientId: value,
            patient: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
          };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleSaveSplit = () => {
    const now = new Date();
    const newFaxes: Fax[] = segments.map((seg, idx) => {
      const slaMin = getSlaMinutes(seg.docType, seg.priority);
      const newPages = seg.pages.map((pageNum, pageIdx) => {
        const origPage = fax.pages.find((p) => p.pageNumber === pageNum);
        return {
          id: `p-split-${fax.id}-${idx}-${pageIdx}`,
          pageNumber: pageIdx + 1,
          detectedDocType: origPage?.detectedDocType,
          detectedPatient: origPage?.detectedPatient,
          contentDescription: origPage?.contentDescription,
        };
      });

      return {
        id: `fax-split-${fax.id}-${idx}`,
        receivedAt: fax.receivedAt,
        pageCount: newPages.length,
        pages: newPages,
        priority: seg.priority,
        senderName: fax.senderName,
        senderFaxNumber: fax.senderFaxNumber,
        faxLineId: fax.faxLineId,
        documentCategory: seg.docType,
        classificationConfidenceScore: 0,
        patientId: seg.patientId || undefined,
        patientName: seg.patient,
        patientMatchStatus: "pending" as const,
        manuallyEditedFields: [],
        providers: [],
        status: "pending-review" as const,
        classificationStage: ClassificationStage.Unfiled,
        classificationStatus: ClassificationStatus.NeedsReview,
        slaDeadline: addMinutes(now, slaMin).toISOString(),
      };
    });

    splitFaxRaw({ originalId: fax.id, newFaxes });
    toast.success(`Fax split into ${segments.length} segments`, {
      description: "New faxes have been added to the inbox.",
    });
    router.push("/inbox");
  };

  const segmentColors = [
    "bg-blue-100 border-blue-300 text-blue-800",
    "bg-emerald-100 border-emerald-300 text-emerald-800",
    "bg-purple-100 border-purple-300 text-purple-800",
    "bg-amber-100 border-amber-300 text-amber-800",
    "bg-rose-100 border-rose-300 text-rose-800",
  ];

  const getSegmentForPage = (pageNum: number) => {
    return segments.findIndex((s) => s.pages.includes(pageNum));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document Splitting"
        description={`Split ${fax.senderName} — ${fax.pageCount} pages`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/fax/${fax.id}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Viewer
              </Link>
            </Button>
            <Button onClick={handleSaveSplit} disabled={segments.length <= 1}>
              <Save className="h-4 w-4 mr-1" />
              Save Split ({segments.length} segments)
            </Button>
          </div>
        }
      />

      {/* Page strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Click between pages to add split markers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
            {fax.pages.map((page, index) => {
              const segIndex = getSegmentForPage(page.pageNumber);
              const colorClass =
                segmentColors[segIndex % segmentColors.length];
              const showSplitMarker =
                index < fax.pages.length - 1;
              const isSplit = splitAfter.has(page.pageNumber);

              return (
                <div key={page.id} className="flex items-stretch shrink-0">
                  {/* Page card */}
                  <div
                    className={cn(
                      "w-24 border-2 rounded-sm p-2 flex flex-col items-center gap-1 transition-all",
                      colorClass
                    )}
                  >
                    {/* Mini page preview */}
                    <div className="w-16 h-20 bg-background rounded-sm border shadow-sm flex flex-col p-1.5 gap-0.5">
                      <div className="h-1 bg-muted rounded-sm w-3/4" />
                      <div className="h-0.5 bg-muted/50 rounded-sm w-full" />
                      <div className="h-0.5 bg-muted/50 rounded-sm w-5/6" />
                      <div className="h-0.5 bg-muted/50 rounded-sm w-full" />
                      <div className="h-0.5 bg-muted/50 rounded-sm w-2/3" />
                    </div>
                    <span className="text-[10px] font-semibold">
                      Page {page.pageNumber}
                    </span>
                    {page.detectedDocType && (
                      <span className="text-[8px] truncate max-w-full text-center">
                        {page.detectedDocType}
                      </span>
                    )}
                  </div>

                  {/* Split marker zone */}
                  {showSplitMarker && (
                    <button
                      onClick={() => toggleSplit(page.pageNumber)}
                      className={cn(
                        "relative overflow-hidden flex items-center justify-center min-w-6 px-1.5 hover:px-3 transition-all group",
                        isSplit
                          ? "bg-red-50"
                          : "hover:bg-muted/50"
                      )}
                    >
                      {isSplit ? (
                        <div className="flex flex-col items-center justify-center h-full py-2">
                          <div className="w-px flex-1 border-l-2 border-dashed border-red-300" />
                          <Scissors className="h-4 w-4 text-red-500 rotate-90 shrink-0" />
                          <div className="w-px flex-1 border-l-2 border-dashed border-red-300" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Segments summary with editable fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment, index) => (
          <Card
            key={segment.id}
            className={cn("border-2", segmentColors[index % segmentColors.length])}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{segment.label}</h4>
                <Badge variant="secondary" className="text-[10px]">
                  {segment.pages.length} {segment.pages.length === 1 ? "page" : "pages"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pages: {segment.pages.join(", ")}
              </p>

              <div className="space-y-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Document Type</Label>
                  <Select
                    value={segment.docType}
                    onValueChange={(v) => updateSegment(segment.id, "docType", v)}
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Patient</Label>
                  <Select
                    value={segment.patientId}
                    onValueChange={(v) => updateSegment(segment.id, "patientId", v)}
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {simulatedPatients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Priority</Label>
                  <Select
                    value={segment.priority}
                    onValueChange={(v) => updateSegment(segment.id, "priority", v)}
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abnormal">Abnormal</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
