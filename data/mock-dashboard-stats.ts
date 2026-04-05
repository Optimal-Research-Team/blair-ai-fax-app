import { DashboardMetrics, ThroughputDataPoint, DocTypeBreakdown, StaffProductivity, ReferralFunnelStage } from "@/types";

/** Mock dashboard stats disabled */
export const mockDashboardMetrics: DashboardMetrics = {
  queueDepth: 0,
  autoFileRate: 0,
  slaComplianceRate: 0,
  avgProcessingTimeMinutes: 0,
  faxesProcessedToday: 0,
  faxesProcessedThisWeek: 0,
  referralsReceivedToday: 0,
  referralsCompletedToday: 0,
};

export const mockThroughputData: ThroughputDataPoint[] = [];
export const mockDocTypeBreakdown: DocTypeBreakdown[] = [];
export const mockStaffProductivity: StaffProductivity[] = [];
export const mockReferralFunnel: ReferralFunnelStage[] = [];
