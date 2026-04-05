# Blair AI Fax Sorter - Feature Inventory

**Generated:** February 18, 2026
**PRD Version:** 1.1 (Feb 13, 2026)
**Prototype Status:** Frontend Complete, No Backend

---

## Legend

- **Built** = Frontend UI exists and is functional with mock data
- **Connected** = Wired to a real backend/service and working end-to-end
- **Needs Building** = Doesn't exist yet (or is just a stub)

---

## Authentication & Users

| Feature | Status | Notes |
|---|---|---|
| Login page | Built | Simple cookie-based auth against env vars |
| Supabase Auth integration | Needs Building | Required for real user accounts |
| Role-based access (clerk vs admin) | Needs Building | No role system exists |
| User identity (for locks, audit trail) | Built | Hardcoded `currentUser` mock |

## Fax Inbox (`/inbox`)

| Feature | Status | Notes |
|---|---|---|
| Data table with sortable columns | Built | TanStack React Table, fully functional |
| Grid view toggle | Built | Card-based alternative layout |
| Search (patient, sender, doc type, fax #) | Built | Debounced, filters mock data |
| Filter by status | Built | pending-review, in-progress, flagged, auto-filed, completed |
| Filter by priority | Built | Urgent / Routine |
| Filter by document type | Built | All configured doc types |
| Filter by date range | Built | |
| Bulk selection | Built | Select multiple faxes |
| SLA countdown timers | Built | Color-coded (green/yellow/red/breached) |
| Priority badges | Built | Visual indicators |
| Patient match badges | Built | Shows confidence % or "Not Found" |
| Lock indicators | Built | Shows who has document open |
| Confidence bar | Built | Visual AI confidence display |
| Unsorted reason badge | Built | Explains why fax wasn't auto-filed |
| Pagination | Built | 25 items per page |
| Real-time fax arrival | Built | Fax simulation dev tool (mock only) |
| Actual incoming fax webhook (SRFax) | Needs Building | No real fax ingestion |
| Persist filters/state to backend | Needs Building | Currently client-side only |

## Fax Viewer (`/fax/[id]`)

| Feature | Status | Notes |
|---|---|---|
| 3-panel layout (thumbnails, viewer, review) | Built | |
| Page thumbnail navigation | Built | Click to jump to page |
| Document viewer with zoom/rotate | Built | Mock placeholder images |
| Real PDF/image rendering | Needs Building | Need actual fax files from storage |
| Document type classification dropdown | Built | AI suggestion + manual override |
| Confidence score display | Built | |
| Priority assignment | Built | |
| Patient match display | Built | |
| Notes field | Built | |
| Mark Complete action | Built | Updates status in Jotai |
| Mark as Referral action | Built | Creates referral record |
| Split Document action | Built | Navigates to split view |
| Flag for Review action | Built | |
| Record locking (acquire/release) | Built | Jotai-based, client-side only |
| Record locking (real-time, multi-user) | Needs Building | Needs Supabase Realtime |
| SLA timer in header | Built | |

## Document Splitting (`/split/[id]`)

| Feature | Status | Notes |
|---|---|---|
| Page strip view | Built | Visual page layout |
| Click-to-split between pages | Built | Creates segment markers |
| Per-segment patient assignment | Built | |
| Per-segment document type assignment | Built | |
| Per-segment priority assignment | Built | |
| Save split → create new fax records | Built | Creates records in Jotai atoms |
| Persist splits to backend | Needs Building | |

## Worklist (`/worklist`)

| Feature | Status | Notes |
|---|---|---|
| Card-based work queue | Built | |
| Tabs: All / Unclassified / Referral | Built | |
| Queue statistics bar | Built | Total items, avg wait, SLA breaches |
| Urgency sorting | Built | |
| Unclassified cards (suggested type + confidence) | Built | |
| Referral cards (completeness bar + pending comms) | Built | |
| Lock indicator on cards | Built | |
| Claim/assign items | Built | Client-side only |
| Real-time queue updates | Needs Building | Needs Supabase Realtime |

## Referral Detail (`/referrals/[id]`)

| Feature | Status | Notes |
|---|---|---|
| Status workflow stepper | Built | Triage → Incomplete → Pending → Routed → Accepted/Declined → Booked |
| Review tab | Built | |
| Completeness panel (checklist) | Built | Found/Missing/Uncertain with confidence |
| Mark items found/missing/uncertain | Built | Toggle in UI |
| Request Missing Items button | Built | Opens compose slide-over |
| Reason for referral display | Built | |
| Conditions tags | Built | |
| Urgency controls | Built | |
| Route to Cerebrum button | Built | Updates status (mock) |
| Decline Referral button | Built | With reason capture |
| Document grouping (original, response, additional) | Built | Left sidebar |
| Document viewer (embedded) | Built | |
| Communications tab | Built | Thread view |
| Timeline tab | Built | Chronological audit log |
| Confirm Urgency → Zendesk ticket + Slack alert | Needs Building | Logic exists in PRD only |
| Route to Cerebrum → actual EMR routing | Needs Building | |
| Duplicate referral detection | Needs Building | |

## Communications

| Feature | Status | Notes |
|---|---|---|
| Communications overview page | Built | `/referrals/communications` |
| Filter by status and type | Built | |
| Communication detail panel | Built | Shows full message, escalation info |
| Compose slide-over | Built | Channel selection, template fill |
| Channel selection (Fax / Email / Phone) | Built | UI only |
| AI Agent checkbox for calls | Built | UI only |
| Items to request checkboxes | Built | |
| Auto-generated message from template | Built | Template system with variables |
| Follow-up scheduling | Built | UI for days + channel |
| Communication templates | Built | 5+ templates in mock data |
| AI call transcript panel | Built | Component exists |
| Actually send fax via SRFax | Needs Building | |
| Actually send email | Needs Building | |
| Actually trigger voice call via Voice AI | Needs Building | |
| Follow-up scheduler (cron) | Needs Building | |
| Escalation engine (fax-then-voice, etc.) | Needs Building | |
| Receive inbound responses | Needs Building | |

## Dashboard (`/dashboard`)

| Feature | Status | Notes |
|---|---|---|
| KPI cards (queue, auto-file rate, SLA, avg time, processed) | Built | Mock data |
| Fax throughput chart (hourly bar chart) | Built | Recharts |
| Document type breakdown | Built | |
| Referral pipeline funnel | Built | With conversion rates |
| Staff productivity table | Built | Sortable |
| Live indicator | Built | |
| Real-time data from backend | Needs Building | Currently static mock |

## History (`/history`)

| Feature | Status | Notes |
|---|---|---|
| Processed faxes table | Built | |
| Date range filtering (today/week/month/all) | Built | |
| Category filtering | Built | |
| Auto-filed badge with confidence | Built | |
| "New auto-sorted" tracking | Built | localStorage-backed |

## Settings

| Feature | Status | Notes |
|---|---|---|
| Auto-File Settings page | Built | `/settings/auto-file` |
| Enable/disable auto-filing toggle | Built | |
| Global confidence threshold slider | Built | |
| Shadow mode toggle | Built | |
| Per-document-type auto-file config | Built | `/settings/document-types` |
| Per-type threshold + toggle + override | Built | |
| Performance stats (accuracy, overrides, time saved) | Built | Mock data |
| SLA tier settings | Built | `/settings/sla` |
| Fax line configuration | Built | `/settings/fax-lines` |
| Integration overview | Built | `/settings/integrations` - status cards |
| Persist settings to backend | Needs Building | |

## Integration Detail Pages

| Feature | Status | Notes |
|---|---|---|
| Cerebrum EMR monitoring page | Needs Building | PRD specifies `/integrations/cerebrum` |
| Zendesk ticket feed page | Needs Building | PRD specifies `/integrations/zendesk` |
| Slack notification log page | Needs Building | PRD specifies `/integrations/slack` |
| Salesforce sync status page | Needs Building | PRD specifies `/integrations/salesforce` |

## External Integrations (Backend)

| Integration | Status | Notes |
|---|---|---|
| SRFax - inbound webhook | Needs Building | Entry point for all faxes |
| SRFax - outbound fax sending | Needs Building | For missing item requests |
| Cerebrum EMR - patient matching | Needs Building | Query by name/DOB/OHIP |
| Cerebrum EMR - document routing | Needs Building | Push to provider inbox |
| Salesforce - physician lookup | Needs Building | Directory sync + real-time lookup |
| Zendesk - ticket creation | Needs Building | Auto-create on urgent/SLA breach |
| Zendesk - auto-close tickets | Needs Building | When issue resolved in Blair |
| Slack - webhook notifications | Needs Building | Urgent alerts, SLA warnings, digests |

## AI Processing Pipeline

| Feature | Status | Notes |
|---|---|---|
| OCR text extraction | Needs Building | Tier 1 - fast engine |
| Layout analysis | Needs Building | |
| Document fingerprinting / template matching | Needs Building | Tier 2 - rule-based |
| LLM classification (complex docs) | Needs Building | Tier 3 - for handwritten/unstructured |
| Patient info extraction (name, DOB, OHIP) | Needs Building | |
| Patient matching (against EMR) | Needs Building | |
| Provider matching (against Salesforce) | Needs Building | |
| Confidence scoring | Needs Building | UI displays it, nothing generates it |
| Auto-file routing logic | Needs Building | Compare confidence vs thresholds |
| Duplicate fax detection | Needs Building | |
| Multi-patient detection | Needs Building | Flag for splitting |
| Language detection | Needs Building | |
| Caching & deduplication | Needs Building | |

## Database & Persistence

| Feature | Status | Notes |
|---|---|---|
| Supabase schema design | Needs Building | Tables for all entities |
| Migrations | Needs Building | |
| File storage (fax PDFs/images) | Needs Building | Supabase Storage or S3 |
| Real-time subscriptions | Needs Building | For live inbox, locks, SLA |
| API routes / edge functions | Needs Building | All CRUD operations |

## Edge Cases (PRD Section 11)

| Feature | Status | Notes |
|---|---|---|
| Patient not found flow (search/create/skip) | Needs Building | |
| OHIP not found → block + request | Needs Building | |
| DOB not found → block + request | Needs Building | |
| Physician not in directory → add/search/skip | Needs Building | |
| Duplicate referral detection + merge | Needs Building | |
| SLA breach escalation chain | Needs Building | |
| EMR connection failure fallback | Needs Building | |
| Fax quality detection | Needs Building | |
| Multi-language detection | Needs Building | |

---

## Summary

| Status | Count |
|---|---|
| **Built** (frontend with mock data) | ~75 features |
| **Connected** (end-to-end working) | 0 |
| **Needs Building** | ~50 features |

The frontend prototype is comprehensive. The gap is entirely in **backend infrastructure, AI pipeline, and external service integrations** — zero features are connected end-to-end today.
