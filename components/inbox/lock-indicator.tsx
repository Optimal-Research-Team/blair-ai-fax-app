"use client";

import { Lock } from "lucide-react";
import { useLock } from "@/atoms/lock";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/atoms/user";
import { LOCK_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LockIndicatorProps {
  documentId: string;
}

export function LockIndicator({ documentId }: LockIndicatorProps) {
  const user = useAtomValue(currentUserAtom);
  const { lockedByUser: lockedUser } = useLock(documentId);

  if (!lockedUser) return null;

  const isMe = lockedUser.id === user?.id;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs",
        isMe ? LOCK_COLORS.self : LOCK_COLORS.other
      )}
      title={isMe ? "Locked by you" : "Locked by another user"}
    >
      <Lock className="h-3 w-3" />
      <span>{isMe ? "You" : "Other"}</span>
    </div>
  );
}
