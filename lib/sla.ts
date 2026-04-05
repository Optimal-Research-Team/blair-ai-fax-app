import { differenceInMinutes, differenceInSeconds, addMinutes } from "date-fns";
import { Priority } from "@/types/fax";
import { SlaStatus } from "@/types/worklist";

export function calculateSlaDeadline(receivedAt: string, slaMinutes: number): string {
  return addMinutes(new Date(receivedAt), slaMinutes).toISOString();
}

export function getSlaStatusFromDeadline(deadline: string, receivedAt: string): SlaStatus {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const receivedDate = new Date(receivedAt);

  const totalDuration = differenceInMinutes(deadlineDate, receivedDate);
  const remaining = differenceInMinutes(deadlineDate, now);

  if (remaining <= 0) return "breached";

  const ratio = remaining / Math.max(totalDuration, 1);

  if (ratio > 0.5) return "green";
  if (ratio > 0.25) return "yellow";
  return "red";
}

export function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const totalSeconds = differenceInSeconds(deadlineDate, now);

  if (totalSeconds <= 0) {
    const overSeconds = Math.abs(totalSeconds);
    if (overSeconds < 60) return `${overSeconds}s overdue`;
    const overMinutes = Math.floor(overSeconds / 60);
    if (overMinutes < 60) return `${overMinutes}m overdue`;
    const overHours = Math.floor(overMinutes / 60);
    const remMinutes = overMinutes % 60;
    return `${overHours}h ${remMinutes}m overdue`;
  }

  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}

export function calculatePriorityScore(
  priority: Priority,
  slaDeadline: string,
  receivedAt: string,
  docTypePriorityWeight: number
): number {
  const urgencyWeight = { abnormal: 80, normal: 20 }[priority];

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const received = new Date(receivedAt);
  const totalDuration = differenceInMinutes(deadline, received);
  const remaining = differenceInMinutes(deadline, now);
  const slaProximity = Math.max(0, 100 - (remaining / Math.max(totalDuration, 1)) * 100);

  const docWeight = docTypePriorityWeight * 10;

  const ageMinutes = differenceInMinutes(now, received);
  const ageWeight = Math.min(100, ageMinutes / 10);

  return urgencyWeight * 0.4 + slaProximity * 0.3 + docWeight * 0.2 + ageWeight * 0.1;
}

// Re-export centralized SLA colors
export { SLA_STATUS_COLORS } from "@/lib/constants";
