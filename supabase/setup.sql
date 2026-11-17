-- OMNI-UNNC database setup for Supabase.
-- Paste all of this into Supabase → SQL Editor → New query, then press Run.
-- It is safe to run again: it only adds what is missing and refreshes the rules.
--
-- What it makes:
--   posts   events, notices and news that students post in OMNI
--   regs    who registered for an event posted in OMNI
--   admins  people who may remove any post (add yourself, see the end)
-- Rules (row level security):
--   * Anyone can read posts and registration counts.
--   * Only people signed in with a UNNC email (@nottingham.edu.cn) can post or register.
--   * People can change or delete only their own posts and registrations; admins can delete any post.
--   * Only UNNC emails can create an account at all.

-- ---------- Tables ----------
create table if not exists public.posts (
  id text primary key check (length(id) between 1 and 80),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 20000),
  created_at timestamptz not null default now()
);

create table if not exists public.regs (
  id text primary key check (length(id) between 1 and 200),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create index if not exists posts_created_at on public.posts (created_at desc);
create index if not exists posts_owner on public.posts (owner);
create index if not exists regs_owner on public.regs (owner);

-- ---------- Helpers ----------
create or replace function public.is_unnc() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@nottingham.edu.cn', false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;

-- ---------- Rules ----------
alter table public.posts enable row level security;
alter table public.regs enable row level security;
alter table public.admins enable row level security;

grant select on public.posts, public.regs to anon, authenticated;
grant insert, update, delete on public.posts, public.regs to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "anyone can read posts" on public.posts;
create policy "anyone can read posts" on public.posts for select to anon, authenticated using (true);

drop policy if exists "UNNC students post as themselves" on public.posts;
create policy "UNNC students post as themselves" on public.posts for insert to authenticated
  with check (owner = auth.uid() and public.is_unnc() and data ->> 'createdBy' = auth.uid()::text);

drop policy if exists "edit own posts" on public.posts;
create policy "edit own posts" on public.posts for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and public.is_unnc() and data ->> 'createdBy' = auth.uid()::text);

drop policy if exists "delete own posts, or any as admin" on public.posts;
create policy "delete own posts, or any as admin" on public.posts for delete to authenticated
  using (owner = auth.uid() or public.is_admin());

drop policy if exists "anyone can read registrations" on public.regs;
create policy "anyone can read registrations" on public.regs for select to anon, authenticated using (true);

drop policy if exists "register yourself" on public.regs;
create policy "register yourself" on public.regs for insert to authenticated
  with check (owner = auth.uid() and public.is_unnc()
    and data ->> 'by' = auth.uid()::text and id = (data ->> 'event') || '--' || auth.uid()::text);

drop policy if exists "change own registration" on public.regs;
create policy "change own registration" on public.regs for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and data ->> 'by' = auth.uid()::text and id = (data ->> 'event') || '--' || auth.uid()::text);

drop policy if exists "cancel own registration" on public.regs;
create policy "cancel own registration" on public.regs for delete to authenticated using (owner = auth.uid());

drop policy if exists "see if you are an admin" on public.admins;
create policy "see if you are an admin" on public.admins for select to authenticated using (user_id = auth.uid());

-- ---------- Limits ----------
-- At most 20 posts a day per person, to stop spam.
create or replace function public.posts_daily_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.posts p where p.owner = new.owner and p.created_at > now() - interval '1 day') >= 20 then
    raise exception 'You have posted 20 times today. Please try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists posts_daily_limit on public.posts;
create trigger posts_daily_limit before insert on public.posts for each row execute function public.posts_daily_limit();

-- Only UNNC emails can create an account.
create or replace function public.only_unnc_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(new.email) not like '%@nottingham.edu.cn' then
    raise exception 'Only UNNC emails (@nottingham.edu.cn) can sign in to OMNI';
  end if;
  return new;
end $$;
drop trigger if exists only_unnc_emails on auth.users;
create trigger only_unnc_emails before insert on auth.users for each row execute function public.only_unnc_emails();

-- "Delete my account" in Me → Settings. Removes the sign-in, posts and registrations.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- ---------- Make yourself an admin (optional) ----------
-- After you have signed in to OMNI once, run this with your own UNNC email:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'your-id@nottingham.edu.cn'
--   on conflict do nothing;
