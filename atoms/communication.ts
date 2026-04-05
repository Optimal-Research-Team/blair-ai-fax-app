"use client";

import { atom } from "jotai";
import { Communication, CommunicationTemplate } from "@/types";

export const communicationsAtom = atom<Communication[]>([]);
export const templatesAtom = atom<CommunicationTemplate[]>([]);
export const activeTabAtom = atom<"templates" | "log" | "followups">(
  "templates"
);

export const addCommunicationAtom = atom(
  null,
  (get, set, comm: Communication) => {
    set(communicationsAtom, [comm, ...get(communicationsAtom)]);
  }
);

export const updateCommunicationAtom = atom(
  null,
  (
    get,
    set,
    { id, updates }: { id: string; updates: Partial<Communication> }
  ) => {
    set(
      communicationsAtom,
      get(communicationsAtom).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    );
  }
);
