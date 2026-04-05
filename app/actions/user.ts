'use server'

import { createClient } from '@/utils/supabase/server'

export interface AuthUserData {
  id: string
  email: string
  name: string
  initials: string
}

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0]
  // Try splitting on dots/underscores/hyphens for "first.last" patterns
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ')
  }
  // Single part — just capitalize
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase()
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] || '?').toUpperCase()
}

export async function getCurrentUser(): Promise<AuthUserData | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    deriveNameFromEmail(user.email || '')

  return {
    id: user.id,
    email: user.email || '',
    name: fullName,
    initials: computeInitials(fullName),
  }
}
