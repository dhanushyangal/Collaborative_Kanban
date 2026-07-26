-- Collaboration layer: profiles, ticket fields, comments, history, priority.
-- Run after 20260726120000_create_cards.sql. Does not recreate public.cards.

begin;

create table if not exists public.profiles (
  id text primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (email);

alter table public.cards
  add column if not exists ticket_number integer,
  add column if not exists priority text,
  add column if not exists reporter_id text references public.profiles (id) on delete set null,
  add column if not exists assignee_id text references public.profiles (id) on delete set null;

create sequence if not exists public.cards_ticket_number_seq;

update public.cards
set ticket_number = nextval('public.cards_ticket_number_seq')
where ticket_number is null;

update public.cards
set priority = 'medium'
where priority is null or priority = 'med';

alter table public.cards
  alter column ticket_number set default nextval('public.cards_ticket_number_seq');

alter table public.cards
  alter column ticket_number set not null;

alter table public.cards
  alter column priority set default 'medium';

alter table public.cards
  alter column priority set not null;

alter table public.cards
  drop constraint if exists cards_priority_check;

alter table public.cards
  add constraint cards_priority_check
  check (priority in ('high', 'medium', 'low'));

create unique index if not exists idx_cards_ticket_number
  on public.cards (ticket_number);

create index if not exists idx_cards_assignee_id on public.cards (assignee_id);
create index if not exists idx_cards_reporter_id on public.cards (reporter_id);
create index if not exists idx_cards_priority on public.cards (priority);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  author_id text not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (length(btrim(body)) between 1 and 2000)
);

create index if not exists idx_comments_card_created
  on public.comments (card_id, created_at asc);

create table if not exists public.card_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  actor_id text references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.card_history
  drop constraint if exists card_history_event_type_check;

alter table public.card_history
  add constraint card_history_event_type_check check (
    event_type in (
      'created',
      'title_changed',
      'description_changed',
      'status_changed',
      'assignee_changed',
      'priority_changed',
      'comment_added'
    )
  );

create index if not exists idx_card_history_card_created
  on public.card_history (card_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.card_history enable row level security;

drop policy if exists "Allow read profiles" on public.profiles;
create policy "Allow read profiles"
  on public.profiles for select to anon, authenticated using (true);

drop policy if exists "Allow upsert profiles" on public.profiles;
create policy "Allow upsert profiles"
  on public.profiles for insert to anon, authenticated with check (true);

drop policy if exists "Allow update profiles" on public.profiles;
create policy "Allow update profiles"
  on public.profiles for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow read comments" on public.comments;
create policy "Allow read comments"
  on public.comments for select to anon, authenticated using (true);

drop policy if exists "Allow insert comments" on public.comments;
create policy "Allow insert comments"
  on public.comments for insert to anon, authenticated with check (true);

drop policy if exists "Allow delete own-shaped comments" on public.comments;
create policy "Allow delete own-shaped comments"
  on public.comments for delete to anon, authenticated using (true);

drop policy if exists "Allow read card history" on public.card_history;
create policy "Allow read card history"
  on public.card_history for select to anon, authenticated using (true);

drop policy if exists "Allow insert card history" on public.card_history;
create policy "Allow insert card history"
  on public.card_history for insert to anon, authenticated with check (true);

alter table public.comments replica identity full;
alter table public.card_history replica identity full;
alter table public.profiles replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'card_history'
  ) then
    alter publication supabase_realtime add table public.card_history;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

commit;
