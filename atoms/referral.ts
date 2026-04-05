"use client";

import { atom } from "jotai";
import { Referral, ReferralStatus } from "@/types";

export const referralsAtom = atom<Referral[]>([]);
export const currentReferralIdAtom = atom<string | null>(null);

export const updateReferralAtom = atom(
  null,
  (get, set, { id, updates }: { id: string; updates: Partial<Referral> }) => {
    set(
      referralsAtom,
      get(referralsAtom).map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }
);

export const updateReferralStatusAtom = atom(
  null,
  (get, set, { id, status }: { id: string; status: ReferralStatus }) => {
    set(
      referralsAtom,
      get(referralsAtom).map((r) => (r.id === id ? { ...r, status } : r))
    );
  }
);

export const setReferralStepAtom = atom(
  null,
  (get, set, { id, step }: { id: string; step: number }) => {
    set(
      referralsAtom,
      get(referralsAtom).map((r) =>
        r.id === id ? { ...r, currentStep: step } : r
      )
    );
  }
);

export const toggleCompletenessItemAtom = atom(
  null,
  (
    get,
    set,
    { referralId, itemId }: { referralId: string; itemId: string }
  ) => {
    set(
      referralsAtom,
      get(referralsAtom).map((r) => {
        if (r.id !== referralId) return r;
        const items = r.completenessItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status:
                  item.status === "found"
                    ? ("missing" as const)
                    : ("found" as const),
              }
            : item
        );
        const requiredItems = items.filter((i) => i.required);
        const score =
          requiredItems.length > 0
            ? Math.round(
                (requiredItems.filter((i) => i.status === "found").length /
                  requiredItems.length) *
                  100
              )
            : 100;
        return { ...r, completenessItems: items, completenessScore: score };
      })
    );
  }
);
