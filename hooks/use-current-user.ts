'use client'

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { currentUserAtom } from '@/atoms/user'
import { getCurrentUser } from '@/app/actions/user'

/**
 * Fetches the authenticated Supabase user on mount and stores in the atom.
 */
export function useCurrentUser() {
  const setUser = useSetAtom(currentUserAtom)

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setUser(user)
    })
  }, [setUser])
}
