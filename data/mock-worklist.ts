import { WorklistItem, QueueStats, WorklistView } from "@/types/worklist";

/** Worklist starts empty — items arrive as faxes are processed by the simulation */
export const mockWorklistItems: WorklistItem[] = [];

export const mockQueueStats: QueueStats = {
  totalItems: 0,
  unclassifiedCount: 0,
  referralCount: 0,
  junkCount: 0,
  filingErrorCount: 0,
  urgentCount: 0,
  averageWaitMinutes: 0,
  slaBreachCount: 0,
  itemsProcessedToday: 0,
  itemsProcessedThisHour: 0,
};

export function getWorklistByView(view: WorklistView): WorklistItem[] {
  let items = mockWorklistItems;

  if (view !== "all") {
    items = items.filter((item) => item.category === view);
  }

  return items.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return b.priorityScore - a.priorityScore;
  });
}
