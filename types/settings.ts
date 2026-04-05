import { Priority } from "./fax";

export interface DocumentCategoryConfig {
  id: string;
  category: string;
  autoFileEnabled: boolean;
  autoFileThreshold: number;
  priorityWeight: number;
  slaMinutes: Record<Priority, number>;
  isActive: boolean;
  descriptionTemplate?: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "error" | "pending";
  lastSync?: string;
  icon: string;
  category: "fax" | "emr" | "crm" | "messaging";
}

export interface FaxLineConfig {
  id: string;
  name: string;
  number: string;
  isActive: boolean;
  assignedDepartment?: string;
  dailyVolume: number;
}

export interface AppSettings {
  shadowModeEnabled: boolean;
  defaultConfidenceThreshold: number;
  requireMrpAssignment: boolean;
  autoCreatePatientChart: boolean;
}
