# CLAUDE.md - Blair AI Fax Sorter

## Project Overview

Blair AI Fax Sorter — intelligent fax indexing and referral management for Canadian cardiology clinics. AI-powered document classification, SLA-based prioritization, and automated referral routing.

**This project shares the blair-app design language**: Inter + Roboto Mono fonts, OKLCH neutral color system, shadcn/ui components with CVA, collapsible sidebar pattern.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **UI**: shadcn/ui (Radix UI), Tailwind CSS v4, CVA
- **State**: Jotai (client state), React Query (server state)
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **Validation**: Zod
- **Tables**: TanStack React Table
- **Charts**: Recharts
- **Icons**: Lucide React
- **Fonts**: Inter (sans), Roboto Mono (mono)
- **Notifications**: Sonner
- **Formatting**: Prettier (single quotes, no semicolons)
- **Package Manager**: **yarn** (never npm)

## Commands

```bash
yarn dev          # Start dev server (Turbopack)
yarn build        # Production build
yarn lint         # ESLint
yarn install      # Install dependencies
```

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout (fonts, providers)
│   ├── globals.css             # Design system (OKLCH colors)
│   ├── page.tsx                # Redirect → /inbox
│   └── (dashboard)/
│       ├── layout.tsx          # Sidebar + header wrapper (force-dynamic)
│       ├── dashboard/          # Analytics dashboard
│       ├── inbox/              # Fax inbox with data table
│       ├── worklist/           # Work queue (cards)
│       ├── fax/[id]/           # Fax viewer (3-panel)
│       ├── referrals/          # Referral management
│       ├── split/[id]/         # Document splitting
│       ├── communications/     # Comms overview
│       └── settings/           # Auto-file, SLA, integrations
├── atoms/                      # Jotai atoms (client state)
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── providers/              # QueryProvider, JotaiProvider, ThemeProvider
│   ├── layout/                 # AppSidebar, SiteHeader
│   ├── inbox/                  # Inbox-specific components
│   ├── referral/               # Referral-specific components
│   ├── fax-viewer/             # Fax viewer panels
│   ├── worklist/               # Worklist cards
│   └── shared/                 # PageHeader, etc.
├── types/                      # TypeScript types
├── hooks/                      # Custom hooks
├── lib/                        # Utils, SLA logic, constants, queryClient, queryKeys
├── utils/supabase/             # Supabase client/server/middleware utilities
├── data/                       # Mock data
└── proxy.ts                    # Next.js 16 middleware (security headers + session)
```

## Providers (app/layout.tsx)

Wrap order: `QueryProvider > JotaiProvider > ThemeProvider`

## State Management

- **Server state**: React Query (`@tanstack/react-query`) — query keys in `lib/queryKeys.ts`
- **Client state**: Jotai atoms in `atoms/` — one file per domain (inbox, referral, lock, etc.)
- **Persisted state**: `atomWithStorage()` from `jotai/utils` (replaces Zustand persist)

## Supabase

- Browser client: `utils/supabase/client.ts` (createBrowserClient)
- Server client: `utils/supabase/server.ts` (createServerClient + cookies)
- Middleware: `utils/supabase/middleware.ts` (updateSession for auth refresh)
- Auth: Supabase Auth (not custom HMAC sessions)

## Design System (matches blair-app)

- **Colors**: OKLCH neutral palette (0 chroma), destructive red for errors
- **Radius**: 10px base (--radius: 0.625rem)
- **Sidebar**: Light (oklch 0.985), collapsible (256px → 61px icon mode)
- **Cards**: shadow-none via `[data-slot='card']`
- **Fonts**: `--font-inter-sans`, `--font-roboto-mono`

## Domain Concepts

- **SLA Tiers**: Urgent (2hr), Routine (8hr)
- **Fax Statuses**: pending-review → in-progress → completed/auto-filed/flagged
- **Referral Statuses**: triage → incomplete → pending review → routed to cerebrum
- **Auto-File**: AI confidence threshold (default 90%), shadow mode for testing
- **Record Locking**: Prevents concurrent edits on same fax/referral

## Supabase Data Integration Notes

The frontend now pulls real data from Supabase via server actions (`app/actions/fax.ts`) with a client-side realtime subscription on `fax_classifications`. The following items are **not yet connected to real data**:

- **Notes field**: The review panel notes textarea is local state only — no `notes` column exists on `fax_classifications` yet. Will need a DB migration to add it.
- **Status column (placeholder)**: All classifications are displayed as `pending-review`. The `fax_classifications.status` field currently only has "classified"/"pending"/"unclassified" — the full UI statuses (auto-filed, in-progress, flagged, completed) are just placeholder values for now and are not yet driven by real data.
- **SLA column (placeholder)**: No SLA deadline column exists in DB. SLA values are placeholder — calculated client-side from `receivedAt` + priority tier (urgent=2hr, routine=8hr) as a stopgap. Not persisted to DB.
- **Needs Review filter (placeholder)**: Linked to `status === "pending-review"` which is hardcoded for all classifications — this is a placeholder filter that will become meaningful once status is driven by real data.
- **Search feature**: Current search is client-side only over loaded data. Server-side full-text search will be implemented in the next iteration.
- **Provider specialty**: Hardcoded as "TEMP DOCTOR FIELD" in the provider override dropdown — no `specialty` column exists on `fax_providers` yet.
- **RLS / Auth (TODO)**: Server actions currently use a plain anon client (`@supabase/supabase-js` without cookies) because RLS policies are only granted to the `anon` role. This should be migrated: revoke `anon` access and grant RLS SELECT/INSERT/UPDATE/DELETE to `authenticated` on **all** `fax_ai` tables (`fax_classifications`, `fax_processing_jobs`, `fax_submissions`, `fax_patients`, `fax_providers`, `organizations`). Then switch server actions back to the cookie-based server client (`utils/supabase/server.ts`) so queries run as the logged-in user. This is important for protecting data in production.
- **User / Organization scoping (TODO)**: The logged-in user has no profile or org membership in the app. Supabase Auth exists (middleware checks `getUser()` for route protection) but the user identity is never hydrated into client state — `currentUser` in `data/mock-staff.ts` is a hardcoded placeholder used by the sidebar, header, and lock indicator. Organization selection (`fetchOrganizationsWithCategories()`) fetches **all** orgs in the DB with no user filter. This works today because there's only one org ("kmh"), but it's not scoped. The proper path is: (1) create a `user_profiles` table linking Supabase auth users to orgs (e.g., `user_org_memberships`), (2) add a server action that returns the authenticated user's profile + org memberships, (3) store in a Jotai user atom as the single source of truth, (4) derive org list from the user's memberships so `fetchOrganizationsWithCategories` filters by user, and (5) replace the hardcoded `currentUser` with the real user atom everywhere.
- **DB View (TODO)**: `fetchClassifications()` currently does a 4-table PostgREST join (classifications → patients, providers, processing_jobs → submissions). Consider creating a `fax_ai.classifications_full` Postgres view that flattens these joins into a single query. This would reduce API overhead, let Postgres optimize the execution plan, and simplify the select to `.from('classifications_full').select('*')`. Not urgent at current data volume — worth doing when latency becomes noticeable or the table grows significantly.

## Conventions

- Import alias `@/` maps to project root (no `src/` directory)
- Named exports over defaults
- Components: PascalCase, Hooks: camelCase with `use` prefix
- Folders: kebab-case
- Mock data in `data/`
- Middleware file is `proxy.ts` (Next.js 16, not `middleware.ts`)
- Pages using `cookies()` need `export const dynamic = 'force-dynamic'`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
