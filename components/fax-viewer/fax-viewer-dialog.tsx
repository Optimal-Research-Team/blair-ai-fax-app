"use client";

import { useState, useEffect, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { faxesAtom, updateFaxAtom, addFaxAtom } from "@/atoms/inbox";
import { simulatedReferralsAtom, simulatedPatientsAtom, upsertReferralAtom } from "@/atoms/simulation";
import { Communication } from "@/types/communication";
import { mockReferringProviders } from "@/data/mock-providers";
import { providerInboxes } from "@/data/mock-staff";
import { ClassificationStage, ClassificationStatus, Fax } from "@/types";
import { Referral } from "@/types/referral";
import { PageThumbnail } from "@/components/fax-viewer/page-thumbnail";
import { FaxPageViewer } from "@/components/fax-viewer/fax-page-viewer";
import { ReviewPanel } from "@/components/fax-viewer/review-panel";
import { PriorityBadge } from "@/components/inbox/priority-badge";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { CompletenessPanel } from "@/components/referral/completeness-panel";
import { CommunicationsThread } from "@/components/referral/communications-thread";
import { ComposeSlideOver, ComposeData } from "@/components/referral/compose-slide-over";
import { DocumentViewer } from "@/components/shared/document-viewer";
import { SplitDialog } from "@/components/fax-viewer/split-dialog";
import { useLock } from "@/atoms/lock";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatPhone } from "@/lib/format";
import { FormattedValue } from "@/components/shared/formatted-value";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  ExternalLink,
  MessageSquare,
  Clock,
  ChevronRight,
  Stethoscope,
  FileCheck,
  ArrowUpRight,
  Calendar,
  UserPlus,
  User,
  Scissors,
  Search,
  Save,
  XCircle,
  Send,
  Inbox,
  Copy,
} from "lucide-react";

interface FaxViewerDialogProps {
  faxId?: string | null;
  /** Pass a fax object directly (skips atom lookup) */
  fax?: Fax | null;
  referralId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when a split is completed — parent should close dialog and highlight results */
  onSplitComplete?: (originalFaxId: string, newFaxIds: string[]) => void;
  /** When true, replaces the right panel with triageChecklist content */
  triageMode?: boolean;
  /** Custom content for the right panel in triage mode */
  triageChecklist?: React.ReactNode;
  /** Highlight region to show on the PDF (for triage field hover) */
  highlightRegion?: { x: number; y: number; width: number; height: number; page: number } | null;
}

const STATUS_STEPS = [
  { key: "triage", label: "Triage" },
  { key: "incomplete", label: "Incomplete" },
  { key: "pending-review", label: "Pending Review" },
  { key: "routed-to-cerebrum", label: "Routed to Cerebrum" },
];

const STATUS_ORDER = ["triage", "incomplete", "pending-review", "routed-to-cerebrum"];

/** Build a Referral object from raw fax data when no mock referral exists */
function buildSyntheticReferral(referralId: string, fax: Fax): Referral {
  const now = new Date().toISOString();
  const hasDescription = !!fax.description;

  return {
    id: referralId,
    faxId: fax.id,
    patientId: fax.patientId || "unknown",
    patientName: fax.patientName || "Unknown Patient",
    patientDob: "",
    patientPhone: "",
    referringPhysicianId: "",
    referringPhysicianName: fax.senderName || "Unknown Physician",
    referringPhysicianFax: fax.senderFaxNumber,
    clinicName: fax.senderName,
    receivedDate: fax.receivedAt,
    status: "triage",
    priority: fax.priority,
    isUrgent: fax.priority === "abnormal",
    reasonForReferral: fax.description || "Pending AI extraction",
    clinicalHistory: "",
    conditions: [],
    medications: [],
    completenessItems: [
      { id: "ci-1", label: "Patient Demographics", required: true, status: "found", confidence: 90, pageNumber: 1 },
      { id: "ci-2", label: "Referring Physician", required: true, status: "found", confidence: 85, pageNumber: 1 },
      { id: "ci-3", label: "Reason for Referral", required: true, status: hasDescription ? "found" : "missing", confidence: hasDescription ? 80 : 0, pageNumber: hasDescription ? 1 : undefined },
      { id: "ci-4", label: "ECG", required: true, status: "missing", confidence: 0 },
      { id: "ci-5", label: "Labs", required: false, status: "missing", confidence: 0 },
      { id: "ci-6", label: "Echocardiogram", required: false, status: "missing", confidence: 0 },
    ],
    completenessScore: hasDescription ? 33 : 25,
    aiConfidence: fax.classificationConfidenceScore || 80,
    documents: [
      {
        id: `doc-${fax.id}`,
        faxId: fax.id,
        type: "original-referral",
        label: "Original Referral",
        receivedAt: fax.receivedAt,
        pageCount: fax.pageCount,
        pdfUrl: fax.pdfUrl,
        pages: fax.pages.map((p, i) => ({
          id: p.id,
          pageNumber: i + 1,
          detectedContent: p.contentDescription || `Page ${i + 1}`,
        })),
      },
    ],
    communications: [],
    pendingCommunicationsCount: 0,
    timeline: [
      {
        id: "tl-synth-1",
        type: "referral-received",
        timestamp: fax.receivedAt,
        title: "Referral received via fax",
        description: `From ${fax.senderName}`,
        actor: "ai",
      },
      {
        id: "tl-synth-2",
        type: "ai-classified",
        timestamp: fax.receivedAt,
        title: "AI classified as referral",
        description: `${fax.documentCategory}`,
        actor: "ai",
      },
    ],
    notes: [],
    createdAt: fax.receivedAt,
    updatedAt: now,
  };
}

export function FaxViewerDialog({
  faxId,
  fax: faxProp,
  referralId,
  open,
  onOpenChange,
  onSplitComplete,
  triageMode,
  triageChecklist,
  highlightRegion: highlightRegionProp,
}: FaxViewerDialogProps) {
  // ── Data lookup ──
  const faxes = useAtomValue(faxesAtom);
  const allReferrals = useAtomValue(simulatedReferralsAtom);
  const simulatedPatients = useAtomValue(simulatedPatientsAtom);
  const updateFax = useSetAtom(updateFaxAtom);
  const addFax = useSetAtom(addFaxAtom);
  const upsertReferral = useSetAtom(upsertReferralAtom);
  const fax = faxProp ?? (faxId ? faxes.find((f) => f.id === faxId) : null);
  const existingReferral = referralId ? allReferrals.find((r) => r.id === referralId) : null;
  // Build synthetic referral from fax data when no existing referral exists
  const referral = useMemo(() => {
    if (existingReferral) return existingReferral;
    if (referralId && fax) return buildSyntheticReferral(referralId, fax);
    return null;
  }, [existingReferral, referralId, fax]);
  const isReferralMode = !triageMode && !!referral;

  // ── Unsaved changes guard ──
  const [reviewDirty, setReviewDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && reviewDirty) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleDiscardConfirm = () => {
    setShowDiscardDialog(false);
    setReviewDirty(false);
    onOpenChange(false);
  };

  // ── Fax-specific state ──
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [splitBanner, setSplitBanner] = useState<{ count: number } | null>(null);

  const { lockDocument, unlockDocument, isLockedByOther: lockedByOtherRaw, lockedByUser: lockedUserRaw } = useLock(faxId ?? "");
  const lockedByOther = faxId ? lockedByOtherRaw : false;
  const lockedUser = faxId ? lockedUserRaw : null;

  // ── Referral-specific state ──
  const [activeTab, setActiveTab] = useState<"review" | "comms" | "timeline">("review");
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [completenessItems, setCompletenessItems] = useState(referral?.completenessItems || []);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<"fax" | "email" | undefined>(undefined);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientSearchFocused, setPatientSearchFocused] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(referral?.patientId || "");
  const [providerQuery, setProviderQuery] = useState("");
  const [providerSearchFocused, setProviderSearchFocused] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"document" | "review">("document");

  // Provider inbox (Cerebrum routing) state
  const [inboxQuery, setInboxQuery] = useState("");
  const [selectedInboxId, setSelectedInboxId] = useState<string>(referral?.assignedCardiologist || "inbox-1");
  const [inboxSearchFocused, setInboxSearchFocused] = useState(false);

  // Decline referral state
  const [declineConfirmPending, setDeclineConfirmPending] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return simulatedPatients.slice(0, 5);
    const q = patientQuery.toLowerCase();
    return simulatedPatients
      .filter((p) =>
        `${p.firstName} ${p.lastName} ${p.phn}`.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [patientQuery, simulatedPatients]);

  // Filter providers based on search query
  const filteredProviders = useMemo(() => {
    if (!providerQuery.trim()) return mockReferringProviders.slice(0, 5);
    const q = providerQuery.toLowerCase();
    return mockReferringProviders
      .filter((p) =>
        `${p.name} ${p.clinic}`.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [providerQuery]);

  // Filter provider inboxes based on search query
  const filteredInboxes = useMemo(() => {
    if (!inboxQuery.trim()) return providerInboxes;
    const q = inboxQuery.toLowerCase();
    return providerInboxes.filter((p) =>
      `${p.name} ${p.specialty}`.toLowerCase().includes(q)
    );
  }, [inboxQuery]);

  // Get selected inbox
  const selectedInbox = selectedInboxId
    ? providerInboxes.find((p) => p.id === selectedInboxId)
    : providerInboxes[0];

  // Resolve PDF URL for referral mode — prefer current document's pdfUrl, then fax lookup
  const referralPdfUrl = useMemo(() => {
    if (!referral) return undefined;
    // Per-document pdfUrl takes priority (for multi-document referrals)
    const doc = referral.documents[selectedDocIndex];
    if (doc?.pdfUrl) return doc.pdfUrl;
    // If we already have the fax loaded (synthetic case or faxId passed)
    if (fax?.pdfUrl) return fax.pdfUrl;
    // Look up fax by referral's faxId for mock referrals
    const linkedFax = faxes.find((f) => f.id === referral.faxId);
    return linkedFax?.pdfUrl;
  }, [referral, fax, faxes, selectedDocIndex]);

  // ── Reset state on id changes ──
  useEffect(() => {
    setCurrentPageIndex(0);
    setSplitBanner(null);
    setReviewDirty(false);
  }, [faxId]);

  useEffect(() => {
    setActiveTab("review");
    setSelectedDocIndex(0);
    setSelectedPageIndex(0);
    setIsComposeOpen(false);
    setComposeChannel(undefined);
    if (referral) {
      setCompletenessItems(referral.completenessItems);
      setSelectedPatientId(referral.patientId || "");
    }
  }, [referralId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fax lock management ──
  useEffect(() => {
    if (open && faxId && fax && !lockedByOther) {
      lockDocument(faxId);
    }
    return () => {
      if (faxId) {
        unlockDocument(faxId);
      }
    };
  }, [open, faxId, fax, lockDocument, unlockDocument, lockedByOther]);

  // ── Referral computed values ──
  const allPages = useMemo(() => {
    if (!referral) return [];
    return referral.documents.flatMap((doc, docIndex) =>
      doc.pages.map((page, pageIndex) => ({ doc, page, docIndex, pageIndex }))
    );
  }, [referral]);

  const currentDoc = referral?.documents[selectedDocIndex];
  const currentPage = currentDoc?.pages[selectedPageIndex];
  const totalPages = allPages.length;

  const globalPageIndex = useMemo(() => {
    if (!referral) return 0;
    let idx = 0;
    for (let i = 0; i < selectedDocIndex; i++) {
      idx += referral.documents[i].pages.length;
    }
    return idx + selectedPageIndex;
  }, [referral, selectedDocIndex, selectedPageIndex]);

  const currentStatusIndex = referral ? STATUS_ORDER.indexOf(referral.status) : 0;

  const isUnknownPatient = !selectedPatientId;
  const selectedPatient = selectedPatientId ? simulatedPatients.find((p) => p.id === selectedPatientId) : null;
  const displayPatientName = selectedPatient
    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
    : referral?.patientName || "Unknown Patient";

  // Build a Fax-like object from the current referral document so SplitDialog can work with it
  const splitFax = useMemo((): Fax | null => {
    if (!referral || !currentDoc) return null;
    return {
      id: currentDoc.faxId || referral.faxId,
      receivedAt: currentDoc.receivedAt || referral.receivedDate,
      pageCount: currentDoc.pageCount,
      pages: currentDoc.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        contentDescription: p.detectedContent,
      })),
      priority: referral.priority,
      senderName: referral.referringPhysicianName,
      senderFaxNumber: referral.referringPhysicianFax || "",
      faxLineId: "",
      documentCategory: currentDoc.type,
      classificationConfidenceScore: referral.aiConfidence,
      patientId: referral.patientId,
      patientName: referral.patientName,
      patientMatchStatus: referral.patientId ? "matched" : "not-found",
      manuallyEditedFields: [],
      status: "pending-review",
      classificationStage: ClassificationStage.Unfiled,
      classificationStatus: ClassificationStatus.NeedsReview,
      slaDeadline: new Date(new Date(referral.receivedDate).getTime() + 8 * 60 * 60 * 1000).toISOString(),
      pdfUrl: currentDoc.pdfUrl,
      providers: [],
    };
  }, [referral, currentDoc]);

  const completenessScore = completenessItems.length > 0
    ? Math.round(
        (completenessItems.filter((i) => i.status === "found").length /
          completenessItems.length) *
          100
      )
    : 0;

  // ── Referral handlers ──
  const goToPrevPage = () => {
    if (selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    } else if (selectedDocIndex > 0 && referral) {
      const prevDoc = referral.documents[selectedDocIndex - 1];
      setSelectedDocIndex(selectedDocIndex - 1);
      setSelectedPageIndex(prevDoc.pages.length - 1);
    }
  };

  const goToNextPage = () => {
    if (currentDoc && selectedPageIndex < currentDoc.pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
    } else if (referral && selectedDocIndex < referral.documents.length - 1) {
      setSelectedDocIndex(selectedDocIndex + 1);
      setSelectedPageIndex(0);
    }
  };

  const selectPage = (docIndex: number, pageIndex: number) => {
    setSelectedDocIndex(docIndex);
    setSelectedPageIndex(pageIndex);
  };

  const handleViewPage = (pageNumber: number) => {
    if (!referral) return;
    let foundDocIndex = 0;
    let foundPageIndex = pageNumber - 1;
    for (let i = 0; i < referral.documents.length; i++) {
      if (foundPageIndex < referral.documents[i].pages.length) {
        foundDocIndex = i;
        break;
      }
      foundPageIndex -= referral.documents[i].pages.length;
    }
    setSelectedDocIndex(foundDocIndex);
    setSelectedPageIndex(foundPageIndex);
  };

  const handleMarkFound = (itemId: string, pageNumber?: number) => {
    setCompletenessItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, status: "found" as const, pageNumber } : item)
    );
    if (pageNumber) {
      setSelectedPageIndex(pageNumber - 1);
    }
    toast.success(`Item marked as found${pageNumber ? ` on page ${pageNumber}` : ""}`);
  };

  const handleMarkMissing = (itemId: string) => {
    setCompletenessItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, status: "missing" as const } : item)
    );
  };

  const handleUnmarkFound = (itemId: string) => {
    setCompletenessItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, status: "missing" as const } : item)
    );
  };

  const handleRequestMissingItems = () => {
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

    // Update completeness items to mark as requested
    setCompletenessItems((prev) =>
      prev.map((item) =>
        data.selectedItems.includes(item.id)
          ? { ...item, requestedAt: now }
          : item
      )
    );

    // Upsert the referral with new communication and timeline event
    // Communications: add to end (chronological - newest at bottom)
    // Timeline: add to beginning (reverse chronological - newest at top)
    upsertReferral({
      ...referral,
      communications: [...referral.communications, newComm],
      timeline: [timelineEvent, ...referral.timeline],
      pendingCommunicationsCount: referral.pendingCommunicationsCount + 1,
      updatedAt: now,
    });
  };

  const handleAccept = () => {
    toast.success("Referral routed to Cerebrum");
    onOpenChange(false);
  };

  const handleSaveReferral = () => {
    toast.success("Referral review saved");
  };

  const handleCompleteReferral = () => {
    // Update or create fax with completed status
    const faxId = referral?.faxId || `fax-ref-${referral?.id}`;
    const existingFax = faxes.find((f) => f.id === faxId);
    const targetInbox = selectedInbox?.name || "Dr. Anika Patel";

    if (existingFax) {
      updateFax({
        id: faxId,
        updates: {
          status: "completed",
          completedAt: new Date().toISOString(),
          sortedBy: "Sarah Mitchell",
          forwardedTo: "Cerebrum",
          providerInbox: targetInbox,
        },
      });
    } else if (referral) {
      // Create fax entry if it doesn't exist (for referrals without linked fax)
      addFax({
        id: faxId,
        receivedAt: referral.receivedDate,
        slaDeadline: new Date().toISOString(),
        pageCount: referral.documents[0]?.pageCount || 1,
        pages: [],
        priority: referral.priority,
        senderName: referral.clinicName || referral.referringPhysicianName,
        senderFaxNumber: referral.referringPhysicianFax || "",
        faxLineId: "main-line",
        documentCategory: "Referral",
        classificationConfidenceScore: referral.aiConfidence,
        patientName: referral.patientName,
        patientMatchStatus: referral.patientId ? "matched" : "not-found",
        manuallyEditedFields: [],
        status: "completed",
        classificationStage: ClassificationStage.ManuallyFiled,
        classificationStatus: ClassificationStatus.ManuallyClassified,
        completedAt: new Date().toISOString(),
        sortedBy: "Sarah Mitchell",
        forwardedTo: "Cerebrum",
        isReferral: true,
        referralId: referral.id,
        providerInbox: targetInbox,
        providers: [],
      });
    }
    toast.success("Referral completed and filed", {
      description: `Routed to ${targetInbox} • Synced to Cerebrum`,
    });
    onOpenChange(false);
  };

  const handleDeclineClick = () => {
    if (!declineConfirmPending) {
      // First click: show confirmation state
      setDeclineConfirmPending(true);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setDeclineConfirmPending(false), 3000);
    } else {
      // Second click: open the dialog
      setDeclineConfirmPending(false);
      setIsDeclineDialogOpen(true);
    }
  };

  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }
    // Update or create fax with completed status and decline note
    const faxId = referral?.faxId || `fax-ref-${referral?.id}`;
    const existingFax = faxes.find((f) => f.id === faxId);

    if (existingFax) {
      updateFax({
        id: faxId,
        updates: {
          status: "completed",
          completedAt: new Date().toISOString(),
          sortedBy: "Sarah Mitchell",
          forwardedTo: "Cerebrum",
          notes: `Referral declined: ${declineReason}`,
        },
      });
    } else if (referral) {
      // Create fax entry if it doesn't exist (for referrals without linked fax)
      addFax({
        id: faxId,
        receivedAt: referral.receivedDate,
        slaDeadline: new Date().toISOString(),
        pageCount: referral.documents[0]?.pageCount || 1,
        pages: [],
        priority: referral.priority,
        senderName: referral.clinicName || referral.referringPhysicianName,
        senderFaxNumber: referral.referringPhysicianFax || "",
        faxLineId: "main-line",
        documentCategory: "Referral",
        classificationConfidenceScore: referral.aiConfidence,
        patientName: referral.patientName,
        patientMatchStatus: referral.patientId ? "matched" : "not-found",
        manuallyEditedFields: [],
        status: "completed",
        classificationStage: ClassificationStage.ManuallyFiled,
        classificationStatus: ClassificationStatus.ManuallyClassified,
        completedAt: new Date().toISOString(),
        sortedBy: "Sarah Mitchell",
        forwardedTo: "Cerebrum",
        notes: `Referral declined: ${declineReason}`,
        isReferral: true,
        referralId: referral.id,
        providers: [],
      });
    }
    toast.success("Referral declined", {
      description: "Fax sent to provider • Routed by Sarah Mitchell • Synced to Cerebrum",
    });
    setIsDeclineDialogOpen(false);
    setDeclineReason("");
    onOpenChange(false);
  };

  // ── Guard ──
  if (!fax && !referral) return null;

  const title = isReferralMode
    ? `Referral for ${displayPatientName}`
    : `Fax from ${fax!.senderName}`;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="!flex !flex-col !p-0 !gap-0 overflow-hidden !inset-0 !translate-x-0 !translate-y-0 !max-w-none !rounded-none !border-0 md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 md:!max-w-[95vw] md:!h-[90vh] md:!rounded-lg md:!border"
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>

          {/* ── Fax: Lock warning banner ── */}
          {!isReferralMode && lockedByOther && lockedUser && (
            <div role="alert" className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm shrink-0">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Another user is currently working on this document.
                Changes you make may conflict with their work.
              </span>
            </div>
          )}

          {/* ── Header ── */}
          {isReferralMode ? (
            <div className="flex items-center justify-between border-b px-3 md:px-4 py-2 bg-card shrink-0">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-wrap">
                <span className="text-sm font-semibold truncate">{displayPatientName}</span>
                {isUnknownPatient && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                    Unknown
                  </Badge>
                )}
                <PriorityBadge priority={referral!.priority} />
                {referral!.pendingCommunicationsCount > 0 && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {referral!.pendingCommunicationsCount} awaiting
                  </Badge>
                )}
                <span className="hidden md:inline text-muted-foreground mx-1">·</span>
                <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                  <Stethoscope className="h-3 w-3" />
                  {referral!.referringPhysicianName}
                </span>
                <span className="hidden md:inline text-xs text-muted-foreground">{formatRelativeTime(referral!.receivedDate)}</span>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <nav className="hidden md:flex items-center gap-1">
                  {STATUS_STEPS.map((step, idx) => {
                    const stepIndex = STATUS_ORDER.indexOf(step.key);
                    const isActive = step.key === referral!.status;
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

                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b px-3 md:px-4 py-2 bg-card shrink-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <span className="text-sm font-medium truncate">{fax!.senderName}</span>
                <div className="hidden sm:block shrink-0">
                  <SlaTimerCell
                    deadline={fax!.slaDeadline}
                    receivedAt={fax!.receivedAt}
                    priority={fax!.priority}
                    faxStatus={fax!.status}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => {
                    const ids = [
                      `classification: ${fax!.classificationId ?? fax!.id}`,
                      `submission: ${fax!.submissionId ?? 'N/A'}`,
                      `job: ${fax!.jobId ?? 'N/A'}`,
                    ].join('\n')
                    navigator.clipboard.writeText(ids)
                    toast.success('IDs copied to clipboard')
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy IDs
                </Button>
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Split success banner ── */}
          {splitBanner && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm shrink-0">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Document split into {splitBanner.count} segments</span>
            </div>
          )}

          {/* ── Mobile view toggle ── */}
          <div className="flex md:hidden border-b shrink-0">
            <button
              type="button"
              className={cn(
                "flex-1 py-2.5 text-xs font-medium text-center border-b-2 transition-colors",
                mobileView === "document"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setMobileView("document")}
            >
              Document
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-2.5 text-xs font-medium text-center border-b-2 transition-colors",
                mobileView === "review"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setMobileView("review")}
            >
              Review
            </button>
          </div>

          {/* ── Desktop: 3-panel layout ── */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
            {/* Thumbnails */}
            {isReferralMode ? (
              <div className="w-24 flex-shrink-0 border-r bg-muted/30 overflow-y-auto p-2 space-y-2">
                {referral!.documents.map((doc, docIndex) => (
                  <div key={doc.id}>
                    <div className="px-1 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                        {doc.type === "original-referral" ? "Original" : doc.type === "response" ? "Response" : "Additional"}
                      </span>
                    </div>
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
            ) : (
              <div className="w-24 border-r bg-muted/30 p-2 space-y-2 overflow-auto shrink-0">
                {fax!.pages.map((page, index) => (
                  <PageThumbnail
                    key={page.id}
                    page={page}
                    isActive={index === currentPageIndex}
                    onClick={() => setCurrentPageIndex(index)}
                  />
                ))}
              </div>
            )}

            {/* Resizable: Document viewer + Right panel */}
            {/* Non-referral: 2/3-1/3 layout, Referral: 50-50 */}
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
              <ResizablePanel defaultSize={isReferralMode ? 50 : (triageMode ? 55 : 66)} minSize={30}>
                {isReferralMode ? (
                  <div className="flex flex-col h-full">
                    <DocumentViewer
                      currentPageIndex={globalPageIndex}
                      totalPages={totalPages}
                      onPrevPage={goToPrevPage}
                      onNextPage={goToNextPage}
                      pdfUrl={referralPdfUrl}
                      metadata={[
                        { label: "Document", value: currentDoc?.label || "" },
                        { label: "Page", value: `${currentPage?.pageNumber || 0} of ${currentDoc?.pageCount || 0}` },
                        { label: "Patient", value: referral!.patientName },
                        { label: "Physician", value: referral!.referringPhysicianName },
                      ]}
                      description={currentPage?.detectedContent}
                      showSignature={currentPage?.pageNumber === currentDoc?.pageCount}
                    />
                  </div>
                ) : (
                  <FaxPageViewer
                    fax={fax!}
                    currentPage={fax!.pages[currentPageIndex]}
                    onPageChange={setCurrentPageIndex}
                    currentPageIndex={currentPageIndex}
                    highlightRegion={highlightRegionProp}
                  />
                )}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={isReferralMode ? 50 : (triageMode ? 45 : 34)} minSize={25}>
                {isReferralMode ? (
                  <div className="bg-background flex flex-col overflow-hidden h-full">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
                      <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                        <TabsTrigger value="review" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <FileCheck className="h-4 w-4 mr-1.5" />
                          Review
                        </TabsTrigger>
                        <TabsTrigger value="comms" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 relative">
                          <MessageSquare className="h-4 w-4 mr-1.5" />
                          Comms
                          {referral!.pendingCommunicationsCount > 0 && (
                            <span className="absolute top-2 right-4 h-2 w-2 bg-amber-500" />
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Clock className="h-4 w-4 mr-1.5" />
                          Timeline
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="review" className="flex-1 flex flex-col overflow-hidden m-0">
                        <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {/* Patient Info */}
                        <div className="border rounded-sm p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-emerald-600" />
                              Patient
                            </h3>
                            {isUnknownPatient ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                Not in system
                              </Badge>
                            ) : selectedPatient && referral!.patientId === selectedPatientId ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                AI Matched
                              </Badge>
                            ) : selectedPatient && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                Override
                              </Badge>
                            )}
                          </div>

                          {/* Show AI-matched patient info prominently */}
                          {selectedPatient && referral!.patientId === selectedPatientId && (
                            <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-emerald-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-emerald-800">
                                    {selectedPatient.firstName} {selectedPatient.lastName}
                                  </p>
                                  <p className="text-xs text-emerald-600">
                                    {selectedPatient.gender === "M" ? "Male" : selectedPatient.gender === "F" ? "Female" : "Other"} · DOB: {selectedPatient.dateOfBirth} · {selectedPatient.phn}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Inline patient search */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={patientQuery}
                              onChange={(e) => setPatientQuery(e.target.value)}
                              onFocus={() => setPatientSearchFocused(true)}
                              onBlur={() => setTimeout(() => setPatientSearchFocused(false), 150)}
                              placeholder={selectedPatient
                                ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                                : referral!.patientName || "Search patients..."}
                              className="h-8 text-xs pl-8"
                            />
                            {selectedPatient && referral!.patientId === selectedPatientId && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600">
                                Override AI
                              </span>
                            )}

                            {patientSearchFocused && (
                              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                                {filteredPatients.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">No patients found</div>
                                ) : (
                                  filteredPatients.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className={cn(
                                        "w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2",
                                        selectedPatientId === p.id && "bg-muted"
                                      )}
                                      onMouseDown={() => {
                                        setSelectedPatientId(p.id);
                                        setPatientQuery("");
                                        const isOverride = referral!.patientId && referral!.patientId !== p.id;
                                        toast.success(`Linked to ${p.firstName} ${p.lastName}${isOverride ? " (override)" : ""}`);
                                      }}
                                    >
                                      {selectedPatientId === p.id && <Check className="h-3 w-3 text-emerald-600" />}
                                      <div className={selectedPatientId !== p.id ? "ml-5" : ""}>
                                        <div className="font-medium">{p.firstName} {p.lastName}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {p.gender === "M" ? "M" : p.gender === "F" ? "F" : "X"} · DOB: {p.dateOfBirth} · {p.phn}
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Show manually overridden patient info */}
                          {selectedPatient && referral!.patientId !== selectedPatientId && (
                            <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-md">
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mb-1.5">
                                <AlertTriangle className="h-3 w-3" />
                                Manual override (was: {referral!.patientName})
                              </div>
                              <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                <div className="flex justify-between">
                                  <span>Gender</span>
                                  <span>{selectedPatient.gender === "M" ? "Male" : selectedPatient.gender === "F" ? "Female" : "Other"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>DOB</span>
                                  <span>{selectedPatient.dateOfBirth}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>PHN</span>
                                  <span className="font-mono">{selectedPatient.phn}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Create in Cerebrum option for unknown patients */}
                          {isUnknownPatient && (
                            <>
                              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-md">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">
                                      {referral!.patientName || "Unknown Patient"}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                      Patient not found in database
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  toast.success("Opening Cerebrum to create new patient...");
                                }}
                              >
                                <UserPlus className="h-3 w-3 mr-1.5" />
                                Create Patient in Cerebrum
                                <ExternalLink className="h-3 w-3 ml-auto" />
                              </Button>
                            </>
                          )}

                          {/* Additional patient details when AI-matched (shown below the highlight) */}
                          {selectedPatient && referral!.patientId === selectedPatientId && selectedPatient.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {selectedPatient.conditions.map((condition, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] h-5 font-normal">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Referring Provider */}
                        <div className="border rounded-sm p-3 space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-1.5">
                              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                              Referring Provider
                            </h3>
                            {!selectedProviderId && referral!.referringPhysicianName && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                AI Matched
                              </Badge>
                            )}
                          </div>

                          {/* Show AI-matched provider info with override warning */}
                          {!selectedProviderId && referral!.referringPhysicianName && (
                            <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <Stethoscope className="h-4 w-4 text-emerald-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-emerald-800">
                                    {referral!.referringPhysicianName}
                                  </p>
                                  <p className="text-xs text-emerald-600">
                                    {referral!.clinicName}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Inline provider search */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={providerQuery}
                              onChange={(e) => setProviderQuery(e.target.value)}
                              onFocus={() => setProviderSearchFocused(true)}
                              onBlur={() => setTimeout(() => setProviderSearchFocused(false), 150)}
                              placeholder={selectedProviderId
                                ? mockReferringProviders.find(p => p.id === selectedProviderId)?.name
                                : "Search to override..."}
                              className="h-8 text-xs pl-8"
                            />
                            {!selectedProviderId && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600">
                                Override AI
                              </span>
                            )}

                            {providerSearchFocused && (
                              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                                {filteredProviders.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">No providers found</div>
                                ) : (
                                  filteredProviders.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className={cn(
                                        "w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2",
                                        selectedProviderId === p.id && "bg-muted"
                                      )}
                                      onMouseDown={() => {
                                        setSelectedProviderId(p.id);
                                        setProviderQuery("");
                                        toast.success(`Linked to ${p.name} (override)`);
                                      }}
                                    >
                                      {selectedProviderId === p.id && <Check className="h-3 w-3 text-emerald-600" />}
                                      <div className={selectedProviderId !== p.id ? "ml-5" : ""}>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {p.clinic} · {p.specialty}
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Show selected provider details (when manually overridden) */}
                          {selectedProviderId && (() => {
                            const provider = mockReferringProviders.find((p) => p.id === selectedProviderId);
                            return provider && (
                              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-md">
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mb-1.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  Manual override (was: {referral!.referringPhysicianName})
                                </div>
                                <p className="text-sm font-medium">{provider.name}</p>
                                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                  <p>Clinic: {provider.clinic}</p>
                                  <p>Fax: <FormattedValue raw={provider.faxNumber} formatted={formatPhone(provider.faxNumber)} /></p>
                                  {provider.specialty && <p>Specialty: {provider.specialty}</p>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Provider Inbox (Cerebrum Routing) */}
                        <div className="border rounded-sm p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-1.5">
                              <Inbox className="h-3.5 w-3.5 text-violet-600" />
                              Send To (Cerebrum)
                            </h3>
                          </div>

                          {/* Current selection display */}
                          {selectedInbox && (
                            <div className="p-2.5 bg-violet-50/50 border border-violet-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <Inbox className="h-4 w-4 text-violet-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-violet-800">
                                    {selectedInbox.name}
                                  </p>
                                  <p className="text-xs text-violet-600">
                                    {selectedInbox.specialty} · {selectedInbox.availability}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Inline search */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={inboxQuery}
                              onChange={(e) => setInboxQuery(e.target.value)}
                              onFocus={() => setInboxSearchFocused(true)}
                              onBlur={() => setTimeout(() => setInboxSearchFocused(false), 150)}
                              placeholder={selectedInbox?.name || "Search provider inbox..."}
                              className="h-8 text-xs pl-8"
                            />

                            {/* Dropdown results */}
                            {inboxSearchFocused && (
                              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                                {filteredInboxes.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">No inboxes found</div>
                                ) : (
                                  filteredInboxes.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className={cn(
                                        "w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2",
                                        selectedInboxId === p.id && "bg-muted"
                                      )}
                                      onMouseDown={() => {
                                        setSelectedInboxId(p.id);
                                        setInboxQuery("");
                                        toast.success(`Will route to ${p.name}`);
                                      }}
                                    >
                                      {selectedInboxId === p.id && <Check className="h-3 w-3 text-violet-600" />}
                                      <div className={selectedInboxId !== p.id ? "ml-5" : ""}>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {p.specialty} · {p.availability}
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border rounded-sm p-3 space-y-3">
                          <h3 className="text-sm font-medium">Reason for Referral</h3>
                          <p className="text-sm text-muted-foreground">{referral!.reasonForReferral}</p>
                          {referral!.conditions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conditions</p>
                              <div className="flex flex-wrap gap-1">
                                {referral!.conditions.map((condition, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px] h-5 font-normal">
                                    {condition}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {referral!.medications.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Medications</p>
                              <div className="flex flex-wrap gap-1">
                                {referral!.medications.map((medication, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] h-5 font-normal">
                                    {medication}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <CompletenessPanel
                          items={completenessItems}
                          score={completenessScore}
                          aiConfidence={referral!.aiConfidence}
                          pageCount={currentDoc?.pageCount || 1}
                          onViewPage={handleViewPage}
                          onRequestMissingItems={handleRequestMissingItems}
                          onMarkFound={handleMarkFound}
                          onMarkMissing={handleMarkMissing}
                          onUnmarkFound={handleUnmarkFound}
                        />

                        {referral!.assignedCardiologistName && (
                          <div className="border rounded-sm p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Assigned to</p>
                            <p className="text-sm font-medium">{referral!.assignedCardiologistName}</p>
                            {referral!.appointmentDate && (
                              <div className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Appointment: {referral!.appointmentDate}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {referral!.status !== "routed-to-cerebrum" && completenessScore === 100 && (
                          <div className="border-t pt-4">
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAccept}>
                              <ArrowUpRight className="h-4 w-4 mr-1.5" />
                              Route to Cerebrum
                            </Button>
                          </div>
                        )}
                        </div>

                        {/* Footer with action buttons */}
                        <div className="border-t p-3 shrink-0 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleSaveReferral}
                            >
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleCompleteReferral}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Complete & File
                            </Button>
                          </div>
                          {currentDoc && currentDoc.pageCount > 1 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => setIsSplitOpen(true)}
                            >
                              <Scissors className="h-3.5 w-3.5 mr-1.5" />
                              Split Document
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full h-8 text-xs",
                              declineConfirmPending
                                ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                                : "text-muted-foreground hover:text-red-600 hover:border-red-200"
                            )}
                            onClick={handleDeclineClick}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            {declineConfirmPending ? "Click again to confirm" : "Decline Referral"}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="comms" className="flex-1 overflow-hidden m-0">
                        <CommunicationsThread
                          communications={referral!.communications}
                          documents={referral!.documents}
                          recipientName={referral!.referringPhysicianName}
                          recipientClinic={referral!.clinicName}
                          recipientCity={referral!.clinicCity}
                          recipientPhone={referral!.referringPhysicianPhone}
                          recipientFax={referral!.referringPhysicianFax}
                          recipientEmail={referral!.referringPhysicianEmail}
                          onViewDocument={(docId) => {
                            const docIdx = referral!.documents.findIndex((d) => d.id === docId);
                            if (docIdx >= 0) {
                              setSelectedDocIndex(docIdx);
                              setSelectedPageIndex(0);
                              setActiveTab("review");
                            }
                          }}
                          onSendFax={() => handleOpenCompose("fax")}
                          onEmail={() => handleOpenCompose("email")}
                        />
                      </TabsContent>

                      <TabsContent value="timeline" className="flex-1 overflow-y-auto m-0 p-4">
                        <div className="space-y-4">
                          {[...referral!.timeline].sort((a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                          ).map((event) => (
                            <div key={event.id} className="flex gap-3 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                              <div>
                                <p className="font-medium">{event.title}</p>
                                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                                <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(event.timestamp)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : triageMode && triageChecklist ? (
                  <div className="h-full overflow-auto">{triageChecklist}</div>
                ) : (
                  <ReviewPanel
                    fax={fax!}
                    onClose={() => { setReviewDirty(false); onOpenChange(false); }}
                    onDirtyChange={setReviewDirty}
                    onSplitComplete={(newFaxIds) => {
                      if (onSplitComplete && faxId) {
                        onOpenChange(false);
                        onSplitComplete(faxId, newFaxIds);
                      } else {
                        setSplitBanner({ count: newFaxIds.length });
                        setTimeout(() => setSplitBanner(null), 3000);
                      }
                    }}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* ── Mobile: single panel at a time ── */}
          <div className="flex md:hidden flex-1 min-h-0 overflow-hidden">
            {mobileView === "document" ? (
              isReferralMode ? (
                <div className="flex flex-col h-full w-full">
                  <DocumentViewer
                    currentPageIndex={globalPageIndex}
                    totalPages={totalPages}
                    onPrevPage={goToPrevPage}
                    onNextPage={goToNextPage}
                    pdfUrl={referralPdfUrl}
                    metadata={[
                      { label: "Document", value: currentDoc?.label || "" },
                      { label: "Page", value: `${currentPage?.pageNumber || 0} of ${currentDoc?.pageCount || 0}` },
                      { label: "Patient", value: referral!.patientName },
                      { label: "Physician", value: referral!.referringPhysicianName },
                    ]}
                    description={currentPage?.detectedContent}
                    showSignature={currentPage?.pageNumber === currentDoc?.pageCount}
                  />
                </div>
              ) : (
                <FaxPageViewer
                  fax={fax!}
                  currentPage={fax!.pages[currentPageIndex]}
                  onPageChange={setCurrentPageIndex}
                  currentPageIndex={currentPageIndex}
                />
              )
            ) : (
              triageMode && triageChecklist ? (
                <div className="h-full overflow-auto">{triageChecklist}</div>
              ) : fax ? (
                <ReviewPanel
                  fax={fax}
                  onClose={() => { setReviewDirty(false); onOpenChange(false); }}
                  onDirtyChange={setReviewDirty}
                  onSplitComplete={(newFaxIds) => {
                    if (onSplitComplete && faxId) {
                      onOpenChange(false);
                      onSplitComplete(faxId, newFaxIds);
                    } else {
                      setSplitBanner({ count: newFaxIds.length });
                      setTimeout(() => setSplitBanner(null), 3000);
                    }
                  }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
                  Open on a larger screen for full review
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SplitDialog for referral documents */}
      {isReferralMode && splitFax && (
        <SplitDialog
          fax={splitFax}
          open={isSplitOpen}
          onOpenChange={setIsSplitOpen}
          onSplitComplete={(newFaxIds) => {
            setIsSplitOpen(false);
            setSplitBanner({ count: newFaxIds.length });
            setTimeout(() => setSplitBanner(null), 3000);
            if (onSplitComplete && faxId) {
              onSplitComplete(faxId, newFaxIds);
            }
          }}
        />
      )}

      {/* ComposeSlideOver — rendered outside Dialog to avoid transform context issues */}
      {isReferralMode && referral && (
        <ComposeSlideOver
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          recipientName={referral.referringPhysicianName}
          recipientClinic={referral.clinicName}
          recipientFax={referral.referringPhysicianFax}
          recipientPhone={referral.referringPhysicianPhone}
          recipientEmail={referral.referringPhysicianEmail}
          missingItems={completenessItems.filter((i) => i.status === "missing")}
          preSelectedChannel={composeChannel}
          onSend={handleComposeSend}
        />
      )}

      {/* Decline Referral Dialog */}
      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Decline Referral
            </DialogTitle>
            <DialogDescription>
              A fax will be sent to {referral?.referringPhysicianName || "the referring provider"} explaining why this referral was declined.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="decline-reason">Reason for declining</Label>
              <Textarea
                id="decline-reason"
                placeholder="e.g., Patient outside service area, Not accepting new patients for this condition, Referral incomplete..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            </div>
            <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground">
              <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>This will send a fax to the provider and sync the decline to Cerebrum.</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeclineDialogOpen(false);
                setDeclineReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeclineSubmit}
              disabled={!declineReason.trim()}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Decline & Send Fax
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard unsaved changes confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you close this dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
