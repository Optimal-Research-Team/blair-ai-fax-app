"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Fax } from "@/types";
import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, User, FileText, Stethoscope, ShieldCheck, ShieldX, ChevronDown, Zap, ExternalLink, Pencil, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface HighlightRegion { x: number; y: number; width: number; height: number; page: number; }

const FIELD_REGIONS: Record<string, HighlightRegion> = {
  patientName: { x: 105, y: 85, width: 230, height: 18, page: 0 },
  patientDob: { x: 365, y: 85, width: 120, height: 18, page: 0 },
  patientOhip: { x: 60, y: 158, width: 260, height: 18, page: 0 },
  refPhysician: { x: 85, y: 660, width: 320, height: 18, page: 0 },
  refBilling: { x: 83, y: 698, width: 300, height: 18, page: 0 },
  refContact: { x: 65, y: 716, width: 300, height: 18, page: 0 },
  physicianSignature: { x: 172, y: 678, width: 250, height: 18, page: 0 },
  areaScan: { x: 55, y: 255, width: 250, height: 30, page: 0 },
  clinicalIndication: { x: 330, y: 255, width: 260, height: 30, page: 0 },
  urgency: { x: 480, y: 83, width: 110, height: 20, page: 0 },
  urgencyReason: { x: 490, y: 105, width: 110, height: 20, page: 0 },
  previousReports: { x: 36, y: 580, width: 550, height: 30, page: 0 },
};

const PATIENT_DIRECTORY = [
  { id: 'pat-001', name: 'Robert Anderson', dob: '03/15/1958', ohip: '1234-567-890-AB' },
  { id: 'pat-002', name: 'Maria Gonzalez', dob: '07/22/1972', ohip: '2345-678-901-CD' },
  { id: 'pat-003', name: 'James Wilson', dob: '11/08/1965', ohip: '3456-789-012-EF' },
  { id: 'pat-005', name: 'David Thompson', dob: '09/12/1953', ohip: '5678-901-234-IJ' },
  { id: 'pat-008', name: 'Elizabeth Taylor', dob: '06/18/1975', ohip: '8901-234-567-OP' },
  { id: 'pat-009', name: 'Margaret White', dob: '08/25/1948', ohip: '9012-345-678-QR' },
];

const PHYSICIAN_DIRECTORY = [
  { id: 'prov-001', name: 'Dr. Sarah Chen', billing: '34567', specialty: 'Family Medicine' },
  { id: 'prov-002', name: 'Dr. Michael Patel', billing: '56789', specialty: 'Cardiology' },
  { id: 'prov-003', name: 'Dr. Anita Sharma', billing: '67890', specialty: 'Cardiac Imaging' },
  { id: 'prov-004', name: 'Dr. John Kim', billing: '78901', specialty: 'Cardiology' },
  { id: 'prov-005', name: 'Dr. Lisa Wang', billing: '89012', specialty: 'Cardiology' },
  { id: 'prov-006', name: 'Dr. Raj Kapoor', billing: '45678', specialty: 'Family Medicine' },
  { id: 'prov-007', name: 'Dr. Emma Foster', billing: '90123', specialty: 'Cardiology' },
  { id: 'prov-008', name: 'Dr. Amanda Ross', billing: '01234', specialty: 'Internal Medicine' },
];

type TagStatus = "ai_extracted" | "ai_verified" | "ai_match" | "user_verified" | "failed" | "missing" | "new_entry";

function StatusTag({ status }: { status: TagStatus }) {
  const styles: Record<TagStatus, string> = {
    ai_extracted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ai_verified: "bg-sky-50 text-sky-700 border-sky-200",
    ai_match: "bg-indigo-50 text-indigo-700 border-indigo-200",
    user_verified: "bg-violet-50 text-violet-700 border-violet-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    missing: "bg-amber-50 text-amber-700 border-amber-200",
    new_entry: "bg-sky-50 text-sky-700 border-sky-200",
  };
  const icons: Record<TagStatus, React.ElementType> = {
    ai_extracted: Check, ai_verified: Zap, ai_match: Search, user_verified: Check, failed: X, missing: AlertTriangle, new_entry: UserPlus,
  };
  const labels: Record<TagStatus, string> = {
    ai_extracted: "AI Extracted", ai_verified: "AI Verified", ai_match: "AI Match", user_verified: "User Verified", failed: "Failed", missing: "Missing", new_entry: "New Entry",
  };
  const Icon = icons[status];
  return (
    <span className={cn("inline-flex items-center gap-0.5 shrink-0 rounded px-1.5 py-px text-[9px] font-bold border uppercase tracking-wide", styles[status])}>
      <Icon className="h-2.5 w-2.5" />{labels[status]}
    </span>
  );
}

/** Inline editable text with confirmation flash animation */
function EditableValue({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const confirm = useCallback((newVal: string) => {
    onChange(newVal);
    setEditing(false);
    if (newVal !== value) {
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    }
  }, [onChange, value]);

  if (disabled) {
    return <span className="text-[12px] font-semibold">{value}</span>;
  }

  if (!editing) {
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
        className={cn(
          "text-[12px] font-semibold text-left rounded px-1 py-px -ml-1 hover:bg-muted/80 transition-all inline-flex items-center gap-1 group max-w-full",
          !value && "text-amber-600 italic font-normal",
          flash && "ring-2 ring-violet-400 ring-offset-1 bg-violet-50"
        )}
        title="Click to edit">
        <span className="truncate">{value || placeholder || "Click to enter..."}</span>
        <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
      </button>
    );
  }

  return (
    <Input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={() => confirm(draft)}
      onKeyDown={(e) => { if (e.key === "Enter") confirm(draft); if (e.key === "Escape") setEditing(false); }}
      onClick={(e) => e.stopPropagation()} className="h-7 text-[12px] font-semibold px-2 py-0.5 w-full" placeholder={placeholder} />
  );
}

/** Search dropdown for matching patients/physicians */
function SearchDropdown({ query, onQueryChange, results, onSelect, placeholder, bottomAction }: {
  query: string; onQueryChange: (q: string) => void;
  results: { id: string; label: string; sublabel?: string }[];
  onSelect: (id: string) => void; placeholder: string;
  bottomAction?: { label: string; icon: React.ElementType; onSelect: () => void };
}) {
  const [focused, setFocused] = useState(false);
  const showDropdown = focused && (query.length > 0 || bottomAction);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      <Input value={query} onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder} className="h-7 text-[11px] pl-7 pr-2" />
      {showDropdown && (
        <div className="absolute z-20 w-full mt-0.5 bg-popover border rounded-md shadow-lg max-h-44 overflow-auto">
          {query.length > 0 && results.length === 0 && (
            <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground">No matches found</div>
          )}
          {results.map((r) => (
            <button key={r.id} type="button" className="w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-muted flex flex-col"
              onMouseDown={() => onSelect(r.id)}>
              <div className="font-medium">{r.label}</div>
              {r.sublabel && <div className="text-[10px] text-muted-foreground">{r.sublabel}</div>}
            </button>
          ))}
          {bottomAction && (
            <>
              <div className="border-t" />
              <button type="button" className="w-full px-2.5 py-2 text-left text-[11px] hover:bg-sky-50 flex items-center gap-1.5 text-sky-700 font-medium"
                onMouseDown={bottomAction.onSelect}>
                <bottomAction.icon className="h-3 w-3" />{bottomAction.label}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TriageItem({ label, extractedValue, checked, onChange, status, fieldKey, onHover, editable, onValueEdit, editPlaceholder, disabled, children }: {
  label: string; extractedValue?: string | null; checked: boolean; onChange: (v: boolean) => void; status: TagStatus;
  fieldKey?: string; onHover?: (region: HighlightRegion | null) => void;
  editable?: boolean; onValueEdit?: (newValue: string) => void; editPlaceholder?: string; disabled?: boolean; children?: React.ReactNode;
}) {
  const isMissing = status === "missing" || status === "failed";
  const region = fieldKey ? FIELD_REGIONS[fieldKey] : undefined;
  const [flash, setFlash] = useState(false);

  const handleCheck = (val: boolean) => {
    onChange(val);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  return (
    <div>
      <div className={cn(
          "flex items-start gap-2.5 py-2 px-2.5 rounded-md cursor-pointer transition-all duration-75",
          isMissing && !checked && "bg-amber-50/60 border border-amber-200/70 hover:bg-amber-100/50",
          !isMissing && !checked && "border border-transparent hover:bg-accent/40",
          checked && "bg-muted/15 border border-transparent hover:bg-muted/30",
          flash && "!bg-violet-50 !border-violet-200 transition-none",
        )}
        onClick={() => handleCheck(!checked)}
        onMouseEnter={() => region && onHover?.(region)}
        onMouseLeave={() => onHover?.(null)}>
        <div className="shrink-0 mt-px">
          <Checkbox checked={checked} onCheckedChange={(v) => handleCheck(!!v)} className="h-4 w-4" onClick={(e) => e.stopPropagation()} />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className={cn("text-[12px] leading-snug", checked ? "text-muted-foreground" : "text-foreground/80")}>{label}</span>
            <StatusTag status={status} />
          </div>
          {editable && onValueEdit ? (
            <EditableValue value={extractedValue || ""} onChange={(v) => onValueEdit(v)} placeholder={editPlaceholder} disabled={disabled} />
          ) : extractedValue ? (
            <span className={cn("text-[12px] font-semibold block leading-snug", checked ? "text-muted-foreground" : "text-foreground")}>{extractedValue}</span>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title }: { icon: React.ElementType; iconColor: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn("h-3.5 w-3.5", iconColor)} />
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
    </div>
  );
}

interface TriageChecklistProps {
  fax: Fax;
  onApprove?: () => void;
  onRequestInfo?: () => void;
  onReject?: () => void;
  onHighlightChange?: (region: HighlightRegion | null) => void;
}

export function TriageChecklist({ fax, onApprove, onRequestInfo, onReject, onHighlightChange }: TriageChecklistProps) {
  const aiRaw = fax.aiExtractedFields || {};
  const hasDuplicates = (fax.duplicateReferralIds?.length ?? 0) > 0;
  const [duplicateExpanded, setDuplicateExpanded] = useState(false);

  // Patient state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    fax.patientMatchStatus === "matched" ? (fax.patientId || null) : null
  );
  const [manualNewPatient, setManualNewPatient] = useState(fax.patientMatchStatus === "not-found");
  const matchedPatient = selectedPatientId ? PATIENT_DIRECTORY.find(p => p.id === selectedPatientId) : null;
  const isNewPatient = manualNewPatient && !matchedPatient;
  const [patientSearch, setPatientSearch] = useState("");
  const patientSearchResults = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return PATIENT_DIRECTORY.filter(p => p.name.toLowerCase().includes(q) || p.ohip.includes(q))
      .map(p => ({ id: p.id, label: p.name, sublabel: `DOB: ${p.dob} · OHIP: ${p.ohip}` }));
  }, [patientSearch]);

  // Urgency
  const [urgency, setUrgency] = useState<"urgent" | "routine" | "">(fax.isUrgent === true ? "urgent" : fax.isUrgent === false ? "routine" : "");
  const [urgencyReason, setUrgencyReason] = useState(fax.urgencyReason || (fax.isUrgent ? "No reason for urgency found" : ""));

  // Physician
  const [physicianSearch, setPhysicianSearch] = useState("");
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<string | null>(fax.physicianMatchId || null);
  const matchedPhysician = selectedPhysicianId ? PHYSICIAN_DIRECTORY.find(p => p.id === selectedPhysicianId) : null;
  const isNewPhysician = fax.physicianMatchStatus === "not-found" && !matchedPhysician;
  const physicianSearchResults = useMemo(() => {
    if (!physicianSearch.trim()) return [];
    const q = physicianSearch.toLowerCase();
    return PHYSICIAN_DIRECTORY.filter(p => p.name.toLowerCase().includes(q) || p.billing.includes(q))
      .map(p => ({ id: p.id, label: p.name, sublabel: `${p.specialty} · Billing: ${p.billing}` }));
  }, [physicianSearch]);

  // Editable fields
  const [fields, setFields] = useState(() => ({
    patientName: aiRaw.patientName || "", patientDob: aiRaw.patientDob || "", patientOhip: aiRaw.patientOhip || "",
    refPhysician: aiRaw.refPhysician || "", refBilling: aiRaw.refBilling || "", refContact: aiRaw.refContact || "",
    areaScan: aiRaw.areaScan || "", clinicalIndication: aiRaw.clinicalIndication || "",
  }));
  const [userVerifiedFields, setUserVerifiedFields] = useState<Set<string>>(new Set());

  const updateField = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
    setUserVerifiedFields(prev => new Set([...prev, key]));
    if (value && !checks[key as keyof typeof checks]) setChecks(prev => ({ ...prev, [key]: true }));
  };

  const getFieldStatus = (key: string, aiValue: string | null | undefined): TagStatus => {
    if (userVerifiedFields.has(key)) return "user_verified";
    if (matchedPatient && ["patientName", "patientDob", "patientOhip"].includes(key)) return "ai_match";
    if (aiValue) return "ai_extracted";
    if (aiValue === null) return "failed";
    return "missing";
  };

  // Previous reports
  const prevReportsIsExtracted = fax.previousReportsIndicated !== null && fax.previousReportsIndicated !== undefined;
  const prevReportsLabel = fax.previousReportsIndicated === true ? "Previous test reports: Yes — attached"
    : fax.previousReportsIndicated === false ? "Previous test reports: No — not indicated"
    : "Previous test reports";

  // Checks
  const [checks, setChecks] = useState(() => ({
    urgency: fax.isUrgent !== undefined,
    patientMatch: fax.patientMatchStatus === "matched",
    noDuplicate: !hasDuplicates,
    patientName: fax.patientMatchStatus === "matched" || !!aiRaw.patientName,
    patientDob: fax.patientMatchStatus === "matched" || !!aiRaw.patientDob,
    patientOhip: fax.patientMatchStatus === "matched" || !!aiRaw.patientOhip,
    refPhysician: fax.physicianMatchStatus === "matched" || !!aiRaw.refPhysician,
    refBilling: !!aiRaw.refBilling,
    refContact: !!aiRaw.refContact,
    physicianSignature: false,
    areaScan: !!aiRaw.areaScan,
    clinicalIndication: !!aiRaw.clinicalIndication,
    reasonForTest: false,
    previousReports: prevReportsIsExtracted,
    screeningSection: false,
  }));
  const toggle = (key: keyof typeof checks) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  // Patient selection
  const selectPatient = (patId: string) => {
    const p = PATIENT_DIRECTORY.find(x => x.id === patId);
    if (!p) return;
    setSelectedPatientId(patId);
    setManualNewPatient(false);
    setFields(prev => ({ ...prev, patientName: p.name, patientDob: p.dob, patientOhip: p.ohip }));
    setChecks(prev => ({ ...prev, patientMatch: true, patientName: true, patientDob: true, patientOhip: true }));
    setPatientSearch("");
  };

  const selectNewPatient = () => {
    setSelectedPatientId(null);
    setManualNewPatient(true);
    setChecks(prev => ({ ...prev, patientMatch: true }));
    setPatientSearch("");
  };

  const selectPhysician = (physId: string) => {
    const p = PHYSICIAN_DIRECTORY.find(x => x.id === physId);
    if (!p) return;
    setSelectedPhysicianId(physId);
    setFields(prev => ({ ...prev, refPhysician: p.name, refBilling: p.billing }));
    setChecks(prev => ({ ...prev, refPhysician: true, refBilling: true }));
    setUserVerifiedFields(prev => new Set([...prev, "refPhysician", "refBilling"]));
    setPhysicianSearch("");
  };

  const eligibility = { ageEligible: true, weightEligible: true };
  const allEligible = Object.values(eligibility).every(Boolean);
  const allChecks = Object.values(checks);
  const totalChecks = allChecks.length;
  const completedChecks = allChecks.filter(Boolean).length;
  const progress = Math.round((completedChecks / totalChecks) * 100);
  const canApprove = progress === 100 && allEligible;

  const duplicateFaxes = useMemo(() => {
    if (!fax.duplicateReferralIds?.length) return [];
    return [{ id: 'fax-mri-007', patientName: fax.patientName, description: 'Cardiac MRI — HCM evaluation (prior referral from Dr. Emma Foster)' }];
  }, [fax.duplicateReferralIds, fax.patientName]);

  // Are patient detail fields editable? Only when no patient is matched from directory
  const patientFieldsEditable = !matchedPatient;

  return (
    <div className="divide-y text-sm">
      {/* Progress */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Triage Progress</span>
          <span className={cn("font-mono text-[13px] font-bold", progress === 100 ? "text-emerald-600" : "text-foreground")}>{completedChecks}/{totalChecks}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-300", progress === 100 ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Urgency */}
      <section className="px-4 py-3">
        <SectionHeader icon={Zap} iconColor="text-red-500" title="Urgency" />
        <div className={cn("py-2 px-2.5 rounded-md transition-all border space-y-1.5",
          !urgency ? "bg-amber-50/60 border-amber-200/70" : "border-transparent hover:bg-accent/40"
        )} onMouseEnter={() => onHighlightChange?.(FIELD_REGIONS.urgency)} onMouseLeave={() => onHighlightChange?.(null)}>
          <div className="flex items-center gap-2.5">
            <Checkbox checked={checks.urgency} onCheckedChange={() => toggle("urgency")} className="h-4 w-4" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[12px] text-foreground/80">Urgency status</span>
              <StatusTag status={userVerifiedFields.has("urgency") ? "user_verified" : urgency ? "ai_extracted" : "missing"} />
            </div>
          </div>
          <div className="ml-6.5">
            <Select value={urgency} onValueChange={(v) => {
              setUrgency(v as typeof urgency);
              setUserVerifiedFields(prev => new Set([...prev, "urgency"]));
              if (v) setChecks(prev => ({ ...prev, urgency: true }));
              if (v === "urgent" && !urgencyReason) setUrgencyReason("No reason for urgency found");
              if (v === "routine") setUrgencyReason("");
            }}>
              <SelectTrigger className="h-7 w-40 text-[12px] font-semibold" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent"><span className="text-red-600 font-semibold">URGENT</span></SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
              </SelectContent>
            </Select>
            {/* Urgency reason — only visible when urgent */}
            {urgency === "urgent" && (
              <div className="mt-1.5" onMouseEnter={() => onHighlightChange?.(FIELD_REGIONS.urgencyReason)} onMouseLeave={() => onHighlightChange?.(null)}>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Reason</span>
                <EditableValue
                  value={urgencyReason}
                  onChange={(v) => { setUrgencyReason(v); setUserVerifiedFields(prev => new Set([...prev, "urgencyReason"])); }}
                  placeholder="Enter reason for urgency..."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Patient Information */}
      <section className="px-4 py-3">
        <SectionHeader icon={User} iconColor="text-violet-600" title="Patient Information" />
        <div className="space-y-1">
          {/* Patient match — search bar, not checkbox */}
          <div className={cn("py-2 px-2.5 rounded-md border transition-all",
            !checks.patientMatch ? "bg-amber-50/60 border-amber-200/70" : "border-transparent hover:bg-accent/40"
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-foreground/80">
                {matchedPatient ? `Patient: ${matchedPatient.name}` : isNewPatient ? "New patient (not in EMR)" : "Patient match"}
              </span>
              <StatusTag status={matchedPatient ? "ai_match" : isNewPatient ? "new_entry" : "missing"} />
            </div>
            <SearchDropdown
              query={patientSearch} onQueryChange={setPatientSearch} results={patientSearchResults}
              onSelect={selectPatient} placeholder="Search patients by name or OHIP..."
              bottomAction={{ label: "Patient not in EMR — create new", icon: UserPlus, onSelect: selectNewPatient }}
            />
            {isNewPatient && (
              <div className="mt-1.5 px-2.5 py-2 rounded-md bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-800">
                  <UserPlus className="h-3 w-3" />New patient chart created on approval
                </div>
                <p className="text-[10px] text-sky-700/80 mt-0.5 leading-relaxed">Verify the extracted info below, then approve.</p>
              </div>
            )}
          </div>

          <TriageItem label="No duplicate MRI referral" checked={checks.noDuplicate} onChange={() => toggle("noDuplicate")} status={hasDuplicates ? "failed" : "ai_verified"}>
            {hasDuplicates && (
              <div className="ml-6.5 mt-1">
                <button type="button" onClick={() => setDuplicateExpanded(!duplicateExpanded)} className="flex items-center gap-1 text-[11px] text-red-600 font-medium hover:underline">
                  <ChevronDown className={cn("h-3 w-3 transition-transform", duplicateExpanded && "rotate-180")} />
                  {fax.duplicateReferralIds!.length} duplicate found — review
                </button>
                {duplicateExpanded && (
                  <div className="mt-1.5">
                    {duplicateFaxes.map(dup => (
                      <div key={dup.id} className="rounded-md border border-red-200 bg-red-50/50 p-2.5">
                        <div className="flex items-center justify-between text-[11px]"><span className="font-semibold">{dup.patientName}</span><span className="text-muted-foreground font-mono text-[10px]">{dup.id}</span></div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{dup.description}</p>
                        <button type="button" className="flex items-center gap-1 text-[10px] text-sky-600 font-medium mt-1 hover:underline"><ExternalLink className="h-2.5 w-2.5" />View duplicate</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TriageItem>

          {/* Patient detail fields — editable only when no directory match */}
          <TriageItem label="Patient name" extractedValue={fields.patientName || undefined} checked={checks.patientName} onChange={() => toggle("patientName")}
            status={getFieldStatus("patientName", aiRaw.patientName)}
            fieldKey={patientFieldsEditable ? "patientName" : undefined} onHover={patientFieldsEditable ? onHighlightChange : undefined}
            editable={patientFieldsEditable} onValueEdit={(v) => updateField("patientName", v)} editPlaceholder="Enter patient name" disabled={!patientFieldsEditable} />
          <TriageItem label="Date of birth" extractedValue={fields.patientDob || undefined} checked={checks.patientDob} onChange={() => toggle("patientDob")}
            status={getFieldStatus("patientDob", aiRaw.patientDob)}
            fieldKey={patientFieldsEditable ? "patientDob" : undefined} onHover={patientFieldsEditable ? onHighlightChange : undefined}
            editable={patientFieldsEditable} onValueEdit={(v) => updateField("patientDob", v)} editPlaceholder="MM/DD/YYYY" disabled={!patientFieldsEditable} />
          <TriageItem label="OHIP number" extractedValue={fields.patientOhip || undefined} checked={checks.patientOhip} onChange={() => toggle("patientOhip")}
            status={getFieldStatus("patientOhip", aiRaw.patientOhip)}
            fieldKey={patientFieldsEditable ? "patientOhip" : undefined} onHover={patientFieldsEditable ? onHighlightChange : undefined}
            editable={patientFieldsEditable} onValueEdit={(v) => updateField("patientOhip", v)} editPlaceholder="XXXX-XXX-XXX-XX" disabled={!patientFieldsEditable} />
        </div>
      </section>

      {/* Physician Information */}
      <section className="px-4 py-3">
        <SectionHeader icon={Stethoscope} iconColor="text-sky-600" title="Physician Information" />
        <div className="space-y-1">
          <TriageItem
            label={matchedPhysician ? `Referring physician: ${matchedPhysician.name}` : "Referring physician"}
            extractedValue={!matchedPhysician ? (fields.refPhysician || undefined) : undefined}
            checked={checks.refPhysician} onChange={() => toggle("refPhysician")}
            status={matchedPhysician ? "ai_match" : isNewPhysician ? "new_entry" : getFieldStatus("refPhysician", aiRaw.refPhysician)}
            fieldKey="refPhysician" onHover={onHighlightChange}>
            <div className="ml-6.5 mt-1 space-y-1.5">
              {matchedPhysician && <div className="text-[10px] text-muted-foreground px-0.5">{matchedPhysician.specialty} · Billing: {matchedPhysician.billing}</div>}
              <SearchDropdown query={physicianSearch} onQueryChange={setPhysicianSearch} results={physicianSearchResults}
                onSelect={selectPhysician} placeholder="Search physician directory..." />
              {isNewPhysician && !matchedPhysician && (
                <div className="px-2.5 py-2 rounded-md bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800"><UserPlus className="h-3 w-3" />Physician not in directory</div>
                  <p className="text-[10px] text-amber-700/80 mt-0.5">New entry created on approval.</p>
                </div>
              )}
            </div>
          </TriageItem>

          <TriageItem label="Billing number" extractedValue={fields.refBilling || undefined} checked={checks.refBilling} onChange={() => toggle("refBilling")}
            status={matchedPhysician ? "ai_match" : getFieldStatus("refBilling", aiRaw.refBilling)}
            fieldKey="refBilling" onHover={onHighlightChange} editable={!matchedPhysician} onValueEdit={(v) => updateField("refBilling", v)} editPlaceholder="Enter billing #" disabled={!!matchedPhysician} />
          <TriageItem label="Phone/fax contact" extractedValue={fields.refContact || undefined} checked={checks.refContact} onChange={() => toggle("refContact")}
            status={getFieldStatus("refContact", aiRaw.refContact)}
            fieldKey="refContact" onHover={onHighlightChange} editable onValueEdit={(v) => updateField("refContact", v)} editPlaceholder="Enter phone/fax" />
          <TriageItem label="Physician signature present" checked={checks.physicianSignature} onChange={() => toggle("physicianSignature")} status={userVerifiedFields.has("physicianSignature") ? "user_verified" : "missing"} fieldKey="physicianSignature" onHover={onHighlightChange} />
        </div>
      </section>

      {/* Clinical Information */}
      <section className="px-4 py-3">
        <SectionHeader icon={FileText} iconColor="text-amber-600" title="Clinical Information" />
        <div className="space-y-1">
          <TriageItem label="Area to scan" extractedValue={fields.areaScan || undefined} checked={checks.areaScan} onChange={() => toggle("areaScan")} status={getFieldStatus("areaScan", aiRaw.areaScan)} fieldKey="areaScan" onHover={onHighlightChange} editable onValueEdit={(v) => updateField("areaScan", v)} editPlaceholder="Enter area" />
          <TriageItem label="Clinical indication" extractedValue={fields.clinicalIndication || undefined} checked={checks.clinicalIndication} onChange={() => toggle("clinicalIndication")} status={getFieldStatus("clinicalIndication", aiRaw.clinicalIndication)} fieldKey="clinicalIndication" onHover={onHighlightChange} editable onValueEdit={(v) => updateField("clinicalIndication", v)} editPlaceholder="Enter indication" />
          <TriageItem label="Reason for test documented" checked={checks.reasonForTest} onChange={() => toggle("reasonForTest")} status={userVerifiedFields.has("reasonForTest") ? "user_verified" : "missing"} />
          <TriageItem label={prevReportsLabel} checked={checks.previousReports} onChange={() => toggle("previousReports")} status={prevReportsIsExtracted ? "ai_extracted" : "missing"} fieldKey="previousReports" onHover={onHighlightChange} />
          <TriageItem label="Screening section filled by physician" checked={checks.screeningSection} onChange={() => toggle("screeningSection")} status={userVerifiedFields.has("screeningSection") ? "user_verified" : "missing"} />
        </div>
      </section>

      {/* Eligibility */}
      <section className="px-4 py-3">
        <SectionHeader icon={allEligible ? ShieldCheck : ShieldX} iconColor={allEligible ? "text-emerald-600" : "text-red-600"} title="KMH Eligibility" />
        {!allEligible && <div className="mb-2 px-2.5 py-2 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700 font-medium">Patient does not meet eligibility requirements.</div>}
        <div className="space-y-0">
          {[{ label: "Patient age ≥ 12 years", ok: eligibility.ageEligible }, { label: "Patient weight < 300 lbs", ok: eligibility.weightEligible }].map(item => (
            <div key={item.label} className="flex items-center gap-2.5 py-1.5 px-2.5 text-[12px]">
              {item.ok ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className={item.ok ? "text-muted-foreground" : "text-red-700 font-medium"}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Decision */}
      <section className="px-4 py-4">
        <div className="flex flex-col gap-2">
          <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-md" disabled={!canApprove} onClick={onApprove}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {isNewPatient ? "Approve — Create Patient & Send to Screening" : "Approve — Send to Screening"}
          </Button>
          <Button variant="outline" className="w-full h-9 border-amber-300 text-amber-700 hover:bg-amber-50 text-[12px] font-semibold rounded-md" onClick={onRequestInfo}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Request Missing Info
          </Button>
          <Button variant="outline" className="w-full h-9 border-red-300 text-red-700 hover:bg-red-50 text-[12px] font-semibold rounded-md" onClick={onReject}>
            <X className="h-3.5 w-3.5 mr-1.5" />Reject Referral
          </Button>
        </div>
        {!canApprove && allEligible && <p className="text-[10px] text-muted-foreground mt-2 text-center">Complete all {totalChecks} items to approve</p>}
      </section>
    </div>
  );
}
