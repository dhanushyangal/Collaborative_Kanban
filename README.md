# Collaborative Kanban

Realtime Kanban board with Next.js, Clerk, Supabase, and @dnd-kit.

Signed-in users share one board. Changes sync live. Cards are not owned by individual users.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Clerk (auth)
- Supabase Postgres + Realtime + Presence
- @dnd-kit
- Turborepo + pnpm

## Setup

1. Install deps

```bash
pnpm install
```

2. Copy env file and fill in your keys

```bash
cp apps/web/.env.example apps/web/.env.local
```

You need:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase API keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |

3. Run the SQL migration in Supabase → SQL Editor:

`supabase/migrations/20260726120000_create_cards.sql`

4. Start the app

```bash
pnpm dev
```

Open http://localhost:3000 — you'll be sent to sign-in.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm check-types
pnpm build
```

## Structure

```
apps/web/
  app/                 # routes (board, sign-in, sign-up)
  actions/             # server actions for cards
  components/          # board UI
  hooks/               # realtime + presence
  lib/                 # helpers
  utils/supabase/      # browser + server clients
  middleware.ts        # Clerk route protection
supabase/migrations/   # SQL
```

## Notes

- Auth only protects the app UI. The board itself is shared.
- Realtime uses Supabase (`postgres_changes` + Presence), not Clerk.
- Don't commit `.env` / `.env.local`.

## Deploy (Vercel)

- Root: repo root
- Build: `pnpm turbo run build --filter=web`
- Add the same env vars in the Vercel project
- Add your Vercel URL in Clerk redirect settings
