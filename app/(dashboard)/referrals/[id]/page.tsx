"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { faxesAtom } from "@/atoms/inbox";
import { simulatedReferralsAtom, updateSimulatedReferralAtom } from "@/atoms/simulation";
import { Communication } from "@/types/communication";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge } from "@/components/inbox/priority-badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ChevronRight,
  Bot,
  User,
  Plus,
  Calendar,
  Stethoscope,
  FileCheck,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { ReferralDocument, ReferralDocumentPage, TimelineEvent } from "@/types/referral";
import { CompletenessPanel } from "@/components/referral/completeness-panel";
import { CommunicationsThread } from "@/components/referral/communications-thread";
import { ComposeSlideOver, ComposeData } from "@/components/referral/compose-slide-over";
import { DocumentViewer } from "@/components/shared/document-viewer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface Props {
  params: Promise<{ id: string }>;
}

// Status steps for the workflow stepper
const STATUS_STEPS = [
  { key: "triage", label: "Triage" },
  { key: "incomplete", label: "Incomplete" },
  { key: "pending-review", label: "Pending Review" },
  { key: "routed-to-cerebrum", label: "Routed to Cerebrum" },
];

const STATUS_ORDER = ["triage", "incomplete", "pending-review", "routed-to-cerebrum"];

export default function ReferralDetailPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen gap-3">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading referral...</span>
      </div>
    }>
      <ReferralDetailContent params={params} />
    </Suspense>
  );
}

function ReferralDetailContent({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const faxes = useAtomValue(faxesAtom);
  const allReferrals = useAtomValue(simulatedReferralsAtom);
  const updateSimulatedReferral = useSetAtom(updateSimulatedReferralAtom);
  const referral = allReferrals.find((r) => r.id === id);

  // Check for tab query param (e.g., ?tab=comms)
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "comms" ? "comms" : tabParam === "timeline" ? "timeline" : "review";

  // UI State
  const [activeTab, setActiveTab] = useState<"review" | "comms" | "timeline">(initialTab);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // Resolve PDF URL — prefer per-document pdfUrl, then fall back to linked fax
  const pdfUrl = useMemo(() => {
    if (!referral) return undefined;
    const doc = referral.documents[selectedDocIndex];
    if (doc?.pdfUrl) return doc.pdfUrl;
    const linkedFax = faxes.find((f) => f.id === referral.faxId);
    return linkedFax?.pdfUrl;
  }, [referral, faxes, selectedDocIndex]);

  // Completeness state for the panel
  const [completenessItems, setCompletenessItems] = useState(
    referral?.completenessItems || []
  );

  // Compose slide-over state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<"fax" | "email" | undefined>(undefined);

  // Sync tab with URL params when they change
  useEffect(() => {
    if (tabParam === "comms") {
      setActiveTab("comms");
    } else if (tabParam === "timeline") {
      setActiveTab("timeline");
    }
  }, [tabParam]);

  if (!referral) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-lg text-muted-foreground">Referral not found</p>
        <Button variant="outline" asChild>
          <Link href="/referrals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Referrals
          </Link>
        </Button>
      </div>
    );
  }

  // Get all pages across all documents for navigation
  const allPages = useMemo(() => {
    const pages: { doc: ReferralDocument; page: ReferralDocumentPage; docIndex: number; pageIndex: number }[] = [];
    referral.documents.forEach((doc, docIndex) => {
      doc.pages.forEach((page, pageIndex) => {
        pages.push({ doc, page, docIndex, pageIndex });
      });
    });
    return pages;
  }, [referral.documents]);

  const currentDoc = referral.documents[selectedDocIndex];
  const currentPage = currentDoc?.pages[selectedPageIndex];
  const totalPages = allPages.length;

  // Calculate global page index for navigation
  const globalPageIndex = useMemo(() => {
    let count = 0;
    for (let i = 0; i < selectedDocIndex; i++) {
      count += referral.documents[i].pages.length;
    }
    return count + selectedPageIndex;
  }, [selectedDocIndex, selectedPageIndex, referral.documents]);

  const goToPrevPage = () => {
    if (selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    } else if (selectedDocIndex > 0) {
      const prevDoc = referral.documents[selectedDocIndex - 1];
      setSelectedDocIndex(selectedDocIndex - 1);
      setSelectedPageIndex(prevDoc.pages.length - 1);
    }
  };

  const goToNextPage = () => {
    if (selectedPageIndex < currentDoc.pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
    } else if (selectedDocIndex < referral.documents.length - 1) {
      setSelectedDocIndex(selectedDocIndex + 1);
      setSelectedPageIndex(0);
    }
  };

  const selectPage = (docIndex: number, pageIndex: number) => {
    setSelectedDocIndex(docIndex);
    setSelectedPageIndex(pageIndex);
  };

  // Get current status position for stepper
  const currentStatusIndex = STATUS_ORDER.indexOf(referral.status);

  // Handlers
  const handleViewPage = (pageNumber: number) => {
    // Find the page across all documents
    let foundDocIndex = 0;
    let foundPageIndex = pageNumber - 1;

    for (let i = 0; i < referral.documents.length; i++) {
      const doc = referral.documents[i];
      if (foundPageIndex < doc.pages.length) {
        foundDocIndex = i;
        break;
      }
      foundPageIndex -= doc.pages.length;
    }

    setSelectedDocIndex(foundDocIndex);
    setSelectedPageIndex(foundPageIndex);
  };

  const handleMarkFound = (itemId: string) => {
    setCompletenessItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: "found" as const } : item
      )
    );
    toast.success("Item marked as found");
  };

  const handleMarkMissing = (itemId: string) => {
    setCompletenessItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: "missing" as const } : item
      )
    );
  };

  const handleUnmarkFound = (itemId: string) => {
    setCompletenessItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: "missing" as const } : item
      )
    );
  };

  const handleRequestItem = () => {
    setComposeChannel(undefined);
    setIsComposeOpen(true);
  };

  const handleOpenCompose = (channel?: "fax" | "email") => {
    setComposeChannel(channel);
    setIsComposeOpen(true);
  };

  const handleComposeSend = (data: ComposeData) => {
    if (!referral) return;

    const now = new Date().toISOString();
    const commId = `comm-${Date.now()}`;

    // Get the labels of selected items
    const requestedItemLabels = completenessItems
      .filter((item) => data.selectedItems.includes(item.id))
      .map((item) => item.label);

    // Create new communication
    const newComm: Communication = {
      id: commId,
      referralId: referral.id,
      type: "missing-items",
      channel: data.channel,
      status: "sent",
      initiator: "human",
      recipientName: referral.referringPhysicianName,
      recipientFax: referral.referringPhysicianFax,
      recipientEmail: referral.referringPhysicianEmail,
      subject: `Request for Missing Documentation - ${referral.patientName}`,
      body: data.message,
      missingItems: requestedItemLabels,
      escalationStrategy: data.scheduleFollowUp ? "fax-then-voice" : "none",
      escalationDelayDays: data.followUpDays,
      sentAt: now,
      remindersSent: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Create timeline event
    const timelineEvent = {
      id: `tl-${Date.now()}`,
      type: "communication-sent" as const,
      timestamp: now,
      title: `${data.channel === "fax" ? "Fax" : "Email"} sent requesting missing items`,
      description: `Requested: ${requestedItemLabels.join(", ")}`,
      actor: "human" as const,
      actorName: "Sarah Mitchell",
    };

    // Mark requested items as requested
    setCompletenessItems(prev =>
      prev.map(item =>
        data.selectedItems.includes(item.id)
          ? { ...item, requestedAt: now }
          : item
      )
    );

    // Update the referral with new communication and timeline event
    // Communications: add to end (chronological - newest at bottom)
    // Timeline: add to beginning (reverse chronological - newest at top)
    updateSimulatedReferral({
      id: referral.id,
      updates: {
        communications: [...referral.communications, newComm],
        timeline: [timelineEvent, ...referral.timeline],
        pendingCommunicationsCount: referral.pendingCommunicationsCount + 1,
        updatedAt: now,
      },
    });
  };

  const handleAccept = () => {
    toast.success("Referral accepted");
  };

  const handleDecline = () => {
    toast.info("Opening decline dialog...");
  };

  const handleRequestMissingItems = () => {
    setComposeChannel(undefined);
    setIsComposeOpen(true);
  };

  // Completeness score calculation (guard against division by zero)
  const completenessScore = completenessItems.length > 0
    ? Math.round(
        (completenessItems.filter((i) => i.status === "found").length /
          completenessItems.length) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col h-screen -m-6">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + Patient info */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight">{referral.patientName}</h1>
                <PriorityBadge priority={referral.priority} />
                {referral.pendingCommunicationsCount > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {referral.pendingCommunicationsCount} awaiting
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {referral.referringPhysicianName}
                </span>
                <span>·</span>
                <span>{formatRelativeTime(referral.receivedDate)}</span>
                <span>·</span>
                <span>{referral.documents.reduce((acc, d) => acc + d.pageCount, 0)} pages</span>
              </div>
            </div>
          </div>

          {/* Right: Status stepper (simplified) */}
          <nav aria-label="Referral workflow status" className="flex items-center gap-1">
            {STATUS_STEPS.map((step, idx) => {
              const stepIndex = STATUS_ORDER.indexOf(step.key);
              const isActive = step.key === referral.status;
              const isPast = stepIndex < currentStatusIndex;

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-medium",
                      isActive && "bg-primary text-primary-foreground",
                      isPast && "bg-emerald-100 text-emerald-700",
                      !isActive && !isPast && "bg-muted text-muted-foreground"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {step.label}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Document thumbnails */}
        <div className="w-24 flex-shrink-0 border-r bg-muted/30 overflow-y-auto p-2 space-y-2">
          {referral.documents.map((doc, docIndex) => (
            <div key={doc.id}>
              {/* Document label */}
              <div className="px-1 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  {doc.type === "original-referral" ? "Original" : doc.type === "response" ? "Response" : "Additional"}
                </span>
              </div>

              {/* Page thumbnails */}
              <div className="space-y-1.5">
                {doc.pages.map((page, pageIndex) => (
                  <button
                    key={page.id}
                    onClick={() => selectPage(docIndex, pageIndex)}
                    className={cn(
                      "w-full aspect-[8.5/11] border-2 bg-white flex items-center justify-center transition-colors",
                      selectedDocIndex === docIndex && selectedPageIndex === pageIndex
                        ? "border-primary"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
                      {page.pageNumber}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Center + Right: Resizable panels */}
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full">
              <DocumentViewer
                currentPageIndex={globalPageIndex}
                totalPages={totalPages}
                onPrevPage={goToPrevPage}
                onNextPage={goToNextPage}
                pdfUrl={pdfUrl}
                metadata={[
                  { label: "Document", value: currentDoc?.label || "" },
                  { label: "Page", value: `${currentPage?.pageNumber || 0} of ${currentDoc?.pageCount || 0}` },
                  { label: "Patient", value: referral.patientName },
                  { label: "Physician", value: referral.referringPhysicianName },
                ]}
                description={currentPage?.detectedContent}
                showSignature={currentPage?.pageNumber === currentDoc?.pageCount}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="bg-background flex flex-col overflow-hidden h-full">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="review"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <FileCheck className="h-4 w-4 mr-1.5" />
                Review
              </TabsTrigger>
              <TabsTrigger
                value="comms"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 relative"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Comms
                {referral.pendingCommunicationsCount > 0 && (
                  <span className="absolute top-2 right-4 h-2 w-2 bg-amber-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Review Tab */}
            <TabsContent value="review" className="flex-1 overflow-y-auto m-0 p-3 space-y-3">
              {/* Completeness Panel */}
              <CompletenessPanel
                items={completenessItems}
                score={completenessScore}
                aiConfidence={referral.aiConfidence}
                onViewPage={handleViewPage}
                onRequestItem={handleRequestItem}
                onRequestMissingItems={handleRequestMissingItems}
                onMarkFound={handleMarkFound}
                onMarkMissing={handleMarkMissing}
                onUnmarkFound={handleUnmarkFound}
              />

              {/* Clinical Summary */}
              <div className="border rounded-sm p-3 space-y-3">
                <h3 className="text-sm font-medium">Reason for Referral</h3>
                <p className="text-sm text-muted-foreground">{referral.reasonForReferral}</p>

                {referral.conditions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Conditions</p>
                    <div className="flex flex-wrap gap-1">
                      {referral.conditions.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {referral.medications.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Medications</p>
                    <div className="flex flex-wrap gap-1">
                      {referral.medications.map((m) => (
                        <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Routing info */}
              {referral.assignedCardiologistName && (
                <div className="border rounded-sm p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Assigned to</p>
                  <p className="text-sm font-medium">{referral.assignedCardiologistName}</p>
                  {referral.appointmentDate && (
                    <div className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Appointment: {referral.appointmentDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action button - Route to Cerebrum when review is ready */}
              {referral.status !== "routed-to-cerebrum" && completenessScore === 100 && (
                <div className="border-t pt-4">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAccept}>
                    <ArrowUpRight className="h-4 w-4 mr-1.5" />
                    Route to Cerebrum
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Communications Tab - Full Thread View */}
            <TabsContent value="comms" className="flex-1 overflow-hidden m-0">
              <CommunicationsThread
                communications={referral.communications}
                documents={referral.documents}
                recipientName={referral.referringPhysicianName}
                recipientClinic={referral.clinicName}
                recipientPhone={referral.referringPhysicianPhone}
                onViewDocument={(docId) => {
                  const docIndex = referral.documents.findIndex(d => d.id === docId);
                  if (docIndex >= 0) {
                    setSelectedDocIndex(docIndex);
                    setSelectedPageIndex(0);
                    setActiveTab("review");
                  }
                }}
                onSendFax={() => handleOpenCompose("fax")}
                onEmail={() => handleOpenCompose("email")}
              />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="space-y-4">
                {[...referral.timeline].sort((a, b) =>
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                ).map((event, idx) => (
                  <TimelineItem key={event.id} event={event} isLast={idx === referral.timeline.length - 1} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Compose Slide-Over */}
      <ComposeSlideOver
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        recipientName={referral.referringPhysicianName}
        recipientClinic={referral.clinicName}
        recipientFax={referral.referringPhysicianFax}
        recipientPhone={referral.referringPhysicianPhone}
        recipientEmail={referral.referringPhysicianEmail}
        missingItems={completenessItems.filter(i => i.status === "missing")}
        preSelectedChannel={composeChannel}
        onSend={handleComposeSend}
      />
    </div>
  );
}

// Timeline item component
function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const getEventIcon = () => {
    switch (event.type) {
      case "referral-received":
        return <FileText className="h-3.5 w-3.5" />;
      case "ai-classified":
        return <Bot className="h-3.5 w-3.5" />;
      case "status-changed":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "communication-sent":
        return <Send className="h-3.5 w-3.5" />;
      case "communication-received":
        return <ArrowUpRight className="h-3.5 w-3.5" />;
      case "document-added":
        return <Plus className="h-3.5 w-3.5" />;
      case "item-marked-found":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "item-marked-missing":
        return <XCircle className="h-3.5 w-3.5" />;
      case "assigned":
        return <User className="h-3.5 w-3.5" />;
      case "note-added":
        return <MessageSquare className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case "communication-sent":
      case "communication-received":
        return "bg-blue-100 text-blue-700";
      case "document-added":
      case "item-marked-found":
        return "bg-emerald-100 text-emerald-700";
      case "item-marked-missing":
        return "bg-red-100 text-red-700";
      case "ai-classified":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="relative flex gap-3">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 border", getEventColor())}>
        {getEventIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{event.title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {event.actor === "ai" ? (
              <Bot className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
          </div>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(event.timestamp)}
          {event.actorName && ` · ${event.actorName}`}
        </p>
      </div>
    </div>
  );
}
