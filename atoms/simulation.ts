"use client"

import { atom } from "jotai"
import { Referral } from "@/types/referral"
import { Patient } from "@/types/patient"
import { Communication } from "@/types/communication"

// ---------------------------------------------------------------------------
// Zendesk ticket type
// ---------------------------------------------------------------------------

export type ZendeskTicketStatus = "open" | "in-progress" | "resolved"
export type ZendeskTicketSource = "auto" | "manual"

export type ZendeskSlaStatus = "overdue" | "approaching" | "on-track"

export interface ZendeskTicket {
  id: string
  ticketNumber: string
  patientName: string
  urgencyLevel: "STAT" | "Urgent" | null
  reason: string
  referringPhysician: string
  createdAt: string
  slaDueAt: string // ISO timestamp for SLA deadline
  status: ZendeskTicketStatus
  source: ZendeskTicketSource
}

// ---------------------------------------------------------------------------
// Slack event types
// ---------------------------------------------------------------------------

export type SlackAlertSeverity = "critical" | "warning" | "info"

export interface SlackAlert {
  id: string
  timestamp: string
  channel: string
  severity: SlackAlertSeverity
  message: string
  patientName: string | null
}

// ---------------------------------------------------------------------------
// Atoms: all start empty — mock data disabled
// ---------------------------------------------------------------------------

export const simulatedReferralsAtom = atom<Referral[]>([])

export const addReferralAtom = atom(
  null,
  (get, set, ref: Referral) => {
    const existing = get(simulatedReferralsAtom)
    if (existing.some((r) => r.id === ref.id)) return
    set(simulatedReferralsAtom, [...existing, ref])
  }
)

export const updateSimulatedReferralAtom = atom(
  null,
  (get, set, { id, updates }: { id: string; updates: Partial<Referral> }) => {
    const existing = get(simulatedReferralsAtom)
    const idx = existing.findIndex((r) => r.id === id)
    if (idx >= 0) {
      set(
        simulatedReferralsAtom,
        existing.map((r) => (r.id === id ? { ...r, ...updates } : r))
      )
    }
  }
)

export const upsertReferralAtom = atom(
  null,
  (get, set, referral: Referral) => {
    const existing = get(simulatedReferralsAtom)
    const idx = existing.findIndex((r) => r.id === referral.id)
    if (idx >= 0) {
      set(
        simulatedReferralsAtom,
        existing.map((r) => (r.id === referral.id ? referral : r))
      )
    } else {
      set(simulatedReferralsAtom, [...existing, referral])
    }
  }
)

export const simulatedPatientsAtom = atom<Patient[]>([])

export const addPatientAtom = atom(
  null,
  (get, set, patient: Patient) => {
    const existing = get(simulatedPatientsAtom)
    if (existing.some((p) => p.id === patient.id)) return
    set(simulatedPatientsAtom, [...existing, patient])
  }
)

export const zendeskTicketsAtom = atom<ZendeskTicket[]>([])

export const addZendeskTicketAtom = atom(
  null,
  (get, set, ticket: ZendeskTicket) => {
    const existing = get(zendeskTicketsAtom)
    if (existing.some((t) => t.id === ticket.id)) return
    set(zendeskTicketsAtom, [...existing, ticket])
  }
)

export const slackAlertsAtom = atom<SlackAlert[]>([])

export const addSlackAlertAtom = atom(
  null,
  (get, set, alert: SlackAlert) => {
    const existing = get(slackAlertsAtom)
    if (existing.some((a) => a.id === alert.id)) return
    set(slackAlertsAtom, [alert, ...existing])
  }
)

export const simulatedCommunicationsAtom = atom<Communication[]>([])

export const addCommunicationAtom = atom(
  null,
  (get, set, comm: Communication) => {
    const existing = get(simulatedCommunicationsAtom)
    if (existing.some((c) => c.id === comm.id)) return
    set(simulatedCommunicationsAtom, [comm, ...existing])
  }
)
