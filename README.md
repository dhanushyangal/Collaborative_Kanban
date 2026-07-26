# Collaborative Kanban Board

A production-quality real-time collaborative Kanban board built with **Next.js 16.2**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**, **@dnd-kit**, **Clerk**, and **Supabase** (PostgreSQL + Realtime + Presence).

Authenticated users can open the board simultaneously, create/edit/delete cards, drag them between columns, and see every change sync instantly — no refresh required. The board is shared: cards are **not** scoped per user.

---

## Project Overview

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Drag and drop | `@dnd-kit` |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Monorepo | Turborepo + pnpm |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime (`postgres_changes` + Presence) |
| Deploy | Vercel |

---

## Architecture

```
┌──────────────────────────────┐
│  Clerk middleware            │  protect routes, redirect unauthenticated
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  app/page.tsx (RSC)          │  initial cards via server client
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Board.tsx (Client)          │  UI + DnD + optimistic updates
│   ├─ AppHeader + UserButton  │  Clerk identity / sign out
│   ├─ useRealtimeBoard        │  INSERT/UPDATE/DELETE + reconnect refetch
│   └─ usePresence             │  online user count
└──────────────┬───────────────┘
               │ Server Actions
               ▼
┌──────────────────────────────┐
│  actions/cards.ts            │  create / update / delete / move_card RPC
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  Supabase Postgres           │  shared board (no per-user card ownership)
└──────────────────────────────┘
```

**Auth vs data**

- **Clerk** gates who can open the app (sign-in / sign-up / sign-out).
- **Supabase** stores and syncs the single shared board for every signed-in user.
- Cards are **not** associated with Clerk user IDs.

---

## Clerk Setup

1. Create an application at [clerk.com](https://clerk.com).
2. In the Clerk dashboard, copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`
3. Paste them into `apps/web/.env.local` (replace the placeholders).
4. In Clerk → **Configure → Paths** (or similar), ensure:
   - Sign-in path: `/sign-in`
   - Sign-up path: `/sign-up`
   - After sign-in / sign-up: `/`
5. Add `http://localhost:3000` (and your Vercel URL) to allowed origins / redirect URLs.

### What was configured in code

| File | Role |
| --- | --- |
| [`apps/web/middleware.ts`](apps/web/middleware.ts) | `clerkMiddleware` + `auth.protect()` for all non-auth routes |
| [`apps/web/components/AppClerkProvider.tsx`](apps/web/components/AppClerkProvider.tsx) | `ClerkProvider` with redirect URLs |
| [`apps/web/app/sign-in/[[...sign-in]]/page.tsx`](apps/web/app/sign-in/[[...sign-in]]/page.tsx) | Sign-in UI |
| [`apps/web/app/sign-up/[[...sign-up]]/page.tsx`](apps/web/app/sign-up/[[...sign-up]]/page.tsx) | Sign-up UI |
| [`apps/web/components/AppHeader.tsx`](apps/web/components/AppHeader.tsx) | App name, user name/email, `UserButton` (avatar + sign out) |

### Auth flow

1. Unauthenticated visit to `/` → redirected to `/sign-in`.
2. Sign up or sign in → redirected to `/` (the Kanban board).
3. Authenticated visit to `/sign-in` or `/sign-up` → redirected to `/`.
4. Sign out via `UserButton` → `/sign-in`.

---

## Folder Structure

```
collaborative_Kanban_board/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ .npmrc
├─ .gitignore
├─ README.md
├─ supabase/
│  └─ migrations/
│     └─ 20260726120000_create_cards.sql
└─ apps/web/
   ├─ package.json
   ├─ next.config.ts
   ├─ tsconfig.json
   ├─ postcss.config.mjs
   ├─ components.json
   ├─ eslint.config.mjs
   ├─ .env.local
   ├─ .env.example
   ├─ middleware.ts              # Clerk route protection
   ├─ app/
   │  ├─ layout.tsx              # ClerkProvider
   │  ├─ page.tsx                # Protected board
   │  ├─ loading.tsx
   │  ├─ error.tsx
   │  ├─ globals.css
   │  ├─ sign-in/[[...sign-in]]/page.tsx
   │  └─ sign-up/[[...sign-up]]/page.tsx
   ├─ actions/
   │  └─ cards.ts
   ├─ components/
   │  ├─ AppClerkProvider.tsx
   │  ├─ AppHeader.tsx
   │  ├─ Board.tsx
   │  ├─ Column.tsx
   │  ├─ Card.tsx
   │  ├─ CardModal.tsx
   │  ├─ CardDetails.tsx
   │  ├─ ConnectionStatus.tsx
   │  ├─ BoardSkeleton.tsx
   │  ├─ EmptyColumn.tsx
   │  ├─ ThemeProvider.tsx
   │  ├─ ThemeToggle.tsx
   │  └─ ui/
   ├─ hooks/
   │  ├─ useRealtimeBoard.ts
   │  ├─ usePresence.ts
   │  └─ useBoardShortcuts.ts
   ├─ lib/
   │  ├─ supabase.ts
   │  ├─ board.ts
   │  ├─ validation.ts
   │  └─ utils.ts
   ├─ types/
   │  ├─ database.ts
   │  └─ board.ts
   └─ utils/supabase/
      ├─ client.ts
      ├─ server.ts
      └─ middleware.ts
```

---

## Technology Choices

- **Clerk** — App Router–native auth with hosted sign-in/up and `UserButton`.
- **Turborepo + pnpm** — scalable monorepo layout.
- **Server Components + Server Actions** — fast first paint, typed mutations.
- **`@dnd-kit`** — accessible pointer + keyboard dragging.
- **Supabase Realtime Presence** — online user counts (independent of Clerk).
- **No Zod** — shared `lib/validation.ts` for client + server validation.
- **shadcn/ui + sonner + next-themes** — UI primitives, toasts, dark mode.

---

## Database Schema

### `public.cards`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `title` | `text` | required, 1–200 chars |
| `description` | `text` | default `''` |
| `status` | `text` | `todo` \| `in-progress` \| `done` |
| `position` | `integer` | dense order within a column |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | trigger-maintained |

There is **no** `user_id` / owner column — the board is intentionally shared.

### Indexes

- `idx_cards_status_position` on `(status, position)`
- `idx_cards_created_at` on `(created_at desc)`

### Realtime + RLS

- RLS enabled with permissive `anon` / `authenticated` policies (shared board for this assignment)
- `replica identity full` for UPDATE/DELETE payloads
- Table added to `supabase_realtime` publication
- `move_card(p_card_id, p_status, p_position)` reindexes columns in one transaction

Migration: [`supabase/migrations/20260726120000_create_cards.sql`](supabase/migrations/20260726120000_create_cards.sql)

---

## Realtime Architecture

| Channel | Purpose |
| --- | --- |
| `board-cards` | `postgres_changes` on `public.cards` |
| `presence:kanban-board` | Presence roster for “N Users Online” |

Clerk identity is **not** used for Realtime channels. Every authenticated browser session joins the same Supabase channels.

---

## Trade-offs

1. **Clerk protects the Next.js UI only** — Supabase still uses a publishable key with open RLS. Direct REST calls with that key can still mutate cards. Fine for a demo; for production, tighten RLS (e.g. JWT / service role patterns) and drop anonymous write access.
2. **No per-user cards** — by design for a shared collaborative board.
3. **`middleware.ts` on Next.js 16** — Next 16 prefers `proxy.ts`, but `middleware.ts` remains supported and matches the Clerk App Router deliverable. Migrate to `proxy.ts` when you standardize on Next 16 naming.
4. **Open Supabase RLS** — anyone with the project URL + publishable key can read/write cards at the API layer.
5. **No Zod** — small shared validators; consider Zod if schemas grow.
6. **`postgres_changes`** — simplest model at this scale; Broadcast scales better at high concurrency.

---

## Environment Variables

`apps/web/.env.local` / `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bsmzzaxgadwpktxejtyp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_48YhrSVweWWUbpJMdjMH-g_dsRVkTzV

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Replace `your_publishable_key` and `your_secret_key` with values from the Clerk dashboard. Never commit real secret keys.

---

## Supabase Setup Instructions

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Paste and run `supabase/migrations/20260726120000_create_cards.sql`.
4. Confirm `public.cards` exists and is in the `supabase_realtime` publication.

---

## How to Run

### Prerequisites

- Node.js `>= 20.9`
- pnpm `10+`
- Clerk application with keys in `.env.local`

### Install

```bash
pnpm install
```

### Develop

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → you should land on **Sign In**.

### Quality checks

```bash
pnpm lint
pnpm check-types
pnpm build
```

### Keyboard shortcuts (on the board)

| Shortcut | Action |
| --- | --- |
| `N` or `1` | New card in To Do |
| `2` | New card in In Progress |
| `3` | New card in Done |
| `Cmd/Ctrl + Enter` | Submit create/save forms |
| `Esc` | Close dialogs/sheets |

---

## Deployment Steps (Vercel)

1. Push the repository.
2. Import in [Vercel](https://vercel.com).
3. Recommended settings:

| Setting | Value |
| --- | --- |
| Root Directory | `.` |
| Install Command | `pnpm install` |
| Build Command | `pnpm turbo run build --filter=web` |

4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
5. In Clerk, add your Vercel production URL to allowed redirect URLs.
6. Deploy and verify sign-in → board → multi-tab realtime sync.

---

## Future Improvements

- Bind Supabase RLS to Clerk JWTs so only signed-in users can hit the API
- Optional per-user or per-board ownership models
- Multi-board workspaces
- Activity feed / audit log
- Soft deletes and undo
- Fractional indexing for larger concurrent reorders
- E2E tests (Playwright) for auth + multi-tab sync

---

## License

Private take-home / interview project. Use and extend as needed for evaluation.
# Collaborative_Kanban
