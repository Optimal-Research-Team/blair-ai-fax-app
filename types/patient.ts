export interface PatientAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface Patient {
  id: string;
  phn: string;
  ohipNumber?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F" | "X";
  phone: string;
  email?: string;
  address: PatientAddress;
  mrpId?: string;
  conditions: string[];
  medications: string[];
  lastVisit?: string;
  lastExternalSync?: string;
  faxCount?: number;
  referralCount?: number;
}

export interface PatientMatch {
  patient: Patient;
  matchScore: number;
  matchedFields: string[];
}
