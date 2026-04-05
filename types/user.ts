export type UserRole = "admin" | "clerk" | "nurse" | "physician";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  initials: string;
}
