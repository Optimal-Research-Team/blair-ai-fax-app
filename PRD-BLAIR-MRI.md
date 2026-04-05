# Blair MRI — AI Referral Management System

## Product Requirements Document

**Version:** 1.0
**Date:** April 5, 2026
**Author:** Peter Phua, Optimal Research Team
**Status:** Draft

---

## 1. Overview

Blair MRI is an AI-powered referral management system purpose-built for KMH Cardiology Centres' MRI workflow. It automates the end-to-end lifecycle of an MRI referral — from fax intake through patient screening to pre-appointment confirmation — replacing a fragmented, manual process that currently consumes 6 dedicated CSRs and 10-15 part-time receptionists.

### 1.1 Problem Statement

KMH currently has approximately 3,000 unbooked MRI referrals in their pipeline. Of these, roughly 750 are immediately bookable pending scheduling preferences, and 2,000 require additional screening information. The existing workflow suffers from:

- **50% screening form completion rate** — email-only delivery creates a cascade of manual follow-up
- **Triage bottleneck** — "longest time in this step," mostly manual human workflow
- **No-show risk** — patients claim they didn't receive appointment notifications; lost MRI slots from failed confirmations
- **No filtering at intake** — non-MRI faxes mixed in with requisitions, wasting admin time

### 1.2 Solution

Blair MRI provides a 6-stage pipeline that manages the full referral lifecycle:

1. AI-powered fax classification that filters and extracts MRI requisitions automatically
2. Structured admin triage with AI-assisted data extraction
3. Multi-channel patient screening via voice AI agent (SMS + Voice + Email)
4. Radiologist review and protocol assignment workflow
5. Scheduling coordination
6. Automated pre-appointment confirmation with reschedule handling

### 1.3 Target Outcome

| Metric | Current | Target |
|--------|---------|--------|
| Screening form completion rate | 50% (email only) | 85%+ (multi-channel) |
| Appointments fully automated | 40% | 70% |
| Escalation rate to human staff | N/A | <20% |
| Manual follow-up workload | 60% of appointments | 32% of appointments |

---

## 2. Pipeline Architecture

The system is organized into 6 sequential stages. Each stage has a defined owner, clear input/output contract, and a set of statuses that track referral progress.

```
Fax In → [AI classifies] → [Admin triages] → [Blair screens patient] → [Radiologist assigns protocol] → [KMH books] → [Blair confirms] → MRI Done
          Stage 0              Stage 1           Stage 2                   Stage 3                        Stage 4        Stage 5
```

### 2.1 Stage Summary

| Stage | Name | Owner | Input | Output |
|-------|------|-------|-------|--------|
| 0 | Fax Intake & Classification | Blair AI | Raw incoming fax | MRI referral object (or discarded non-MRI fax) |
| 1 | Admin Triage | KMH admin clerk | AI-extracted referral | Validated, complete referral ready for patient outreach |
| 2 | Patient Screening | Blair AI (voice agent) | Triaged referral | Screening results + patient preferences |
| 3 | Radiologist Review | KMH radiologist | Screening data + original requisition | Protocol assignment (or rejection) |
| 4 | Scheduling | KMH booking team | Protocol + patient preferences | Booked appointment |
| 5 | Pre-Appointment Confirmation | Blair AI → KMH staff (fallback) | Booked appointment | Confirmed attendance / reschedule / cancellation |

---

## 3. Stage Specifications

### 3.0 Stage 0: Fax Intake & Classification

**Owner:** Blair AI (fully automated)

**Purpose:** Receive all incoming faxes, identify MRI requisitions, extract structured data, and create referral objects. Non-MRI faxes are discarded. This eliminates manual sorting.

#### Statuses

| Status | Description |
|--------|------------|
| `received` | Fax landed in system, awaiting AI processing |
| `classifying` | AI scanning document — identifying document type, extracting fields |
| `mri_requisition` | Confirmed MRI requisition. Referral object created with extracted data. Moves to Stage 1. |
| `not_mri` | Not an MRI requisition — discarded/archived. No further action. |
| `classification_failed` | AI could not confidently classify (poor scan quality, handwriting, ambiguous content) — queued for manual review |

#### AI Extraction Fields

From the KMH MRI requisition form, the AI extracts:

- **Patient demographics:** last name, first name, date of birth, address, phone numbers, email, weight, gender
- **Insurance:** OHIP number, third-party payor, claim number
- **Clinical:** area to be scanned, clinical information/working diagnosis, reason for test
- **Referring physician:** name, billing number, phone, fax, signature presence, stamp presence
- **Screening flags:** any pre-filled contraindication answers on the requisition
- **Document metadata:** page count, scan quality score, document date

#### Fax Filtering Logic

The inbox exists solely to catch MRI requisitions. The AI classifier should:

- Identify KMH MRI requisition forms with high confidence (layout matching + keyword extraction)
- Identify non-KMH MRI referral letters that contain MRI-related clinical requests
- Discard/archive all other document types (lab results, echo reports, consult notes, insurance forms, admin correspondence)
- Flag ambiguous documents for manual classification review

---

### 3.1 Stage 1: Admin Triage

**Owner:** KMH admin clerk (human)

**Purpose:** Validate the AI-created referral, ensure the requisition is complete and appropriate for KMH, and prepare the referral for patient screening outreach. This is currently the biggest bottleneck in the pipeline ("longest time period").

#### Statuses

| Status | Description |
|--------|------------|
| `in_triage` | Clerk is actively reviewing the referral |
| `pending_physician_info` | Requisition is incomplete. Clerk has contacted referring physician's office for missing information. Awaiting response. |
| `patient_matching` | Clerk confirming or correcting AI's patient match against KMH records |
| `duplicate_detected` | Patient already has an active MRI referral in the pipeline. Clerk deciding whether to merge or reject. |
| `triage_success` | Referral validated, complete, appropriate for KMH. Ready for patient screening outreach. |
| `referral_failed` | Referral rejected — sent back to referring provider with reason. |

#### Triage Sub-Steps

The admin clerk performs the following checks:

1. **Verify AI extraction accuracy** — Confirm the AI correctly pulled patient demographics, OHIP number, and referring physician information from the requisition form. Correct any errors.

2. **Check requisition completeness** — Per KMH's own form requirements:
   - Is the area to be scanned clearly specified?
   - Is clinical information / working diagnosis provided?
   - Is the reason for the test documented?
   - Is the referring physician's signature present?
   - Is the physician's stamp/billing number present?
   - Are relevant previous test reports attached (if indicated)?
   - Is the patient screening section on the requisition filled out by the referring physician?

3. **Duplicate check** — Is this patient already in the MRI pipeline with an active referral? If so, is this a new referral for a different body area, or a duplicate submission?

4. **Appropriateness check** — Is this referral eligible for KMH?
   - Patient must be 12 years of age or older
   - Patient must be under 300 lbs (hard limit per KMH MRI equipment)
   - Requested scan type must be a service KMH provides

5. **Patient record matching** — Confirm or correct the AI's patient match against existing KMH records. Create a new patient record if this is a first-time referral.

6. **Request missing information** — If the requisition is incomplete, contact the referring physician's office to obtain missing fields. This is the sub-step that stretches the "longest time period" — physician offices may be slow to respond, requiring follow-up faxes or phone calls.

#### Failure Reasons

When a referral fails triage (`referral_failed`), common reasons include:

- Requisition incomplete and referring physician office unresponsive after follow-up attempts
- Patient ineligible for KMH MRI (age, equipment limitations)
- Scan type not offered at KMH
- Referring physician not licensed / missing credentials
- Patient already has a completed/active referral for the same scan

---

### 3.2 Stage 2: Patient Screening

**Owner:** Blair AI (voice agent + multi-channel outreach)

**Purpose:** Contact the patient to complete the MRI screening questionnaire. This covers contraindication pre-screening, demographics and scheduling preferences, and medical history. The voice agent flow is designed to be simpler than the cardiology intake — structured yes/no questions with follow-up capture, rather than open-ended medication names.

#### Statuses

| Status | Description |
|--------|------------|
| `outreach_initiated` | Blair has started the outreach campaign. Pre-call SMS sent 24 hours before scheduled call. Email with screening form link sent (if email on file). |
| `screening_form_sent` | Form delivered via email/SMS. Awaiting patient engagement. |
| `screening_in_progress` | Patient is engaged — voice call active or form partially completed. |
| `call_partial` | Voice call dropped mid-screening. Resume SMS sent with partial progress. Retry scheduled in next outreach window. |
| `screening_pass` | Patient completed all questions with no flags and no disqualifications. Ready for radiologist review. |
| `needs_clinical_review` | Patient completed screening but has flagged items requiring clinician assessment. Routed to clinical review queue. |
| `soft_disqualified` | Clinical review determined patient cannot safely undergo MRI at KMH (e.g., specific implant type incompatible). Not a hard gate — requires clinician judgment. Patient and referring provider notified. |
| `hard_disqualified` | Patient triggered a hard contraindication gate during screening. Terminal. Patient notified on the call, referring provider notified. |
| `no_response` | Full outreach cadence exhausted (SMS + voice + email attempts over configured window). Zero patient engagement. Escalated to human follow-up queue. |
| `no_consent` | Patient explicitly declined consent to proceed with health information collection under PIPEDA. |
| `no_identity` | Patient failed identity verification (name + DOB match) after 3 attempts. |

#### Voice Agent Call Flow

The screening call follows a 6-step structured flow:

**Step 0 — Pre-Call SMS:**
Patient receives SMS 24 hours before the call explaining purpose, what to prepare, and estimated duration (~5-7 minutes). Patient can respond to reschedule the call or ask questions via SMS agent.

**Step 1 — Introduction & Identity Verification:**
- Confirm patient first name, last name, DOB (exact match against referral data)
- 3 attempts for identity verification before ending call (`no_identity`)
- Capture verbal consent for health information collection under PIPEDA
- No consent → `no_consent`, end call, send SMS notification

**Step 2 — Contraindication Pre-Screening (4 Hard Gates):**
All four questions are asked before any disqualification message is delivered.

| Gate | Question | Disqualification Trigger |
|------|----------|------------------------|
| 1 | "Are you wheelchair-bound or paraplegic?" | Yes |
| 2 | "Do you weigh over 300 pounds?" | Yes |
| 3 | "Do you require special assistance (wheelchair, stretcher, crutches)?" → If yes: "Are you able to walk 5-10 steps and lift yourself onto the MRI table?" | Cannot walk/lift |
| 4 | (Female only) "Are you pregnant or is there a chance you are pregnant?" | Yes. If no: "Are you currently breastfeeding?" — data capture only, proceed either way. |

Disqualification message: *"Unfortunately, based on your responses, KMH is not able to perform this MRI. Next steps will be communicated to your referring doctor once our booking team has reviewed your case."*

**Step 3 — Demographics & Scheduling Preferences:**
- Height and weight (if weight >250 lbs, flag for body width measurement at appointment)
- Ethnicity
- Additional benefits or insurance
- Family doctor (confirm or capture)
- Best phone number + type (cell/home/other)
- Location preference: Markham (50 Minthorn Blvd) or Kitchener (751-B Victoria St. S.)
- Availability: daytime (7am-3pm), evening (3pm-11pm), or overnight (11pm-7am)
- Short-notice cancellation appointments: open to them or not

**Step 4 — Medical History (8 Questions):**
Sequential yes/no questions. For each "yes," capture details and deliver patient instructions in real-time.

| # | Question | If Yes |
|---|----------|--------|
| 1 | Past metal injuries to eyes/face | Instruct: arrange orbital x-ray before appointment |
| 2 | Implants or devices | Capture type and location (open-ended). Flag for clinical review. |
| 3 | Recent injections to scan area (last 6 weeks) | Capture date. Note: acupuncture, dry needling, botox, vaccines not applicable. |
| 4 | Planned future injections | Capture date |
| 5 | Renal disease or chemotherapy | Flag for clinical review. eGFR/serum creatinine required within 12 weeks of appointment. |
| 6 | Claustrophobia | Instruct: arrange sedation prescription from physician + arrange ride home |
| 7 | Prior imaging of requested area | Capture yes/no (inform radiologist for comparison) |
| 8 | Prior surgeries to scan area or brain/ears/eyes/heart/abdomen/pelvis | Capture details. Instruct device removal if applicable. |

**Step 5 — Summary & Confirmation:**
- Read back key items: location preference, availability, any flagged medical history items, any instructions given
- Allow corrections (open-ended correction prompt, same edit-and-confirm pattern as cardiology)
- Confirm screening is complete; explain next steps: *"Our booking coordinator will review this information and reach out in the next week."*
- Ask if patient has any questions (answer from knowledge base or escalate)

**Step 6 — Close & Post-Call SMS:**
- Send post-call SMS with screening summary, any patient instructions (orbital x-ray, sedation, etc.), and next-steps info
- If call dropped at any point past Step 2, mark `call_partial` and send resume SMS

#### Outreach Cadence

The multi-channel outreach follows a configured retry pattern:

1. Email with screening form link (if email on file) — Day 0
2. Pre-call SMS — Day 1
3. Voice call attempt #1 — Day 2
4. Follow-up SMS if no answer — Day 2
5. Voice call attempt #2 — Day 4
6. Voice call attempt #3 — Day 7
7. If all attempts exhausted → `no_response`, escalate to human queue

---

### 3.3 Stage 3: Radiologist Review & Protocol Assignment

**Owner:** KMH radiologist

**Purpose:** Review the completed screening data alongside the original requisition. Assign the correct MRI protocol. Clear the referral for scheduling. This is the clinical gate between screening and booking — the scheduling team needs to know which protocol to schedule because different protocols have different time slots, contrast requirements, and patient prep instructions.

#### Statuses

| Status | Description |
|--------|------------|
| `awaiting_radiologist` | Screening passed (or clinical review cleared flagged items). Referral queued for radiologist review. Full package available: original requisition PDF, AI extraction data, screening results, any flagged items with clinician notes. |
| `protocol_assigned` | Radiologist has reviewed and assigned the MRI protocol. Cleared for scheduling. |
| `radiologist_rejected` | Radiologist determined MRI is not indicated, or requires additional information from referring physician. Sent back with notes. |
| `additional_info_requested` | Radiologist needs more clinical information from the referring physician before assigning a protocol. Clerk follows up. |

#### What the Radiologist Does

1. **Clinical appropriateness review** — Does the referral make clinical sense? Does the requested scan area match the clinical indication?

2. **Protocol selection** — Choose the correct MRI pulse sequences and protocol based on the clinical question. Examples:
   - Cardiac MRI viability study (post-MI assessment)
   - Cardiac MRI with stress (ischemia evaluation)
   - Cardiac MRI for ARVC screening (RV-focused protocol)
   - Cardiac MRI for HCM evaluation
   - MRA aorta (vascular assessment)
   - Cardiac MRI with gadolinium (general with contrast)

3. **Contrast decision** — Confirm whether gadolinium contrast is appropriate given the patient's screening results (renal function, allergies). Specify contrast type and dose.

4. **Review flagged screening items** — If the patient had items escalated during screening (implant compatibility, renal concerns, prior metal injuries), the radiologist makes the final safety determination.

5. **Scan duration estimate** — Complex protocols (e.g., stress cardiac MRI) may take 60-90 minutes vs. simpler studies at 30-45 minutes. This affects scheduling slot allocation.

6. **Special instructions** — Any protocol-specific prep instructions beyond standard (fasting requirements for abdomen/pelvis, oral contrast timing, specific coil requirements).

---

### 3.4 Stage 4: Scheduling

**Owner:** KMH booking team (human, via CDIC scheduling tool or receptionist)

**Purpose:** Book the patient's MRI appointment using their preferences and the radiologist-assigned protocol.

#### Statuses

| Status | Description |
|--------|------------|
| `ready_to_book` | Protocol assigned, patient preferences available. Queued for booking team. |
| `appointment_booked` | Date, time, and location confirmed. Patient notified with prep instructions. |
| `waitlisted` | No available slots match patient preferences or protocol requirements. Patient placed on waitlist with estimated wait time. |

#### Scheduling Inputs

The booking team receives a complete package:

- **Protocol:** assigned by radiologist (determines slot duration and equipment requirements)
- **Location preference:** Markham or Kitchener
- **Availability:** daytime, evening, or overnight
- **Short-notice OK:** whether patient is open to cancellation spots
- **Special requirements:** body width measurement needed (weight >250 lbs), sedation (claustrophobic patient), contrast prep, fasting requirements
- **Patient contact info:** preferred phone number and type

---

### 3.5 Stage 5: Pre-Appointment Confirmation

**Owner:** Blair AI (automated) → KMH staff (human fallback)

**Purpose:** Confirm the patient will attend their MRI appointment 5-7 days prior. Handle reschedules. Prevent no-shows and lost MRI slots. This replaces the current system of sending an automated notification at 1am.

#### Statuses

| Status | Description |
|--------|------------|
| `confirmation_sent` | Automated reminder sent — text on Day 5 before appointment, voice call on Day 4. Includes appointment details, location, prep instructions (fasting, contrast arrival time, sedation reminders). |
| `confirmed` | Patient confirmed attendance. |
| `needs_reschedule` | Patient responded but cannot make the scheduled date/time. Routed back to Stage 4 for rebooking. |
| `no_response_confirmation` | Patient did not respond to automated outreach. Escalated to human retries (KMH staff attempts phone calls). |
| `cancelled` | Cannot reach patient within 48 hours of appointment, or patient explicitly cancels. Appointment slot freed for waitlisted patients. |
| `completed` | Patient attended the MRI appointment. Terminal success. |

#### Confirmation Flow

1. **Day 5:** SMS reminder with appointment date, time, location, and prep instructions
2. **Day 4:** Voice call — confirm attendance, remind of any special prep (fasting, sedation, orbital x-ray results)
3. **Patient confirms:** → `confirmed`, done
4. **Patient needs to reschedule:** → `needs_reschedule`, route to booking team
5. **No response to automated outreach:** → human retries (KMH staff)
6. **Still no response within 48 hours of appointment:** → `cancelled`, slot freed, patient notified via SMS

---

## 4. Data Model

### 4.1 MRI Referral Object

The core entity tracked through all 6 stages.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | UUID | System | Unique referral identifier |
| `stage` | Enum | System | Current pipeline stage (0-5) |
| `status` | String | System | Current status within the stage |
| `created_at` | Timestamp | System | When referral object was created |
| `updated_at` | Timestamp | System | Last status change |

#### Patient Information (Stage 0 — AI extracted, Stage 1 — admin verified)

| Field | Type | Description |
|-------|------|-------------|
| `patient_first_name` | String | Patient first name |
| `patient_last_name` | String | Patient last name |
| `patient_dob` | Date | Date of birth |
| `patient_ohip` | String | OHIP number |
| `patient_gender` | Enum | Male / Female / Other |
| `patient_address` | String | Full address |
| `patient_phone_day` | String | Daytime phone |
| `patient_phone_home` | String | Home phone |
| `patient_email` | String | Email (optional) |
| `patient_weight` | String | Weight |

#### Referring Physician (Stage 0 — AI extracted)

| Field | Type | Description |
|-------|------|-------------|
| `ref_physician_name` | String | Full name |
| `ref_physician_billing` | String | Billing number |
| `ref_physician_phone` | String | Office phone |
| `ref_physician_fax` | String | Office fax |
| `ref_physician_email` | String | Email (optional) |
| `cc_physician` | String | CC physician (optional) |

#### Clinical Information (Stage 0 — AI extracted)

| Field | Type | Description |
|-------|------|-------------|
| `area_to_scan` | String | Requested body area / scan type |
| `clinical_indication` | Text | Clinical information / working diagnosis |
| `reason_for_test` | Text | Reason for performing the MRI |
| `urgency` | Enum | Routine / Urgent (at radiologist discretion) |

#### Screening Data (Stage 2 — voice agent captured)

| Field | Type | Description |
|-------|------|-------------|
| `consent_given` | Boolean | PIPEDA verbal consent |
| `identity_verified` | Boolean | Name + DOB match |
| `contraindication_wheelchair` | Boolean | Hard gate #1 |
| `contraindication_weight` | Boolean | Hard gate #2 (>300 lbs) |
| `contraindication_mobility` | Boolean | Hard gate #3 (can't walk/lift) |
| `contraindication_pregnant` | Boolean / N/A | Hard gate #4 (female only) |
| `breastfeeding` | Boolean / N/A | Data capture only |
| `height` | String | Patient height |
| `weight_screening` | String | Confirmed weight |
| `ethnicity` | String | Patient ethnicity |
| `insurance_benefits` | String | Additional insurance/benefits |
| `family_doctor` | String | Family doctor name |
| `preferred_phone` | String | Best contact number |
| `phone_type` | Enum | Cell / Home / Other |
| `location_preference` | Enum | Markham / Kitchener |
| `availability` | Enum | Daytime / Evening / Overnight |
| `short_notice_ok` | Boolean | Open to cancellation spots |
| `medical_history` | Object | 8 questions — yes/no + detail text per question |
| `flags_for_review` | Array | Items requiring clinical review (implants, renal, etc.) |
| `instructions_given` | Array | Instructions delivered to patient during call (orbital x-ray, sedation, etc.) |
| `screening_outcome` | Enum | `screening_pass` / `needs_clinical_review` / `hard_disqualified` / `soft_disqualified` |

#### Radiologist Review (Stage 3)

| Field | Type | Description |
|-------|------|-------------|
| `assigned_protocol` | String | MRI protocol name |
| `contrast_required` | Boolean | Whether gadolinium contrast is needed |
| `contrast_type` | String | Specific contrast agent (if applicable) |
| `estimated_duration_minutes` | Number | Expected scan duration |
| `radiologist_notes` | Text | Any special instructions or comments |
| `radiologist_id` | UUID | Reviewing radiologist |
| `reviewed_at` | Timestamp | When review was completed |

#### Scheduling (Stage 4)

| Field | Type | Description |
|-------|------|-------------|
| `appointment_date` | Timestamp | Scheduled date and time |
| `appointment_location` | Enum | Markham / Kitchener |
| `prep_instructions` | Text | Patient prep instructions (fasting, contrast, sedation) |
| `booked_by` | String | Booking staff member |
| `booked_at` | Timestamp | When appointment was booked |

#### Confirmation (Stage 5)

| Field | Type | Description |
|-------|------|-------------|
| `confirmation_status` | Enum | `confirmed` / `needs_reschedule` / `cancelled` / `no_response` |
| `confirmation_sent_at` | Timestamp | When reminder was sent |
| `confirmed_at` | Timestamp | When patient confirmed |
| `cancellation_reason` | Text | Reason for cancellation (if applicable) |

---

## 5. Screening Outcome Routing

Each completed (or attempted) screening maps to one of the following codes. This drives handoff and determines next actions.

| Code | Status | Trigger | Action |
|------|--------|---------|--------|
| 0 | `no_response` | Patient unresponsive after full outreach cadence | Escalate to human follow-up queue with full attempt history |
| 1 | `screening_pass` | All questions completed, no disqualifications, no clinical flags | Send results + preferences to Stage 3 (radiologist review) |
| 2 | `needs_clinical_review` | Completed but has flagged items: implants/devices, renal disease, certain surgeries, metal eye injuries | Route to clinical review queue with flagged items highlighted. Hold for clinician decision. |
| 3 | `hard_disqualified` | Hard gate triggered: wheelchair/paraplegic, >300 lbs, cannot walk 5-10 steps, pregnant | Deliver disqualification message on call. Notify KMH clinical team. Communicate to referring provider. |
| 4 | `soft_disqualified` | Clinical review determines patient cannot safely undergo MRI at KMH | Notify patient and referring provider with explanation. |
| 5 | `no_consent` | Patient declined consent | End call. Slack escalation. |
| 6 | `no_identity` | Failed identity verification after 3 attempts | End call. Slack escalation. |
| 7 | `call_partial` | Call dropped mid-screening | Send resume SMS. Retry in next outreach window. Track step reached. |

---

## 6. Key Metrics

### Primary KPIs

| Metric | Current | Target | Definition |
|--------|---------|--------|------------|
| Screening form completion rate | 50% | 85%+ | % of patients who complete screening out of all entered into Blair campaign |
| Reach rate | Unknown | 85% | % of patients contacted on at least one channel |
| Appointments fully automated | 40% | 70% | Completion rate x confirmation rate |
| Escalation rate to human staff | N/A | <20% | Excluding predefined outcomes (disqualified, no response after full cadence) |
| Disqualification identification rate | Unknown | 100% | All 4 hard gates checked before any booking |

### Secondary Metrics

| Metric | Definition | Why It Matters |
|--------|------------|----------------|
| Average time-to-screening | Days from `triage_success` to screening completion | Measures pipeline velocity; identifies stall points |
| Disqualification rate | % of screened patients hitting a hard gate | Baseline on inappropriate referrals; feedback to referring providers |
| Clinical review flag rate | % of screenings routed to `needs_clinical_review` | Measures clinician review workload |
| Channel conversion breakdown | Completion rate by email vs. SMS vs. voice | Shows which channel drives completions |
| Clinical review turnaround time | Time from flag to clinician decision | Measures bottleneck Blair can't control |
| Inbound "where's my MRI?" call volume | # of inbound status calls per week | Proactive outreach should reduce these |
| Referral-to-booking time | Total days from `new_referral` to `appointment_booked` | North star operational metric |

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI Components | shadcn/ui (Radix UI), Tailwind CSS v4 |
| Client State | Jotai |
| Server State | React Query |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) |
| Voice Agent | Blair Voice AI infrastructure (reused from cardiology pilot) |
| SMS/Email | Blair outreach engine (reused from cardiology pilot) |
| Notifications | Slack (escalation channels) |
| PDF Processing | AI document classification + data extraction |

### 7.2 Infrastructure Reuse from Cardiology Pilot

| Component | Reuse Level | Adaptation Needed |
|-----------|------------|-------------------|
| SMS outreach engine | Direct reuse | Repurpose for form reminders, screening status updates |
| Voice agent infrastructure | Direct reuse | Adapt script for screening questions (simpler than medication capture) |
| Retry & outreach logic | Direct reuse | Tune windows for MRI timelines |
| Slack escalation | Direct reuse | MRI-specific channels with screening-specific escalation types |
| PIPEDA / data privacy framework | Direct reuse | MRI-specific data handling documentation |
| CSV/API data pipeline | Adapt | New schema for MRI referrals (referral source, MRI type, screening status) |
| Identity & consent | Adapt | MRI-specific consent language |
| Screening form logic | Net-new | 4 contraindication gates + 8 medical history questions with branching |
| Disqualification flow | Net-new | Patient notification, refer-back-to-provider, status tracking |
| Clinical review routing | Net-new | Flag implants/renal/injections for clinician assessment |

---

## 8. User Roles & Permissions

| Role | Access | Primary Actions |
|------|--------|----------------|
| **Admin Clerk** | Stage 0-1 | Review AI classifications, triage referrals, contact physician offices for missing info, manage patient records |
| **Radiologist** | Stage 3 | Review screening results, assign MRI protocols, approve/reject referrals on clinical grounds |
| **Booking Coordinator** | Stage 4 | Schedule appointments using CDIC tool, manage waitlists, handle reschedules |
| **System Admin** | All stages | Configure AI thresholds, manage outreach cadences, view metrics dashboard, manage user accounts |

---

## 9. UI Structure

The Blair MRI interface maps to the pipeline with the following primary views:

| View | Purpose | Pipeline Stage |
|------|---------|---------------|
| **Fax Inbox** | Incoming fax stream — shows AI classification results, filters non-MRI faxes | Stage 0 |
| **Triage Queue** | Referrals awaiting admin review — sortable by age, urgency, completeness | Stage 1 |
| **Screening Dashboard** | Active screening campaigns — outreach status, voice call results, completion rates | Stage 2 |
| **Radiologist Queue** | Referrals awaiting protocol assignment — screening results, flagged items | Stage 3 |
| **Scheduling Queue** | Referrals with assigned protocols awaiting booking — patient preferences, protocol requirements | Stage 4 |
| **Confirmation Tracker** | Upcoming appointments — confirmation status, reschedule requests | Stage 5 |
| **Analytics Dashboard** | Pipeline metrics — throughput, bottlenecks, SLA compliance, screening completion rates | All stages |
| **Referral Detail** | Single-referral deep view — full timeline, all data, documents, communications | All stages |

---

## 10. Open Questions

1. **Triage automation opportunity:** Can AI assist with the triage bottleneck beyond data extraction? (e.g., automated completeness checking, auto-flagging duplicates, pre-populating patient matches)

2. **Radiologist protocol assignment:** Is there potential to suggest protocols based on clinical indication, reducing radiologist review time to a confirmation step?

3. **CDIC integration:** What level of integration is possible with KMH's scheduling tool? Can Blair push referrals directly into CDIC, or is it a manual handoff?

4. **Inbound patient queries:** Patients currently call KMH asking "where's my MRI?" Can the SMS agent handle inbound status inquiries, reducing call volume?

5. **Referring physician feedback loop:** When a referral is rejected or a patient is disqualified, what is the communication protocol back to the referring physician? Fax? Phone? Portal?

6. **Multi-location protocol differences:** Do Markham and Kitchener have different MRI equipment capabilities that affect which protocols can be performed at each location?
