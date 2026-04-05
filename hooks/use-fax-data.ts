'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { faxesAtom, lifecycleItemsAtom } from '@/atoms/inbox'
import { fetchClassifications, fetchLifecycleItems, autoFileById } from '@/app/actions/fax'
import { mapLifecycleToFax } from '@/lib/supabase/mappers'
import { handleActionError } from '@/lib/handle-action-error'
import { createClient } from '@/utils/supabase/client'

const DEBOUNCE_MS = 2000

/**
 * Fetches fax classifications from Supabase on mount and subscribes
 * to realtime INSERT/UPDATE events on the fax_classifications table.
 * Failed faxes now have classification records, so they arrive through
 * the same classifications channel (no separate failed-jobs fetch needed).
 * On any change, re-fetches the full dataset via server action (debounced).
 */
export function useFaxData() {
  const setFaxes = useSetAtom(faxesAtom)
  const setLifecycleItems = useSetAtom(lifecycleItemsAtom)
  const initializedRef = useRef(false)
  const lifecycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const classificationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const refreshLifecycle = useCallback(() => {
    fetchLifecycleItems().then((result) => {
      if (result.success) {
        setLifecycleItems(result.data.map(mapLifecycleToFax))
      }
    })
  }, [setLifecycleItems])

  const refreshClassifications = useCallback(() => {
    fetchClassifications().then((result) => {
      if (result.success) {
        setFaxes(result.data)
      } else {
        handleActionError(result)
      }
    })
  }, [setFaxes])

  const debouncedRefreshLifecycle = useCallback(() => {
    if (lifecycleTimerRef.current) clearTimeout(lifecycleTimerRef.current)
    lifecycleTimerRef.current = setTimeout(refreshLifecycle, DEBOUNCE_MS)
  }, [refreshLifecycle])

  const debouncedRefreshClassifications = useCallback(() => {
    if (classificationsTimerRef.current)
      clearTimeout(classificationsTimerRef.current)
    classificationsTimerRef.current = setTimeout(
      refreshClassifications,
      DEBOUNCE_MS
    )
  }, [refreshClassifications])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Initial fetch — lifecycle + classifications (includes failed stubs)
    refreshLifecycle()
    refreshClassifications()

    // Realtime subscriptions (debounced)
    const supabase = createClient()

    const lifecycleChannel = supabase
      .channel('fax-lifecycle-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'fax_ai',
          table: 'fax_lifecycle',
        },
        () => {
          debouncedRefreshLifecycle()
        }
      )
      .subscribe()

    const classificationsChannel = supabase
      .channel('fax-classifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'fax_ai',
          table: 'fax_classifications',
        },
        () => {
          debouncedRefreshClassifications()
          // A new classification means lifecycle moved to terminal — refresh
          debouncedRefreshLifecycle()
        }
      )
      .subscribe()

    // Listen for server broadcast after classification completes — auto-file after 15s
    const autoFileEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTO_FILE === 'true'
    const autoFileTimers = new Set<ReturnType<typeof setTimeout>>()

    const autoFileChannel = autoFileEnabled
      ? supabase
          .channel('classification-complete')
          .on('broadcast', { event: 'classified' }, (payload) => {
            const classificationId = payload.payload?.classificationId as string
            const classificationStatus = payload.payload?.classificationStatus as string
            if (!classificationId) return

            if (classificationStatus === 'needs_review') {
              console.log(
                `[auto-file] Classification ${classificationId} is needs_review — skipping auto-file`
              )
              return
            }

            console.log(
              `[auto-file] Received classification ${classificationId} (${classificationStatus}) — filing in 15s`
            )
            const timer = setTimeout(() => {
              autoFileTimers.delete(timer)
              autoFileById(classificationId).then((result) => {
                if (result.success) {
                  console.log(
                    `[auto-file] Filed classification ${classificationId}`
                  )
                  // Refresh UI to reflect the filing
                  refreshClassifications()
                  refreshLifecycle()
                } else {
                  console.error(
                    `[auto-file] Failed to file ${classificationId}: ${result.error}`
                  )
                }
              })
            }, 15_000)
            autoFileTimers.add(timer)
          })
          .subscribe()
      : null

    return () => {
      if (lifecycleTimerRef.current) clearTimeout(lifecycleTimerRef.current)
      if (classificationsTimerRef.current)
        clearTimeout(classificationsTimerRef.current)
      autoFileTimers.forEach((t) => clearTimeout(t))
      autoFileTimers.clear()
      supabase.removeChannel(lifecycleChannel)
      supabase.removeChannel(classificationsChannel)
      if (autoFileChannel) supabase.removeChannel(autoFileChannel)
    }
  }, [
    setFaxes,
    setLifecycleItems,
    refreshLifecycle,
    refreshClassifications,
    debouncedRefreshLifecycle,
    debouncedRefreshClassifications,
  ])
}
