export interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  designation: "MD" | "DO" | "NP";
  specialty: string;
  cpsoNumber?: string;
  billingNumber?: string;
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicProvince: string;
  phone: string;
  fax: string;
  email?: string;
  npiNumber?: string;
}

export interface PhysicianMatch {
  physician: Physician;
  matchScore: number;
  matchedFields: string[];
}
