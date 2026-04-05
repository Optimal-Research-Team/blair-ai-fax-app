import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.*\\.(?:svg|png)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
