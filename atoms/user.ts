'use client'

import { atom } from 'jotai'
import type { AuthUserData } from '@/app/actions/user'

/**
 * Current authenticated user. Null until hydrated from Supabase Auth.
 * Replaces the hardcoded `currentUser` from data/mock-staff.ts.
 */
export const currentUserAtom = atom<AuthUserData | null>(null)
