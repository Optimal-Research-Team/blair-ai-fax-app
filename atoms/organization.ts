'use client'

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { OrganizationWithCategories } from '@/app/actions/fax'

/** All organizations (with their EMR categories) fetched from the DB. */
export const organizationsAtom = atom<OrganizationWithCategories[]>([])

/** Persisted selected organization ID — survives page refresh. */
export const selectedOrgIdAtom = atomWithStorage<string>(
  'blair-fax-selected-org',
  ''
)

/** Derived: the full selected organization object. */
export const selectedOrgAtom = atom((get) => {
  const orgs = get(organizationsAtom)
  const id = get(selectedOrgIdAtom)
  return orgs.find((o) => o.id === id) ?? null
})

/** Derived: document categories for the selected org (the single source of truth). */
export const orgCategoriesAtom = atom((get) => {
  const org = get(selectedOrgAtom)
  return org?.categories ?? []
})
