export interface DashboardMetrics {
  queueDepth: number;
  autoFileRate: number;
  slaComplianceRate: number;
  avgProcessingTimeMinutes: number;
  faxesProcessedToday: number;
  faxesProcessedThisWeek: number;
  referralsReceivedToday: number;
  referralsCompletedToday: number;
}

export interface ThroughputDataPoint {
  time: string;
  faxesProcessed: number;
  date: string;
}

export interface DocTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StaffProductivity {
  staffId: string;
  staffName: string;
  role: string;
  faxesProcessed: number;
  avgTimePerFaxMinutes: number;
  slaComplianceRate: number;
}

export interface ReferralFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}
