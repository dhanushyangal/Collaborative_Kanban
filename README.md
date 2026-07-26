# Collaborative Kanban

A realtime collaborative Kanban board where authenticated users can create, edit, move, and delete cards. Changes are synchronized instantly across all connected users.

**Live Demo:** https://collaborative-kanban-web.vercel.app/

## Tech Stack

- Next.js 16.2 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Clerk Authentication
- Supabase (PostgreSQL, Realtime, Presence)
- @dnd-kit
- Turborepo + pnpm
- Vercel

## Features

- Three-column Kanban board (To Do, In Progress, Done)
- Create, edit, move, and delete cards
- Drag and drop between columns
- Realtime collaboration
- Online user count and connection status
- Data persisted in Supabase PostgreSQL
- Clerk authentication

## Setup

Install dependencies:

```bash
pnpm install
```

Create your environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Add:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Run the SQL migration:

```
supabase/migrations/20260726120000_create_cards.sql
```

Start the app:

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```

## Project Structure

```
apps/web/
├── app/
├── actions/
├── components/
├── hooks/
├── lib/
├── utils/
└── middleware.ts

supabase/
└── migrations/
```

## Deployment

- Deploy to Vercel
- Configure the environment variables
- Add the Vercel URL to Clerk's allowed redirect URLs

## Thought Process

I used Supabase as the single source of truth for storing cards and synchronizing updates in realtime. Clerk handles authentication and protects the application, while Next.js Server Actions manage database operations. The goal was to keep the architecture simple, maintainable, and responsive while meeting all assignment requirements.

## Trade-offs

- Used Clerk for authentication to simplify user management, adding one extra dependency.
- Implemented a single shared board instead of supporting multiple boards to match the assignment scope.
- Focused on reliable realtime synchronization instead of advanced collaborative editing features.

## Future Improvements

- Support multiple boards and workspaces.
- Add role-based permissions.
- Improve conflict handling for simultaneous edits.
- Add offline support and automated end-to-end tests.