import { User } from "@/types";

/** Mock staff disabled — keeping currentUser as demo placeholder */
export const mockStaff: User[] = [];

export const currentUser: User = {
  id: "user-3",
  name: "Sarah Mitchell",
  email: "smitchell@sunnybrookheart.ca",
  role: "clerk",
  isActive: true,
  initials: "SM",
};

// Provider inboxes for Cerebrum EMR routing
export interface ProviderInbox {
  id: string;
  name: string;
  specialty: string;
  availability: "Available" | "Busy" | "On Vacation";
}

export const providerInboxes: ProviderInbox[] = [];
