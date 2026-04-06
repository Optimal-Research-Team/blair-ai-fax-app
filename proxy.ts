import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // Skip middleware in static export mode
  if (process.env.GITHUB_PAGES === 'true') {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.*\\.(?:svg|png)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
