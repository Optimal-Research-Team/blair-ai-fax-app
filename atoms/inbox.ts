"use client";

import { atom } from "jotai";
import { Fax, FaxStatus, Priority } from "@/types";

export interface InboxFilters {
  search: string;
  status: FaxStatus | "all";
  priority: Priority | "all";
  documentCategory: string | "all";
  dateRange: { from?: string; to?: string };
}

const defaultFilters: InboxFilters = {
  search: "",
  status: "all",
  priority: "all",
  documentCategory: "all",
  dateRange: {},
};

export const faxesAtom = atom<Fax[]>([]);
export const lifecycleItemsAtom = atom<Fax[]>([]);
export const allInboxItemsAtom = atom((get) => {
  const lifecycle = get(lifecycleItemsAtom);
  const classified = get(faxesAtom);
  const lifecycleByJobId = new Map<string, Fax>();

  for (const item of lifecycle) {
    const key = item.jobId ?? item.id;
    const existing = lifecycleByJobId.get(key);
    if (!existing) {
      lifecycleByJobId.set(key, item);
      continue;
    }

    if (new Date(item.receivedAt).getTime() > new Date(existing.receivedAt).getTime()) {
      lifecycleByJobId.set(key, item);
    }
  }

  const classifiedJobIds = new Set(
    classified
      .map((fax) => fax.jobId)
      .filter((jobId): jobId is string => typeof jobId === "string")
  );

  const visibleLifecycle = Array.from(lifecycleByJobId.values()).filter((item) => {
    if (!item.jobId) {
      return true;
    }
    return !classifiedJobIds.has(item.jobId);
  });

  return [...visibleLifecycle, ...classified];
});
export const inboxFiltersAtom = atom<InboxFilters>(defaultFilters);
export const viewModeAtom = atom<"table" | "grid">("table");
export const selectedFaxIdsAtom = atom<string[]>([]);

export const resetFiltersAtom = atom(null, (_get, set) => {
  set(inboxFiltersAtom, defaultFilters);
});

export const toggleFaxSelectionAtom = atom(null, (get, set, id: string) => {
  const current = get(selectedFaxIdsAtom);
  set(
    selectedFaxIdsAtom,
    current.includes(id) ? current.filter((fid) => fid !== id) : [...current, id]
  );
});

export const selectAllFaxesAtom = atom(null, (get, set) => {
  set(
    selectedFaxIdsAtom,
    get(faxesAtom).map((f) => f.id)
  );
});

export const addFaxAtom = atom(null, (get, set, fax: Fax) => {
  set(faxesAtom, [fax, ...get(faxesAtom)]);
});

export const updateFaxAtom = atom(
  null,
  (get, set, { id, updates }: { id: string; updates: Partial<Fax> }) => {
    set(
      faxesAtom,
      get(faxesAtom).map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }
);

export const splitFaxAtom = atom(
  null,
  (get, set, { originalId, newFaxes }: { originalId: string; newFaxes: Fax[] }) => {
    set(faxesAtom, [
      ...newFaxes,
      ...get(faxesAtom).filter((f) => f.id !== originalId),
    ]);
  }
);
