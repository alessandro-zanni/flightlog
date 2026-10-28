-- One row per leg. Single-user app: signup is closed, so "authenticated" is
-- the owner. The inbound-mail webhook writes with the secret key (bypasses RLS).
create table public.flights (
  id bigint generated always as identity primary key,
  date date not null,
  origin char(3) not null check (origin ~ '^[A-Z]{3}$'),
  destination char(3) not null check (destination ~ '^[A-Z]{3}$'),
  airline text not null,
  flight text,
  pnr text,
  created_at timestamptz not null default now(),
  -- Re-importing the same leg (mail forwarded twice, JSON re-run) is a no-op.
  unique nulls not distinct (date, origin, destination, flight)
);

alter table public.flights enable row level security;

-- ponytail: owner-only by closed signup, add user_id + auth.uid() policies if a second user ever appears
create policy flights_owner on public.flights
  for all to authenticated using (true) with check (true);

-- Supabase's default privileges grant every new table in full to anon too:
-- reset to exactly what the app needs.
revoke all on public.flights from anon, authenticated;
grant select, insert, delete on public.flights to authenticated;
