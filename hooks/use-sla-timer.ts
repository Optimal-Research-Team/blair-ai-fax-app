"use client";

import { useState, useEffect } from "react";
import { formatTimeRemaining, getSlaStatusFromDeadline } from "@/lib/sla";
import { SlaStatus } from "@/types/worklist";

interface SlaTimerResult {
  timeRemaining: string;
  status: SlaStatus;
  isBreached: boolean;
  percentRemaining: number;
}

function calculate(deadline: string, receivedAt: string): SlaTimerResult {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const receivedDate = new Date(receivedAt);
  const totalDuration = deadlineDate.getTime() - receivedDate.getTime();
  const remaining = deadlineDate.getTime() - now.getTime();
  const percentRemaining = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

  return {
    timeRemaining: formatTimeRemaining(deadline),
    status: getSlaStatusFromDeadline(deadline, receivedAt),
    isBreached: remaining <= 0,
    percentRemaining,
  };
}

const INITIAL_RESULT: SlaTimerResult = {
  timeRemaining: "—",
  status: "green",
  isBreached: false,
  percentRemaining: 100,
};

export function useSlaTimer(deadline: string, receivedAt: string): SlaTimerResult {
  const [result, setResult] = useState<SlaTimerResult>(INITIAL_RESULT);

  useEffect(() => {
    setResult(calculate(deadline, receivedAt));

    const status = getSlaStatusFromDeadline(deadline, receivedAt);
    const interval = status === "red" || status === "breached" ? 1000 : 60000;

    const timer = setInterval(() => {
      setResult(calculate(deadline, receivedAt));
    }, interval);

    return () => clearInterval(timer);
  }, [deadline, receivedAt]);

  return result;
}
