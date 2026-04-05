"use client";

import { atom } from "jotai";
import { WorklistItem, QueueStats } from "@/types/worklist";
import { faxesAtom } from "@/atoms/inbox";

function isJunkFax(documentCategory?: string) {
  return documentCategory === "Junk";
}

function hasFilingError(filingError?: string) {
  return !!filingError;
}

/**
 * Derived atom: unclassified worklist items come from failed classifications
 * (faxes with status === 'failed'). These are faxes that failed at some
 * pipeline stage and now have a stub classification record for manual review.
 */
export const worklistItemsAtom = atom<WorklistItem[]>((get) => {
  const faxes = get(faxesAtom);
  return faxes
    .filter((fax) => {
      if (fax.status === "failed") {
        return true;
      }

      if (fax.status !== "pending-review") {
        return false;
      }

      return !isJunkFax(fax.documentCategory) && !hasFilingError(fax.filingError);
    })
    .map<WorklistItem>((fax) => {
      const errorMessage =
        (fax.metadata?.error as string) ??
        (fax.metadata?.error_code as string) ??
        "Processing failed";

      const isFailed = fax.status === "failed";
      const isReferral = !isFailed && !!fax.isReferral;

      const description = isFailed
        ? errorMessage
        : fax.documentDescription ??
          fax.description ??
          fax.documentCategory ??
          "Awaiting review";

      return {
        id: isFailed ? `wl-failed-${fax.id}` : `wl-review-${fax.id}`,
        faxId: fax.id,
        referralId: isReferral ? fax.referralId : undefined,
        category: isReferral ? "referral" : "unclassified",
        isUrgent: fax.priority === "abnormal",
        queuePosition: 0,
        priorityScore: isFailed ? 30 : isReferral ? 40 : 35,
        priority: fax.priority,
        slaDeadline: fax.slaDeadline,
        slaStatus: "green",
        claimable: true,
        pageCount: fax.pageCount,
        receivedAt: fax.receivedAt,
        patientName: fax.patientName,
        documentSourceName: fax.documentSourceName,
        clinicName: fax.senderName,
        documentCategory: fax.documentCategory,
        description,
        pdfUrl: fax.pdfUrl,
        completenessScore: isReferral ? 0 : undefined,
      };
    });
});

export const junkWorklistItemsAtom = atom((get) => {
  const faxes = get(faxesAtom);
  return faxes
    .filter((fax) => fax.status === "pending-review" && isJunkFax(fax.documentCategory))
    .map<WorklistItem>((fax) => ({
      id: `junk-${fax.id}`,
      faxId: fax.id,
      category: 'junk',
      isUrgent: fax.priority === 'abnormal',
      queuePosition: 0,
      priorityScore: 0,
      priority: fax.priority,
      slaDeadline: fax.slaDeadline,
      slaStatus: 'green',
      claimable: true,
      patientName: fax.patientName,
      documentSourceName: fax.documentSourceName,
      clinicName: fax.senderName,
      documentCategory: fax.documentCategory,
      pageCount: fax.pageCount,
      receivedAt: fax.receivedAt,
      description: fax.documentDescription ?? fax.description ?? '',
      pdfUrl: fax.pdfUrl,
    }));
});

export const filingErrorWorklistItemsAtom = atom((get) => {
  const faxes = get(faxesAtom);
  return faxes
    .filter((fax) => hasFilingError(fax.filingError))
    .map<WorklistItem>((fax) => ({
      id: `filing-error-${fax.id}`,
      faxId: fax.id,
      category: 'filing-error',
      isUrgent: fax.priority === 'abnormal',
      queuePosition: 0,
      priorityScore: 20,
      priority: fax.priority,
      slaDeadline: fax.slaDeadline,
      slaStatus: 'red',
      claimable: true,
      patientName: fax.patientName,
      documentSourceName: fax.documentSourceName,
      clinicName: fax.senderName,
      documentCategory: fax.documentCategory,
      pageCount: fax.pageCount,
      receivedAt: fax.receivedAt,
      description: fax.filingError ?? 'Filing failed',
      pdfUrl: fax.pdfUrl,
    }));
});

export const allWorklistItemsAtom = atom((get) => [
  ...get(worklistItemsAtom),
  ...get(junkWorklistItemsAtom),
  ...get(filingErrorWorklistItemsAtom),
]);

export function computeQueueStats(items: WorklistItem[]): QueueStats {
  const unclassifiedCount = items.filter((i) => i.category === "unclassified").length;
  const referralCount = items.filter((i) => i.category === "referral").length;
  const junkCount = items.filter((i) => i.category === "junk").length;
  const filingErrorCount = items.filter((i) => i.category === "filing-error").length;
  const urgentCount = items.filter((i) => i.isUrgent).length;

  const now = Date.now();
  const waitTimes = items.map((i) => (now - new Date(i.receivedAt).getTime()) / 60_000);
  const averageWaitMinutes = waitTimes.length > 0
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 0;

  const breached = items.filter((i) => i.slaStatus === "breached").length;

  return {
    totalItems: items.length,
    unclassifiedCount,
    referralCount,
    junkCount,
    filingErrorCount,
    urgentCount,
    averageWaitMinutes,
    slaBreachCount: breached,
    itemsProcessedToday: 0,
    itemsProcessedThisHour: 0,
  };
}
