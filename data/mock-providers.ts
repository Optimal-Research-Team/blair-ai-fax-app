export interface ReferringProvider {
  id: string
  name: string
  clinic: string
  faxNumber: string
  phone?: string
  specialty?: string
}

/** Mock providers disabled — real data flows through Supabase */
export const mockReferringProviders: ReferringProvider[] = [];
