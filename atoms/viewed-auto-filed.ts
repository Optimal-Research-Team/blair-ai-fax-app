"use client";

import { atomWithStorage } from "jotai/utils";

export const viewedAutoFiledIdsAtom = atomWithStorage<string[]>(
  "blair-viewed-auto-filed",
  []
);

/**
 * Note: To add an id, use useSetAtom(viewedAutoFiledIdsAtom) and call:
 *   setIds((prev) => prev.includes(id) ? prev : [...prev, id])
 *
 * To check if viewed: viewedIds.includes(id)
 */
