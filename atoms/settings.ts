"use client";

import { atom } from "jotai";
import { AppSettings, DocumentCategoryConfig, FaxLineConfig } from "@/types";

const defaultSettings: AppSettings = {
  shadowModeEnabled: false,
  defaultConfidenceThreshold: 90,
  requireMrpAssignment: true,
  autoCreatePatientChart: false,
};

export const settingsAtom = atom<AppSettings>(defaultSettings);
export const documentCategoriesAtom = atom<DocumentCategoryConfig[]>([]);
export const faxLinesAtom = atom<FaxLineConfig[]>([]);

export const updateSettingsAtom = atom(
  null,
  (get, set, updates: Partial<AppSettings>) => {
    set(settingsAtom, { ...get(settingsAtom), ...updates });
  }
);

export const updateDocumentCategoryAtom = atom(
  null,
  (
    get,
    set,
    { id, updates }: { id: string; updates: Partial<DocumentCategoryConfig> }
  ) => {
    set(
      documentCategoriesAtom,
      get(documentCategoriesAtom).map((dt) =>
        dt.id === id ? { ...dt, ...updates } : dt
      )
    );
  }
);

export const updateFaxLineAtom = atom(
  null,
  (
    get,
    set,
    { id, updates }: { id: string; updates: Partial<FaxLineConfig> }
  ) => {
    set(
      faxLinesAtom,
      get(faxLinesAtom).map((fl) =>
        fl.id === id ? { ...fl, ...updates } : fl
      )
    );
  }
);
