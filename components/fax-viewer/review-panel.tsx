"use client";

import { ClassificationStage, ClassificationStatus, Fax } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityBadge } from "@/components/inbox/priority-badge";
import { StatusBadge } from "@/components/inbox/status-badge";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { updateFaxAtom, faxesAtom } from "@/atoms/inbox";
import { orgCategoriesAtom } from "@/atoms/organization";
import { useSetAtom, useAtomValue } from "jotai";
import { toast } from "sonner";
import { CALLOUT_COLORS, LOCK_COLORS } from "@/lib/constants";
import { Callout } from "@/components/shared/callout";
import { ComposeSlideOver } from "@/components/referral/compose-slide-over";
import { SplitDialog } from "@/components/fax-viewer/split-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { calculateSlaDeadline } from "@/lib/sla";
import { ActionResult } from "@/lib/action-result";
import { saveClassification, saveClassificationReview, saveClassificationProviders, requestFiling, rerunJob, fetchClassifications, fetchPatients, fetchProviders, PatientRow, ProviderRow } from "@/app/actions/fax";
import { handleActionError } from "@/lib/handle-action-error";
import { formatHealthCard, formatPatientName } from "@/lib/supabase/mappers";
import { tokenizedMatch } from "@/lib/search";
import { FormattedValue } from "@/components/shared/formatted-value";
import { formatPhone } from "@/lib/format";

// SLA minutes per priority
const SLA_MINUTES: Record<"normal" | "abnormal", number> = {
  abnormal: 120, // 2 hours
  normal: 480, // 8 hours
};
import {
  Save,
  CheckCircle2,
  Check,
  Send,
  Scissors,
  Lock,
  Bot,
  Loader2,
  ArrowRight,
  User,
  Stethoscope,
  Search,
  FileText,
  Settings2,
  AlertTriangle,
  ExternalLink,
  Plus,
  X,
  Zap,
  ChevronDown,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ReviewPanelProps {
  fax: Fax;
  onSplitComplete?: (newFaxIds: string[]) => void;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

// Map missing field labels to data-field attribute values
const FIELD_ATTR_MAP: Record<string, string> = {
  "Description": "description",
  "Category": "category",
  "Document Date": "document-date",
  "Patient": "patient",
  "Provider": "provider",
  "Priority": "priority",
};

const IS_DEV =
  (process.env.NEXT_PUBLIC_NODE_ENV || "production") === "development";

export function ReviewPanel({ fax, onSplitComplete, onClose, onDirtyChange }: ReviewPanelProps) {
  const router = useRouter();
  const updateFax = useSetAtom(updateFaxAtom);
  const setFaxes = useSetAtom(faxesAtom);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Real patients and providers from Supabase
  const [dbPatients, setDbPatients] = useState<PatientRow[]>([]);
  const [dbProviders, setDbProviders] = useState<ProviderRow[]>([]);

  // Organization context from global atom (set by useOrganization hook)
  const documentCategories = useAtomValue(orgCategoriesAtom);

  useEffect(() => {
    fetchPatients().then((result) => {
      if (result.success) setDbPatients(result.data);
      else handleActionError(result);
    });
    fetchProviders().then((result) => {
      if (result.success) setDbProviders(result.data);
      else handleActionError(result);
    });
  }, []);
  const [docCategory, setDocCategory] = useState(fax.documentCategory || "");
  const [description, setDescription] = useState(fax.description || "");
  const [priority, setPriority] = useState(fax.priority);
  const [documentDate, setDocumentDate] = useState(fax.documentDate || "");
  const [notes, setNotes] = useState(fax.notes || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);

  // Patient search state
  const [patientQuery, setPatientQuery] = useState("");
  const [patientHighlightIndex, setPatientHighlightIndex] = useState(-1);
  const [selectedPatientId, setSelectedPatientId] = useState(fax.patientId || "");
  const [patientSearchFocused, setPatientSearchFocused] = useState(false);
  const [patientVisibleCount, setPatientVisibleCount] = useState(5);

  // Multi-provider state: set of provider IDs currently attached
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(
    () => new Set(fax.providers.map((p) => p.providerId))
  );
  const [providerQuery, setProviderQuery] = useState("");
  const [providerSearchFocused, setProviderSearchFocused] = useState(false);
  const [providerHighlightIndex, setProviderHighlightIndex] = useState(-1);


  // Filter patients based on search query, always including the currently selected patient
  const filteredPatients = useMemo(() => {
    let results: typeof dbPatients;
    if (!patientQuery.trim()) {
      results = dbPatients;
    } else {
      results = dbPatients.filter((p) =>
        tokenizedMatch(
          `${formatPatientName(p.name)} ${p.name} ${formatHealthCard(p.health_card_version, p.health_card_number) ?? ""}`,
          patientQuery
        )
      );
    }
    // Ensure the currently selected patient always appears
    if (selectedPatientId && !results.some((p) => p.id === selectedPatientId)) {
      const current = dbPatients.find((p) => p.id === selectedPatientId);
      if (current) results = [current, ...results];
    }
    return results;
  }, [patientQuery, dbPatients, selectedPatientId]);

  // Filter providers: exclude already-selected ones from dropdown
  const filteredProviders = useMemo(() => {
    const available = dbProviders.filter((p) => !selectedProviderIds.has(p.id));
    if (!providerQuery.trim()) {
      return available.slice(0, 5);
    }
    return available
      .filter((p) =>
        tokenizedMatch(`${p.name} ${p.title ?? ""}`, providerQuery)
      )
      .slice(0, 5);
  }, [providerQuery, dbProviders, selectedProviderIds]);

  // Get selected patient + resolve provider details
  const selectedPatient = selectedPatientId
    ? dbPatients.find((p) => p.id === selectedPatientId)
    : null;
  // Resolve provider details for the selected set
  const selectedProviderDetails = useMemo(() => {
    return [...selectedProviderIds]
      .map((id) => {
        const db = dbProviders.find((p) => p.id === id);
        const faxProvider = fax.providers.find((p) => p.providerId === id);
        return db ? { id: db.id, name: db.name, title: db.title, source: faxProvider?.source ?? 'manual' as const, confidenceScore: faxProvider?.confidenceScore } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; title: string | null; source: 'ai' | 'manual'; confidenceScore?: number }>;
  }, [selectedProviderIds, dbProviders, fax.providers]);

  // Check if this is a referral type
  const isReferralType = fax.isReferral ?? false;

  const removeSelectedProvider = (id: string) => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  // Check if provider set changed
  const originalProviderIds = new Set(fax.providers.map((p) => p.providerId));
  const providersChanged =
    selectedProviderIds.size !== originalProviderIds.size ||
    [...selectedProviderIds].some((id) => !originalProviderIds.has(id));

  const hasClassificationChanges =
    priority !== fax.priority ||
    docCategory !== (fax.documentCategory || "") ||
    description !== (fax.description || "") ||
    documentDate !== (fax.documentDate || "") ||
    providersChanged ||
    (selectedPatientId !== (fax.patientId || ""));

  const hasChanges =
    hasClassificationChanges ||
    notes !== (fax.notes || "");

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const isFailed = fax.status === "failed";

  const scrollToMissingFields = useCallback((missingFields: string[]) => {
    const container = scrollContainerRef.current;
    if (!container || missingFields.length === 0) return;

    // Find the first missing field element and scroll to it
    const firstAttr = FIELD_ATTR_MAP[missingFields[0]];
    const firstEl = firstAttr ? container.querySelector(`[data-field="${firstAttr}"]`) as HTMLElement | null : null;
    if (firstEl) {
      firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Highlight all missing field elements
    for (const field of missingFields) {
      const attr = FIELD_ATTR_MAP[field];
      if (!attr) continue;
      const el = container.querySelector(`[data-field="${attr}"]`) as HTMLElement | null;
      if (el) {
        el.classList.add("animate-field-shake", "field-attention");
        setTimeout(() => {
          el.classList.remove("animate-field-shake", "field-attention");
        }, 2000);
      }
    }
  }, []);

  const handleSave = async () => {
    if (!fax.classificationId) {
      toast.error("Cannot save: no classification ID");
      return;
    }
    setIsSaving(true);

    const patientIdToSave = selectedPatientId || undefined;
    const allProviderIds = [...selectedProviderIds];

    // Save all content fields via the server review endpoint (handles manually_edited_fields server-side)
    const reviewResult = await saveClassificationReview(fax.classificationId, {
      priority,
      document_category: docCategory || undefined,
      notes: notes || undefined,
      patient_id: patientIdToSave ?? null,
      description: description || undefined,
      document_date: documentDate || undefined,
    });

    // Save providers via junction table
    const providerResult = await saveClassificationProviders(fax.classificationId, allProviderIds);

    // Only update lifecycle status if classification fields were changed (not just notes)
    let lifecycleResult: ActionResult<any> = { success: true, data: null };
    if (hasClassificationChanges) {
      lifecycleResult = await saveClassification(fax.classificationId, {
        classification_status: ClassificationStatus.ManuallyClassified,
      });
    }

    setIsSaving(false);
    if (reviewResult.success && providerResult.success && lifecycleResult.success) {
      const newDeadline = calculateSlaDeadline(
        fax.receivedAt,
        SLA_MINUTES[priority]
      );
      updateFax({
        id: fax.id,
        updates: {
          priority,
          documentCategory: docCategory || undefined,
          description: description || undefined,
          slaDeadline: newDeadline,
          patientId: patientIdToSave,
        },
      });
      toast.success("Review saved successfully");
      // Re-fetch full dataset so inbox reflects joined patient/provider data
      fetchClassifications().then((r) => { if (r.success) setFaxes(r.data); });
      onClose?.();
    } else {
      const failed = !reviewResult.success ? reviewResult : !providerResult.success ? providerResult : lifecycleResult;
      if (!failed.success) handleActionError(failed);
    }
  };

  const handleComplete = async () => {
    if (isReferralType) {
      handleSubmitForAIProcessing();
      return;
    }

    if (!fax.classificationId) {
      toast.error("Cannot file: no classification ID");
      return;
    }
    if (isFailed && !docCategory) {
      toast.error("Document category is required for failed faxes");
      return;
    }

    // Filing guard: all required fields must be present
    const missingFields: string[] = [];
    if (!description) missingFields.push("Description");
    if (!docCategory) missingFields.push("Category");
    if (!documentDate) missingFields.push("Document Date");
    if (!selectedPatientId) missingFields.push("Patient");
    if (!IS_DEV && selectedProviderIds.size === 0) missingFields.push("Provider");
    if (!priority) missingFields.push("Priority");

    if (missingFields.length > 0) {
      toast.error(`Cannot file: missing ${missingFields.join(", ")}`);
      scrollToMissingFields(missingFields);
      return;
    }

    setIsProcessing(true);

    const patientIdToSave = selectedPatientId || fax.patientId || undefined;
    const allProviderIds = [...selectedProviderIds];

    // Save all content fields via the server review endpoint
    const reviewResult = await saveClassificationReview(fax.classificationId, {
      priority,
      document_category: docCategory || undefined,
      notes: notes || undefined,
      patient_id: patientIdToSave ?? null,
      description: description || undefined,
      document_date: documentDate || undefined,
    });

    // Save providers via junction table
    const providerResult = await saveClassificationProviders(fax.classificationId, allProviderIds);

    if (!reviewResult.success || !providerResult.success) {
      setIsProcessing(false);
      const failed = !reviewResult.success ? reviewResult : providerResult;
      if (!failed.success) handleActionError(failed);
      return;
    }

    // Determine if user made edits (server tells us via changed_fields, plus check providers)
    const hasEdits = (reviewResult.data.changed_fields.length > 0) || providersChanged;
    const previousClassificationStage = fax.classificationStage;

    // Save lifecycle fields
    const lifecycleUpdates: { classification_stage: string; classification_status?: string } = {
      classification_stage: ClassificationStage.FilingInProgress,
    };
    if (hasEdits) {
      lifecycleUpdates.classification_status = ClassificationStatus.ManuallyClassified;
    }

    const lifecycleResult = await saveClassification(fax.classificationId, lifecycleUpdates);

    if (!lifecycleResult.success) {
      setIsProcessing(false);
      handleActionError(lifecycleResult);
      return;
    }

    // All saves succeeded — close modal immediately with "Filing" animation
    setIsProcessing(false);

    updateFax({
      id: fax.id,
      updates: {
        classificationStage: ClassificationStage.FilingInProgress,
        processingState: 'filing',
        ...(hasEdits
          ? { classificationStatus: ClassificationStatus.ManuallyClassified, status: "manually-classified" as const }
          : {}),
        documentCategory: docCategory,
        description: description || undefined,
        priority,
        notes,
      },
    });

    toast.success("Filing to EMR in progress...", {
      description: `${docCategory} — RPA will file this fax automatically`,
    });
    onClose?.();

    // Fire-and-forget: request RPA filing in background
    const classId = fax.classificationId!;
    if (fax.submissionId) {
      requestFiling(classId, fax.submissionId).then(async (filingResult) => {
        if (!filingResult.success) {
          const errorMsg = filingResult.error || 'Filing request failed';
          const rollbackResult = await saveClassification(classId, {
            classification_stage: previousClassificationStage,
          });

          if (!rollbackResult.success) {
            handleActionError(rollbackResult);
          } else {
            updateFax({
              id: fax.id,
              updates: {
                classificationStage: previousClassificationStage,
                processingState: undefined,
              },
            });
          }

          toast.warning("Filing request failed", { description: errorMsg });
          fetchClassifications().then((r) => { if (r.success) setFaxes(r.data); });
        }
      });
    } else {
      await saveClassification(classId, {
        classification_stage: previousClassificationStage,
      });
      updateFax({
        id: fax.id,
        updates: {
          classificationStage: previousClassificationStage,
          processingState: undefined,
        },
      });
      toast.warning("Filing request failed", {
        description: "Submission ID is missing",
      });
    }

    // Re-fetch full dataset so inbox reflects joined patient/provider data
    fetchClassifications().then((r) => { if (r.success) setFaxes(r.data); });
  };

  const handleSubmitForAIProcessing = () => {
    setIsProcessing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(() => resolve(true), 2000)),
      {
        loading: (
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 animate-pulse" />
            <span>Sending to AI for referral extraction...</span>
          </div>
        ),
        success: () => {
          setTimeout(() => router.push("/needs-review"), 500);
          return "Referral submitted for AI processing";
        },
        error: "Failed to submit for processing",
      }
    );
  };

  const handleSendComm = () => {
    setIsComposeOpen(true);
  };

  const handleRerunJob = async () => {
    if (!fax.jobId) {
      toast.error("Cannot rerun: no job ID")
      return
    }

    const shouldCloseOnRerun = Boolean(onClose)
    setIsRerunning(true)
    if (shouldCloseOnRerun) {
      onClose?.()
    }

    const result = await rerunJob(fax.jobId)
    if (!shouldCloseOnRerun) {
      setIsRerunning(false)
    }

    if (!result.success) {
      handleActionError(result)
      return
    }

    updateFax({
      id: fax.id,
      updates: {
        status: "in-progress",
        processingState: "classifying",
      },
    })

    toast.success("Job sent back through AI pipeline", {
      description: `Attempt ${result.data.attemptCount}/${result.data.maxAttempts} recorded as a manual rerun`,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with status */}
      <div className="border-b px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={fax.status} />
          <SlaTimerCell
            deadline={fax.slaDeadline}
            receivedAt={fax.receivedAt}
            priority={fax.priority}
            faxStatus={fax.status}
          />
        </div>
        {fax.lockedBy && (
          <div className={`flex items-center gap-1 ${LOCK_COLORS.other} text-xs`}>
            <Lock className="h-3 w-3" />
            <span>Locked</span>
          </div>
        )}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {/* Failed fax error banner */}
        {fax.status === "failed" && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">Processing Failed</p>
                <p className="text-xs text-red-700 mt-0.5">
                  {(fax.metadata?.error as string) || (fax.metadata?.error_code as string) || "This fax failed during pipeline processing."}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Fill in the required fields below and save to manually classify this fax.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filing error banner */}
        {fax.filingError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">Filing Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{fax.filingError}</p>
                <p className="text-xs text-red-600 mt-1">
                  Review the fields below and try filing again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <section className="px-4 py-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-violet-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI Insights
            </h3>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground/80">
            {fax.patientName && fax.patientMatchStatus === "matched" && (
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Patient matched: <span className="font-medium text-foreground">{fax.patientName}</span></span>
              </li>
            )}
            {fax.patientMatchStatus === "not-found" && (
              <li className="flex gap-2">
                <span className="text-amber-500">!</span>
                <span>Patient not found in system</span>
              </li>
            )}
            {fax.isReferral && (
              <li className="flex gap-2">
                <span className="text-violet-500">→</span>
                <span>Detected cardiology referral</span>
              </li>
            )}
            {fax.forwardedTo && (
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Auto-filed to {fax.forwardedTo}</span>
              </li>
            )}
          </ul>
        </section>

        {/* Extracted Data */}
        <section className="px-4 py-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-sky-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extracted Data
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sender</span>
              <span className="font-medium text-right">{fax.senderName || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fax Number</span>
              <span className="font-mono">{fax.senderFaxNumber ? <FormattedValue raw={fax.senderFaxNumber} formatted={formatPhone(fax.senderFaxNumber)} /> : "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Received</span>
              <span>{format(new Date(fax.receivedAt), "MMM d, h:mm a")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pages</span>
              <span>{fax.pageCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Document Source</span>
              <span className="font-medium">{fax.documentSourceName || "—"}</span>
            </div>
          </div>
        </section>

        {/* Patient Info */}
        <section data-field="patient" className="px-4 py-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patient
              </h3>
            </div>
            {fax.patientMatchStatus === "not-found" && !selectedPatient ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                Not in system
              </Badge>
            ) : fax.patientId && selectedPatientId === fax.patientId && selectedPatient ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                <Zap className="h-3 w-3 mr-0.5" />
                AI Matched
              </Badge>
            ) : selectedPatient && fax.patientId !== selectedPatientId ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                Override
              </Badge>
            ) : null}
          </div>

          {/* Show AI-matched patient info prominently */}
          {fax.patientId && selectedPatientId === fax.patientId && selectedPatient && (
            <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-md mb-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    {formatPatientName(selectedPatient.name)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {selectedPatient.date_of_birth ? `DOB: ${selectedPatient.date_of_birth}` : ""}{selectedPatient.date_of_birth && formatHealthCard(selectedPatient.health_card_version, selectedPatient.health_card_number) ? " · " : ""}{formatHealthCard(selectedPatient.health_card_version, selectedPatient.health_card_number) ?? ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show patient not found status prominently */}
          {fax.patientMatchStatus === "not-found" && !selectedPatient && (
            <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-md mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {fax.patientName || "Unknown Patient"}
                  </p>
                  <p className="text-xs text-amber-600">
                    Patient not found in database
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Inline search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={patientQuery}
              onChange={(e) => { setPatientQuery(e.target.value); setPatientVisibleCount(5); setPatientHighlightIndex(-1); }}
              onFocus={() => { setPatientSearchFocused(true); setPatientVisibleCount(5); setPatientHighlightIndex(-1); }}
              onBlur={() => setTimeout(() => setPatientSearchFocused(false), 150)}
              onKeyDown={(e) => {
                const visible = filteredPatients.slice(0, patientVisibleCount);
                if (!patientSearchFocused || visible.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setPatientHighlightIndex((i) => {
                    const next = Math.min(i + 1, visible.length - 1);
                    if (next === visible.length - 1 && filteredPatients.length > patientVisibleCount) {
                      setPatientVisibleCount((c) => c + 10);
                    }
                    return next;
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setPatientHighlightIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && patientHighlightIndex >= 0 && patientHighlightIndex < visible.length) {
                  e.preventDefault();
                  const p = visible[patientHighlightIndex];
                  setSelectedPatientId(p.id);
                  setPatientQuery("");
                  setPatientSearchFocused(false);
                  setPatientHighlightIndex(-1);
                  const isOverride = fax.patientId && fax.patientId !== p.id;
                  toast.success(`Linked to ${formatPatientName(p.name)}${isOverride ? " (override)" : ""}`);
                } else if (e.key === "Escape") {
                  setPatientSearchFocused(false);
                  setPatientHighlightIndex(-1);
                }
              }}
              placeholder={selectedPatient
                ? formatPatientName(selectedPatient.name)
                : fax.patientName || "Search patients..."}
              className="h-8 text-xs pl-8"
            />
            {fax.patientId && selectedPatientId === fax.patientId && selectedPatient && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600">
                Override AI
              </span>
            )}

            {/* Dropdown results */}
            {patientSearchFocused && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                {/* Scrollable patient list */}
                <div className="max-h-64 overflow-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No patients found</div>
                  ) : (
                    filteredPatients.slice(0, patientVisibleCount).map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2",
                          selectedPatientId === p.id && "bg-muted",
                          patientHighlightIndex === idx && "bg-accent"
                        )}
                        onMouseDown={() => {
                          setSelectedPatientId(p.id);
                          setPatientQuery("");
                          const isOverride = fax.patientId && fax.patientId !== p.id;
                          toast.success(`Linked to ${formatPatientName(p.name)}${isOverride ? " (override)" : ""}`);
                        }}
                      >
                        {selectedPatientId === p.id && <Check className="h-3 w-3 text-emerald-600" />}
                        <div className={selectedPatientId !== p.id ? "ml-5" : ""}>
                          <div className="font-medium">{formatPatientName(p.name)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.date_of_birth ? `DOB: ${p.date_of_birth}` : ""}{p.date_of_birth && formatHealthCard(p.health_card_version, p.health_card_number) ? " · " : ""}{formatHealthCard(p.health_card_version, p.health_card_number) ?? ""}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                  {filteredPatients.length > patientVisibleCount && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-xs text-center text-muted-foreground hover:bg-muted border-t"
                      onMouseDown={(e) => { e.preventDefault(); setPatientVisibleCount((c) => c + 10); }}
                    >
                      See more ({filteredPatients.length - patientVisibleCount} remaining)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Show manually overridden patient info */}
          {selectedPatient && fax.patientId && fax.patientId !== selectedPatientId && (
            <div className="mt-3 p-2.5 bg-amber-50/50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mb-1.5">
                <AlertTriangle className="h-3 w-3" />
                Manual override (was: {fax.patientName || "Unknown"})
              </div>
              <p className="text-sm font-medium">{formatPatientName(selectedPatient.name)}</p>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                {selectedPatient.date_of_birth && (
                  <div className="flex justify-between">
                    <span>DOB</span>
                    <span>{selectedPatient.date_of_birth}</span>
                  </div>
                )}
                {formatHealthCard(selectedPatient.health_card_version, selectedPatient.health_card_number) && (
                  <div className="flex justify-between">
                    <span>Health Card</span>
                    <span className="font-mono">{formatHealthCard(selectedPatient.health_card_version, selectedPatient.health_card_number)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>


        {/* SUMMARY - Description */}
        <section data-field="description" className="px-4 py-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary — Description
            </h3>
            {fax.description && !fax.manuallyEditedFields?.includes("document_description") && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Bot className="h-3 w-3" />
                AI-generated
              </span>
            )}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
            placeholder="Enter document description..."
            rows={3}
            maxLength={2000}
          />
        </section>

        {/* Other Details */}
        <section className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Review Settings
            </h3>
          </div>

          <div className="space-y-3">
            <div data-field="document-date" className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Document Date (YYYY/MM/DD)</Label>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={documentDate}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                    let v = digits;
                    if (digits.length > 6) v = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
                    else if (digits.length > 4) v = `${digits.slice(0, 4)}-${digits.slice(4)}`;
                    setDocumentDate(v);
                  }}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  className="h-8 text-xs pr-8"
                />
                <button
                  type="button"
                  onClick={() => datePickerRef.current?.showPicker()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
            </div>

            <div data-field="category" className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Document Category</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  {documentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[60px] resize-none"
                placeholder="Add review notes..."
                rows={3}
                maxLength={2000}
              />
            </div>
          </div>
        </section>

        {/* Classification Metadata (collapsible) */}
        {fax.metadata && Object.keys(fax.metadata).length > 0 && (
          <Collapsible>
            <section className="px-4 py-4 border-b">
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Classification Metadata
                  </h3>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 border-2 border-dashed border-amber-300 rounded-md bg-amber-50/30 overflow-hidden">
                  <pre className="p-3 text-[11px] font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-[400px]">
                    {JSON.stringify(fax.metadata, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 space-y-2" aria-busy={isProcessing}>
        {fax.jobId && (
          <Button
            variant="secondary"
            className="w-full h-8 text-xs"
            onClick={handleRerunJob}
            disabled={isProcessing || isSaving || isRerunning}
          >
            {isRerunning ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isRerunning ? "Rerunning..." : "Rerun AI"}
          </Button>
        )}

        {isReferralType && (
          <>
            <Callout variant="info" icon={<Bot className="h-4 w-4" />} className="mb-2">
              <div className={`text-xs ${CALLOUT_COLORS.info.heading}`}>
                <span className="font-medium">Referral detected.</span>{" "}
                This will be sent to AI for extraction.
              </div>
            </Callout>

            {/* View in Referrals option */}
            {fax.isReferral && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs border-violet-300 text-violet-700 hover:bg-violet-50 mb-2"
                onClick={() => router.push(`/referrals?fax=${fax.id}`)}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                View in Referrals Screen
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            )}
          </>
        )}

        {isReferralType ? (
          <>
            <Button className="w-full h-8 text-xs" onClick={handleSave} disabled={isProcessing || isSaving || (!hasChanges && !isFailed)}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              {isSaving ? "Saving..." : "Save Review"}
            </Button>
            <Button
              className="w-full h-8 text-xs bg-sky-600 hover:bg-sky-700"
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  Send to MRI Pipeline
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-8 text-xs" onClick={handleSave} disabled={isProcessing || isSaving || (!hasChanges && !isFailed)}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              className="h-8 text-xs"
              onClick={handleComplete}
              disabled={isProcessing}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Complete & File
            </Button>
          </div>
        )}

        {fax.pageCount > 1 && (
          <Button
            variant="secondary"
            className="w-full h-8 text-xs"
            onClick={() => setIsSplitOpen(true)}
          >
            <Scissors className="h-3.5 w-3.5 mr-1" />
            Split Document
          </Button>
        )}
      </div>

      <ComposeSlideOver
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        recipientName={fax.senderName}
        recipientFax={fax.senderFaxNumber}
        missingItems={[]}
        onSend={() => {
          setIsComposeOpen(false);
          toast.success("Communication sent successfully");
        }}
      />

      {fax.pageCount > 1 && (
        <SplitDialog
          fax={fax}
          open={isSplitOpen}
          onOpenChange={setIsSplitOpen}
          onSplitComplete={(newFaxIds) => {
            setIsSplitOpen(false);
            onSplitComplete?.(newFaxIds);
          }}
        />
      )}
    </div>
  );
}
