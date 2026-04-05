"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAtomValue } from "jotai";
import { CompletenessPanel } from "@/components/referral/completeness-panel";
import { CommunicationsPanel } from "@/components/referral/communications-panel";
import { RoutingPanel } from "@/components/referral/routing-panel";
import { simulatedReferralsAtom } from "@/atoms/simulation";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPHN } from "@/lib/format";
import { toast } from "sonner";
import { Communication, EscalationStrategy } from "@/types/communication";
import { Referral } from "@/types/referral";
import {
  ArrowLeft,
  FileText,
  User,
  Stethoscope,
  Phone,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const allReferrals = useAtomValue(simulatedReferralsAtom);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Find the referral from simulation atoms
  const initialReferral = useMemo(() => allReferrals.find((r) => r.id === id), [allReferrals, id]);

  // Keep referral in local state so we can update communications
  const [referral, setReferral] = useState<Referral | undefined>(initialReferral);

  if (!referral) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">Referral not found</p>
        <p className="text-xs">This referral may not have been processed yet. Referrals appear as faxes are processed.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const totalPages = 5; // Mock
  const isComplete = referral.completenessScore === 100;

  const handleViewPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleRequestItem = () => {
    toast.success("Request dialog would open");
  };

  const handleMarkFound = (itemId: string) => {
    toast.success("Item marked as found");
  };

  const handleMarkMissing = (itemId: string) => {
    toast.success("Item marked as missing");
  };

  const handleRoute = (cardiologistId: string, notes?: string) => {
    toast.success("Referral routed to cardiologist");
    router.push("/needs-review");
  };

  const handleSendRequest = (data: {
    channel: "fax" | "voice" | "email";
    items: string[];
    message: string;
    escalationStrategy: EscalationStrategy;
  }) => {
    const now = new Date().toISOString();
    const newComm: Communication = {
      id: `comm-${Date.now()}`,
      referralId: referral.id,
      type: "missing-items",
      channel: data.channel,
      status: data.channel === "voice" ? "sent" : "awaiting",
      initiator: "human",
      recipientName: referral.referringPhysicianName,
      recipientFax: referral.referringPhysicianFax,
      recipientPhone: referral.referringPhysicianPhone,
      subject: `Request for Missing Items: ${data.items.join(", ")}`,
      body: data.message || `Please provide the following items for patient ${referral.patientName}: ${data.items.join(", ")}`,
      missingItems: data.items,
      sentAt: now,
      escalationStrategy: data.escalationStrategy,
      escalationDelayDays: data.escalationStrategy !== "none" ? 2 : undefined,
      remindersSent: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Update the referral with the new communication
    setReferral((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        communications: [newComm, ...prev.communications],
        pendingCommunicationsCount: prev.pendingCommunicationsCount + 1,
      };
    });

    toast.success("Request sent", {
      description: `${data.channel === "fax" ? "Fax" : data.channel === "voice" ? "Voice call" : "Email"} sent to ${referral.referringPhysicianName}`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">{referral.patientName}</h1>
              {referral.isUrgent && (
                <Badge className="bg-red-600 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Referral from {referral.referringPhysicianName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              isComplete
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}
          >
            {isComplete ? "Complete" : `${referral.completenessScore}% Complete`}
          </Badge>
        </div>
      </div>

      {/* Main content - 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Page Thumbnails */}
        <div className="w-24 border-r bg-muted/30 overflow-y-auto">
          <div className="p-2 space-y-2">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const item = referral.completenessItems.find(
                (ci) => ci.pageNumber === pageNum
              );

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-full aspect-[8.5/11] rounded-sm border-2 bg-background flex flex-col items-center justify-center text-xs transition-all",
                    currentPage === pageNum
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-border"
                  )}
                >
                  <FileText className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-muted-foreground">Page {pageNum}</span>
                  {item && (
                    <Badge
                      variant="outline"
                      className="mt-1 text-[8px] px-1 py-0"
                    >
                      {item.label.slice(0, 8)}...
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resizable: Fax Viewer + Right Panel */}
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full bg-muted/10">
              {/* Viewer toolbar */}
              <div className="flex items-center justify-between p-2 border-b bg-background">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-12 text-center">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fax content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <div
                  className="bg-background shadow-lg rounded-sm overflow-hidden"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  {/* Simulated fax content */}
                  <div className="w-[612px] h-[792px] p-8 text-sm">
                    <div className="border-b pb-4 mb-4">
                      <h2 className="text-lg font-bold">CARDIOLOGY REFERRAL FORM</h2>
                      <p className="text-muted-foreground">Page {currentPage} of {totalPages}</p>
                    </div>

                    {currentPage === 1 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Patient Name</p>
                            <p className="font-medium">{referral.patientName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                            <p className="font-medium">{referral.patientDob}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">OHIP Number</p>
                            <p className="font-medium">
                              {referral.patientOhip || <span className="text-red-500">MISSING</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium">{referral.patientPhone}</p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <p className="text-xs text-muted-foreground">Referring Physician</p>
                          <p className="font-medium">{referral.referringPhysicianName}</p>
                          <p className="text-sm text-muted-foreground">
                            Fax: {referral.referringPhysicianFax}
                          </p>
                        </div>

                        <Separator />

                        <div>
                          <p className="text-xs text-muted-foreground">Reason for Referral</p>
                          <p className="font-medium">
                            {referral.reasonForReferral || <span className="text-red-500">NOT SPECIFIED</span>}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Clinical History</p>
                          <p>{referral.clinicalHistory}</p>
                        </div>
                      </div>
                    )}

                    {currentPage === 2 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold">ECG Report</h3>
                        <div className="h-48 bg-muted rounded-sm flex items-center justify-center">
                          <p className="text-muted-foreground">[ECG Waveform Image]</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interpretation</p>
                          <p>Normal sinus rhythm. Rate 72 bpm. No acute ST changes.</p>
                        </div>
                      </div>
                    )}

                    {currentPage >= 3 && (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-2" />
                          <p>Additional documentation</p>
                          <p className="text-sm">Page {currentPage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="bg-background overflow-hidden flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {/* Patient Info Summary */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{referral.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        DOB: {referral.patientDob}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{referral.referringPhysicianName}</p>
                      <p className="text-xs text-muted-foreground">Referring Physician</p>
                    </div>
                  </div>
                  {referral.referringPhysicianPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{referral.referringPhysicianPhone}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Received {formatDateTime(referral.receivedDate)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Collapsible panels */}
              <div className="space-y-1">
                <CompletenessPanel
                  items={referral.completenessItems}
                  score={referral.completenessScore}
                  aiConfidence={referral.aiConfidence}
                  onViewPage={handleViewPage}
                  onRequestItem={handleRequestItem}
                  onMarkFound={handleMarkFound}
                  onMarkMissing={handleMarkMissing}
                />

                <Separator />

                <CommunicationsPanel
                  referralId={referral.id}
                  communications={referral.communications}
                  pendingCount={referral.pendingCommunicationsCount}
                  recipientName={referral.referringPhysicianName}
                  recipientFax={referral.referringPhysicianFax}
                  recipientPhone={referral.referringPhysicianPhone}
                  onSendRequest={handleSendRequest}
                />

                <Separator />

                <RoutingPanel
                  referral={referral}
                  onRoute={handleRoute}
                  isComplete={isComplete}
                />
              </div>
            </div>
          </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
