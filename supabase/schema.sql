-- Kör i Supabase SQL Editor. Privat beta: gruppmedlemmar får läsa gruppens innehåll.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'AW-kompis');
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','AW-kompis'));return new;end$$;
create trigger on_auth_signup after insert on auth.users for each row execute function public.new_profile();
create table public.groups (id uuid primary key default gen_random_uuid(),name text not null,owner_id uuid not null references auth.users(id),join_code text unique not null default encode(gen_random_bytes(12),'hex'),created_at timestamptz not null default now());
create table public.group_members (group_id uuid references public.groups(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(group_id,user_id));
create function public.is_group_member(g uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.group_members where group_id=g and user_id=auth.uid())$$;
create table public.venues (id uuid primary key default gen_random_uuid(),name text not null,area text not null,beer_price numeric(8,2),price_checked_at timestamptz,open_note text not null default 'Kontrollera öppettider');
create table public.messages (id uuid primary key default gen_random_uuid(),group_id uuid not null references public.groups(id) on delete cascade,user_id uuid not null references auth.users(id),body text not null check(char_length(body) between 1 and 2000),created_at timestamptz not null default now());
create table public.invitations (id uuid primary key default gen_random_uuid(),group_id uuid not null references public.groups(id) on delete cascade,host_id uuid not null references auth.users(id),venue_id uuid references public.venues(id),venue_name text not null,event_at timestamptz not null,message text not null default '',created_at timestamptz not null default now());
create table public.rsvps (invitation_id uuid references public.invitations(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,response text not null check(response in ('yes','no')),primary key(invitation_id,user_id));
create function public.is_invited(i uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.invitations where id=i and public.is_group_member(group_id))$$;
alter table public.profiles enable row level security;alter table public.groups enable row level security;alter table public.group_members enable row level security;alter table public.venues enable row level security;alter table public.messages enable row level security;alter table public.invitations enable row level security;alter table public.rsvps enable row level security;
create policy "member profiles" on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.group_members m where m.user_id=profiles.id and public.is_group_member(m.group_id)));
create policy "own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "member groups" on public.groups for select to authenticated using(public.is_group_member(id));
create policy "create groups" on public.groups for insert to authenticated with check(owner_id=auth.uid());
create policy "member list" on public.group_members for select to authenticated using(public.is_group_member(group_id));
create policy "owner initial membership" on public.group_members for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.groups where id=group_id and owner_id=auth.uid()));
create policy "venue read" on public.venues for select to authenticated using(true);
create policy "messages read" on public.messages for select to authenticated using(public.is_group_member(group_id));
create policy "messages send" on public.messages for insert to authenticated with check(user_id=auth.uid() and public.is_group_member(group_id));
create policy "invitations read" on public.invitations for select to authenticated using(public.is_group_member(group_id));
create policy "invitations create" on public.invitations for insert to authenticated with check(host_id=auth.uid() and public.is_group_member(group_id));
create policy "rsvp read" on public.rsvps for select to authenticated using(public.is_invited(invitation_id));
create policy "rsvp insert" on public.rsvps for insert to authenticated with check(user_id=auth.uid() and public.is_invited(invitation_id));
create policy "rsvp update" on public.rsvps for update to authenticated using(user_id=auth.uid() and public.is_invited(invitation_id)) with check(user_id=auth.uid() and public.is_invited(invitation_id));
-- Server-side join checks secret code; membership not publicly readable.
create function public.join_group_by_code(code text) returns uuid language plpgsql security definer set search_path=public as $$declare g uuid;begin if auth.uid() is null then raise exception 'Login required';end if;select id into g from public.groups where join_code=code;if g is null then raise exception 'Invalid invite code';end if;insert into public.group_members(group_id,user_id) values(g,auth.uid()) on conflict do nothing;return g;end$$;
revoke all on function public.join_group_by_code(text) from public;grant execute on function public.join_group_by_code(text) to authenticated;
-- Realtime: enable messages and invitations in Supabase Dashboard > Database > Publications.
-- OBS: inga barpriser seedas som fakta. Lägg bara in verifierade uppgifter.
