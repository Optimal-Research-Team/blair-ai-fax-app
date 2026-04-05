'use client'

import { useFaxData } from '@/hooks/use-fax-data'
import { useOrganization } from '@/hooks/use-organization'
import { useCurrentUser } from '@/hooks/use-current-user'

export function FaxSimulationProvider() {
  useCurrentUser()
  useFaxData()
  useOrganization()
  return null
}
