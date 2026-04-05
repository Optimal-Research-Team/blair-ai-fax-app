'use client'

import { useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { organizationsAtom, selectedOrgIdAtom } from '@/atoms/organization'
import { fetchOrganizationsWithCategories } from '@/app/actions/fax'
import { handleActionError } from '@/lib/handle-action-error'

/**
 * Fetches organizations (with EMR categories) on mount and writes them to the
 * global atom. Auto-selects the first org if the stored selection is invalid.
 *
 * Should be called once from a top-level provider (e.g. FaxSimulationProvider).
 */
export function useOrganization() {
  const setOrganizations = useSetAtom(organizationsAtom)
  const selectedOrgId = useAtomValue(selectedOrgIdAtom)
  const setSelectedOrgId = useSetAtom(selectedOrgIdAtom)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    fetchOrganizationsWithCategories().then((result) => {
      if (result.success) {
        setOrganizations(result.data)
        // Auto-select if stored ID doesn't match any fetched org
        const ids = result.data.map((o) => o.id)
        if (!ids.includes(selectedOrgId) && result.data.length > 0) {
          setSelectedOrgId(result.data[0].id)
        }
      } else {
        handleActionError(result)
      }
    })
  }, [setOrganizations, selectedOrgId, setSelectedOrgId])
}
