# Collaborative Kanban

A realtime Kanban board. Sign in, open the same board as everyone else, and move work together without refreshing.

**Live demo:** https://collaborative-kanban-web.vercel.app/

## Stack

- Next.js 16.2 (App Router), React 19, TypeScript, Tailwind CSS v4
- pnpm + Turborepo
- Clerk (auth)
- Supabase (Postgres + Realtime + Presence)
- @dnd-kit, shadcn/ui
- Deployed on Vercel

## Features

- Three columns: To Do, In Progress, Done
- Create / edit / move / delete cards
- Priority: High, Medium, Low
- Assignee + reporter, Assign to me, filter Assigned to me
- Ticket dialog with comments and history
- Live connection status and online count
- Everything stored in Supabase

## Thought process

I wanted something that feels like a thin Jira/Linear board — not a full project suite.

The board itself stays dumb: columns and cards. Anything heavier (status, assignee, priority, comments, history) lives in a ticket dialog. That kept the main view calm and made collaboration obvious when you open a card.

For realtime I stuck with Supabase instead of building a socket server. Postgres is the source of truth; Server Actions write; Realtime pushes changes to whoever has the board open. Clerk answers “who is this person?” so we can show names/emails and key Presence by user id.

I deliberately skipped attachments, subtasks, and multi-board workspaces. Those would have eaten the week and made the core story harder to demo.

## Trade-offs

- **One board for everyone.** Assignment means ownership, not “you can’t see this ticket.” Filtering with Assigned to me is enough for this scope.
- **Open RLS on Supabase.** The app is gated by Clerk; the anon key can still hit the API. Fine for a take-home. In production I’d wire Clerk JWTs into Supabase and lock policies down.
- **History is short event lines**, not a full diff audit log.
- **Last write wins** on title/description. No CRDT. Acceptable when people aren’t typing the same field at the same second.

## What I would improve with another day

- Real RLS tied to Clerk
- Avatar stack of who’s viewing, not just a number
- A toast when someone else edits the ticket you have open
- Playwright covering two browsers creating, assigning, commenting, and moving
- Multiple boards only after the single-board path feels boringly solid

## Database

Only **two** SQL files. Run them in order in the Supabase SQL editor:

1. `supabase/migrations/20260726120000_create_cards.sql` — base `cards` table + `move_card`
2. `supabase/migrations/20260727010000_card_collaboration.sql` — profiles, ticket number, priority, assignee/reporter, comments, history, realtime

| Table | Purpose |
|-------|---------|
| `profiles` | Signed-in users (id, email, name, avatar) |
| `cards` | Tickets (`ticket_number`, `priority`, `reporter_id`, `assignee_id`, …) |
| `comments` | Comments on a ticket |
| `card_history` | Activity feed |

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Add your Supabase + Clerk keys, run the two SQL migrations, then:

```bash
pnpm dev
```

Need pnpm?

```bash
npm install -g pnpm@10.34.5
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```

## Deploy

1. Deploy `apps/web` on Vercel
2. Set the same env vars as `.env.example`
3. Add the Vercel URL in Clerk (origins / redirects)
4. Confirm both migrations are applied
