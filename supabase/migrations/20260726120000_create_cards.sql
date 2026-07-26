-- Collaborative Kanban Board schema
-- Creates cards table, indexes, RLS, realtime publication, and move_card RPC.

begin;

create extension if not exists "pgcrypto";

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_title_length check (length(btrim(title)) between 1 and 200),
  constraint cards_status_check check (status in ('todo', 'in-progress', 'done')),
  constraint cards_position_nonnegative check (position >= 0)
);

create index if not exists idx_cards_status_position
  on public.cards (status, position);

create index if not exists idx_cards_created_at
  on public.cards (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row
  execute function public.set_updated_at();

alter table public.cards enable row level security;

drop policy if exists "Allow anonymous read cards" on public.cards;
create policy "Allow anonymous read cards"
  on public.cards
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow anonymous insert cards" on public.cards;
create policy "Allow anonymous insert cards"
  on public.cards
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow anonymous update cards" on public.cards;
create policy "Allow anonymous update cards"
  on public.cards
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow anonymous delete cards" on public.cards;
create policy "Allow anonymous delete cards"
  on public.cards
  for delete
  to anon, authenticated
  using (true);

alter table public.cards replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cards'
  ) then
    alter publication supabase_realtime add table public.cards;
  end if;
end;
$$;

create or replace function public.move_card(
  p_card_id uuid,
  p_status text,
  p_position integer
)
returns public.cards
language plpgsql
security invoker
as $$
declare
  v_card public.cards;
  v_old_status text;
  v_old_position integer;
  v_target_count integer;
begin
  if p_status not in ('todo', 'in-progress', 'done') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_position < 0 then
    raise exception 'Position must be non-negative';
  end if;

  select *
  into v_card
  from public.cards
  where id = p_card_id
  for update;

  if not found then
    raise exception 'Card not found: %', p_card_id;
  end if;

  v_old_status := v_card.status;
  v_old_position := v_card.position;

  if v_old_status = p_status then
    select count(*)::integer into v_target_count
    from public.cards
    where status = p_status;

    if p_position >= v_target_count then
      p_position := greatest(v_target_count - 1, 0);
    end if;

    if p_position = v_old_position then
      return v_card;
    end if;

    if p_position < v_old_position then
      update public.cards
      set position = position + 1
      where status = p_status
        and position >= p_position
        and position < v_old_position
        and id <> p_card_id;
    else
      update public.cards
      set position = position - 1
      where status = p_status
        and position <= p_position
        and position > v_old_position
        and id <> p_card_id;
    end if;

    update public.cards
    set status = p_status,
        position = p_position
    where id = p_card_id
    returning * into v_card;

    return v_card;
  end if;

  -- Close the gap in the source column.
  update public.cards
  set position = position - 1
  where status = v_old_status
    and position > v_old_position;

  select count(*)::integer into v_target_count
  from public.cards
  where status = p_status;

  if p_position > v_target_count then
    p_position := v_target_count;
  end if;

  -- Make room in the destination column.
  update public.cards
  set position = position + 1
  where status = p_status
    and position >= p_position;

  update public.cards
  set status = p_status,
      position = p_position
  where id = p_card_id
  returning * into v_card;

  return v_card;
end;
$$;

grant execute on function public.move_card(uuid, text, integer) to anon, authenticated;

commit;
