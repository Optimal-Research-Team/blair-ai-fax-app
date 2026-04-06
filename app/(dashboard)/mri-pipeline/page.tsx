"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAtomValue } from "jotai";
import { allInboxItemsAtom } from "@/atoms/inbox";
import { Fax } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaxViewerDialog } from "@/components/fax-viewer/fax-viewer-dialog";
import { TriageChecklist, type HighlightRegion } from "@/components/mri-pipeline/triage-checklist";
import { MRICommsThread } from "@/components/mri-pipeline/mri-comms-thread";
import { MRIComposePanel } from "@/components/mri-pipeline/mri-compose-panel";
import { MRITimeline } from "@/components/mri-pipeline/mri-timeline";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Phone,
  Stethoscope,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageSquare,
  FileCheck,
} from "lucide-react";

type PipelineStage = "triage" | "screening" | "radiologist" | "scheduling" | "confirmation";

const TRIAGE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_triage: { label: "In Triage", color: "bg-violet-50 text-violet-700 border-violet-200" },
  pending_physician_info: { label: "Awaiting Info", color: "bg-amber-50 text-amber-700 border-amber-200" },
  patient_matching: { label: "Patient Match", color: "bg-sky-50 text-sky-700 border-sky-200" },
  duplicate_detected: { label: "Duplicate", color: "bg-red-50 text-red-700 border-red-200" },
  triage_success: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  referral_failed: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
};

function PlaceholderTab({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function MRIPipelineContent() {
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage") as PipelineStage | null;
  const [activeStage, setActiveStage] = useState<PipelineStage>(stageParam || "triage");
  const [selectedFaxId, setSelectedFaxId] = useState<string | null>(null);
  const [highlightRegion, setHighlightRegion] = useState<HighlightRegion | null>(null);
  const [reviewTab, setReviewTab] = useState<"review" | "comms" | "timeline">("review");
  const [composeOpen, setComposeOpen] = useState(false);

  const allFaxes = useAtomValue(allInboxItemsAtom);

  // Triage items = routed MRI requisitions
  const triageItems = useMemo(
    () => allFaxes.filter((f) => f.pipelineStatus === "routed" && f.documentCategory === "MRI Requisition"),
    [allFaxes]
  );

  const triageCounts = useMemo(() => ({
    total: triageItems.length,
    inTriage: triageItems.filter((f) => f.triageStatus === "in_triage").length,
    pending: triageItems.filter((f) => f.triageStatus === "pending_physician_info").length,
    approved: triageItems.filter((f) => f.triageStatus === "triage_success").length,
  }), [triageItems]);

  const selectedFax = useMemo(
    () => allFaxes.find((f) => f.id === selectedFaxId) ?? null,
    [allFaxes, selectedFaxId]
  );

  return (
    <div className="space-y-2">
      <PageHeader
        title="MRI Pipeline"
        description="Manage MRI referrals through the processing pipeline"
      />

      {/* Stage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border rounded-sm overflow-hidden">
        {[
          { label: "Triage", count: triageCounts.total, icon: ClipboardCheck, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Screening", count: 0, icon: Phone, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Radiologist", count: 0, icon: Stethoscope, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Scheduling", count: 0, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Confirmation", count: 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="bg-card px-4 py-3 flex items-center gap-3">
            <div className={cn("h-8 w-8 rounded-sm flex items-center justify-center", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-mono text-lg font-semibold tabular-nums leading-none">{s.count || "—"}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={activeStage} onValueChange={(v) => setActiveStage(v as PipelineStage)}>
        <TabsList variant="line">
          <TabsTrigger value="triage" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Admin Triage
            {triageCounts.total > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{triageCounts.total}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="screening" className="gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Patient Screening
          </TabsTrigger>
          <TabsTrigger value="radiologist" className="gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            Radiologist Review
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Scheduling
          </TabsTrigger>
          <TabsTrigger value="confirmation" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmation
          </TabsTrigger>
        </TabsList>

        {/* ═══ Admin Triage Tab ═══ */}
        <TabsContent value="triage" className="space-y-2">
          {triageItems.length === 0 ? (
            <PlaceholderTab
              title="No referrals awaiting triage"
              icon={ClipboardCheck}
              description="MRI requisitions that are routed from the fax inbox will appear here for admin triage review."
            />
          ) : (
            <div className="border rounded-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Received</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">From</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Patient</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Clinical Indication</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Triage Status</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {triageItems.map((fax) => {
                    const statusInfo = TRIAGE_STATUS_LABELS[fax.triageStatus || "in_triage"];
                    return (
                      <tr
                        key={fax.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                        onClick={() => setSelectedFaxId(fax.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px] tabular-nums">
                            {format(new Date(fax.receivedAt), "MMM d, h:mm a")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{fax.senderName}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">{fax.senderFaxNumber}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{fax.patientName || "—"}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-muted-foreground truncate block">{fax.documentDescription || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                            statusInfo.color
                          )}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-0.5 justify-end">
                            Triage <ChevronRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ═══ Placeholder Tabs ═══ */}
        <TabsContent value="screening">
          <PlaceholderTab
            title="Patient Screening"
            icon={Phone}
            description="Multi-channel outreach (SMS + Voice + Email) to complete the MRI screening questionnaire. Includes contraindication pre-screening, demographics, scheduling preferences, and medical history capture."
          />
        </TabsContent>
        <TabsContent value="radiologist">
          <PlaceholderTab
            title="Radiologist Review"
            icon={Stethoscope}
            description="Review completed screening data and original requisition. Assign MRI protocol, confirm contrast appropriateness, and clear referrals for scheduling."
          />
        </TabsContent>
        <TabsContent value="scheduling">
          <PlaceholderTab
            title="Scheduling"
            icon={Calendar}
            description="Book patient MRI appointments using preferences and radiologist-assigned protocol. Manage waitlists and slot allocation across Markham and Kitchener locations."
          />
        </TabsContent>
        <TabsContent value="confirmation">
          <PlaceholderTab
            title="Pre-Appointment Confirmation"
            icon={CheckCircle2}
            description="Automated confirmation outreach 5-7 days before appointment. Handle reschedules, no-shows, and cancellations to prevent lost MRI slots."
          />
        </TabsContent>
      </Tabs>

      {/* Triage Review Dialog */}
      {selectedFax && (
        <>
          <FaxViewerDialog
            fax={selectedFax}
            open={!!selectedFaxId}
            onOpenChange={(open) => {
              if (!open) { setSelectedFaxId(null); setHighlightRegion(null); setReviewTab("review"); }
            }}
            triageMode={true}
            triageChecklist={
              <div className="flex flex-col h-full">
                <Tabs value={reviewTab} onValueChange={(v) => setReviewTab(v as typeof reviewTab)} className="flex flex-col h-full">
                  <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0 shrink-0">
                    <TabsTrigger value="review" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-[12px] gap-1.5">
                      <FileCheck className="h-3.5 w-3.5" />Review
                    </TabsTrigger>
                    <TabsTrigger value="comms" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-[12px] gap-1.5 relative">
                      <MessageSquare className="h-3.5 w-3.5" />Comms
                      {(selectedFax.triageCommunications?.length ?? 0) > 0 && (
                        <span className="absolute top-1.5 right-[calc(50%-24px)] h-1.5 w-1.5 bg-amber-500 rounded-full" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-[12px] gap-1.5">
                      <Clock className="h-3.5 w-3.5" />Timeline
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="review" className="flex-1 overflow-y-auto m-0">
                    <TriageChecklist
                      fax={selectedFax}
                      onHighlightChange={setHighlightRegion}
                      onRequestInfo={() => { setComposeOpen(true); }}
                    />
                  </TabsContent>
                  <TabsContent value="comms" className="flex-1 overflow-hidden m-0">
                    <MRICommsThread
                      communications={selectedFax.triageCommunications || []}
                      recipientName={selectedFax.senderName}
                      recipientFax={selectedFax.senderFaxNumber}
                      onCompose={() => setComposeOpen(true)}
                    />
                  </TabsContent>
                  <TabsContent value="timeline" className="flex-1 overflow-y-auto m-0">
                    <MRITimeline events={selectedFax.triageTimeline || []} />
                  </TabsContent>
                </Tabs>
              </div>
            }
            highlightRegion={highlightRegion}
          />
          <MRIComposePanel
            isOpen={composeOpen}
            onClose={() => setComposeOpen(false)}
            recipientName={selectedFax.senderName}
            recipientFax={selectedFax.senderFaxNumber}
            recipientEmail={undefined}
            recipientPhone={undefined}
            patientName={selectedFax.patientName || "Unknown Patient"}
            missingFields={
              Object.entries(selectedFax.aiExtractedFields || {})
                .filter(([, v]) => !v)
                .map(([k]) => k === "refBilling" ? "Billing number" : k)
                .concat(["Physician signature"])
            }
            onSend={(data) => {
              toast.success(`${data.channel === "fax" ? "Fax" : data.channel === "email" ? "Email" : "Phone note"} sent to ${selectedFax.senderName}`, {
                description: data.scheduleFollowUp ? `Follow-up scheduled in ${data.followUpDays} days` : undefined,
              });
              setComposeOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function MRIPipelinePage() {
  return (
    <Suspense>
      <MRIPipelineContent />
    </Suspense>
  );
}
