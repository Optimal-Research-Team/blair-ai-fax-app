import { createClient as createJsClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'fax_ai' } }
  )
}
