"use client";

import { use, useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { faxesAtom } from "@/atoms/inbox";
import { PageThumbnail } from "@/components/fax-viewer/page-thumbnail";
import { FaxPageViewer } from "@/components/fax-viewer/fax-page-viewer";
import { ReviewPanel } from "@/components/fax-viewer/review-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { SlaTimerCell } from "@/components/inbox/sla-timer-cell";
import { PriorityBadge } from "@/components/inbox/priority-badge";
import { useLock } from "@/atoms/lock";

interface Props {
  params: Promise<{ id: string }>;
}

export default function FaxDetailPage({ params }: Props) {
  const { id } = use(params);
  const faxes = useAtomValue(faxesAtom);
  const fax = faxes.find((f) => f.id === id);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [splitBanner, setSplitBanner] = useState<{ count: number } | null>(null);

  const { lockDocument, unlockDocument, isLockedByOther: lockedByOther, lockedByUser: lockedUser } = useLock(id);

  // Auto-lock on mount, unlock on unmount
  useEffect(() => {
    if (fax && !lockedByOther) {
      lockDocument(id);
    }
    return () => {
      unlockDocument(id);
    };
  }, [id, fax, lockDocument, unlockDocument, lockedByOther]);

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

  return (
    <div className="flex flex-col h-screen -m-6">
      {/* Lock warning banner when another user has document */}
      {lockedByOther && lockedUser && (
        <div role="alert" className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Another user is currently working on this document.
            Changes you make may conflict with their work.
          </span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link href="/inbox">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm font-medium">{fax.senderName}</span>
          <PriorityBadge priority={fax.priority} />
          {fax.status !== "completed" && fax.status !== "auto-filed" && (
            <SlaTimerCell
              deadline={fax.slaDeadline}
              receivedAt={fax.receivedAt}
              priority={fax.priority}
            />
          )}
        </div>
      </div>

      {/* Split success banner */}
      {splitBanner && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Document split into {splitBanner.count} segments</span>
        </div>
      )}

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Thumbnails */}
        <div className="w-24 border-r bg-muted/30 p-2 space-y-2 overflow-auto shrink-0">
          {fax.pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              isActive={index === currentPageIndex}
              onClick={() => setCurrentPageIndex(index)}
            />
          ))}
        </div>

        {/* Center: Document viewer */}
        <div className="flex-1 min-w-0">
          <FaxPageViewer
            fax={fax}
            currentPage={fax.pages[currentPageIndex]}
            onPageChange={setCurrentPageIndex}
            currentPageIndex={currentPageIndex}
          />
        </div>

        {/* Right: Review panel */}
        <div className="w-80 border-l shrink-0">
          <ReviewPanel
            fax={fax}
            onSplitComplete={(newFaxIds) => {
              setSplitBanner({ count: newFaxIds.length });
              setTimeout(() => setSplitBanner(null), 3000);
            }}
          />
        </div>
      </div>
    </div>
  );
}
