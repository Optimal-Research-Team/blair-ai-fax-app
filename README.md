# Blair AI Fax App

Next.js frontend for the Blair AI fax processing platform. Provides an inbox, worklist, fax viewer, and review panel for clerks to manage AI-classified fax documents.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI**: shadcn/ui (Radix UI), Tailwind CSS v4
- **State**: Jotai (client), React Query (server)
- **Auth**: Supabase Auth
- **Package Manager**: Yarn

## Getting Started

```bash
yarn install
yarn dev          # http://localhost:3000
```

## Commands

```bash
yarn dev          # Start dev server (Turbopack)
yarn build        # Production build
yarn lint         # ESLint
```

## Deployment

Currently deployed on **Vercel**. Future migration to **AWS** is planned.
