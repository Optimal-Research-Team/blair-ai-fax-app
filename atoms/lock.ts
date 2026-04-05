"use client";

import { atom, useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom } from "@/atoms/user";

interface Lock {
  documentId: string;
  userId: string;
  lockedAt: string;
}

export const locksAtom = atom<Lock[]>([]);

export const lockDocumentAtom = atom(
  null,
  (get, set, documentId: string) => {
    const user = get(currentUserAtom);
    if (!user) return;
    const locks = get(locksAtom);
    const existing = locks.find((l) => l.documentId === documentId);
    // If already locked by current user, just update timestamp
    if (existing?.userId === user.id) {
      set(
        locksAtom,
        locks.map((l) =>
          l.documentId === documentId
            ? { ...l, lockedAt: new Date().toISOString() }
            : l
        )
      );
      return;
    }
    // If locked by someone else, don't override
    if (existing) return;
    // Add new lock
    set(locksAtom, [
      ...locks,
      {
        documentId,
        userId: user.id,
        lockedAt: new Date().toISOString(),
      },
    ]);
  }
);

export const unlockDocumentAtom = atom(
  null,
  (get, set, documentId: string) => {
    const user = get(currentUserAtom);
    if (!user) return;
    const locks = get(locksAtom);
    const lock = locks.find((l) => l.documentId === documentId);
    // Only unlock if current user owns the lock
    if (lock?.userId === user.id) {
      set(
        locksAtom,
        locks.filter((l) => l.documentId !== documentId)
      );
    }
  }
);

/** Pure helper — call with the locks array and the current user ID */
export function isLockedByMe(locks: Lock[], documentId: string, userId: string | undefined): boolean {
  if (!userId) return false;
  const lock = locks.find((l) => l.documentId === documentId);
  return lock?.userId === userId;
}

export function isLockedByOther(locks: Lock[], documentId: string, userId: string | undefined): boolean {
  if (!userId) return false;
  const lock = locks.find((l) => l.documentId === documentId);
  return !!lock && lock.userId !== userId;
}

/**
 * Convenience hook — returns lock state + actions for a given document.
 */
export function useLock(documentId: string) {
  const user = useAtomValue(currentUserAtom);
  const locks = useAtomValue(locksAtom);
  const lockDocument = useSetAtom(lockDocumentAtom);
  const unlockDocument = useSetAtom(unlockDocumentAtom);

  const lock = locks.find((l) => l.documentId === documentId);

  return {
    lockDocument,
    unlockDocument,
    isLockedByOther: !!lock && lock.userId !== user?.id,
    lockedByUser: lock ? { id: lock.userId } : null,
  };
}

/**
 * Hook for components that need to check locks for arbitrary documents.
 */
export function useLocks() {
  const user = useAtomValue(currentUserAtom);
  const locks = useAtomValue(locksAtom);
  return {
    getLockedByUser: (documentId: string) => {
      const lock = locks.find((l) => l.documentId === documentId);
      if (!lock) return null;
      return { id: lock.userId, isMe: lock.userId === user?.id };
    },
  };
}
