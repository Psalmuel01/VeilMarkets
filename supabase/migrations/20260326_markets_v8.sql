begin;

create extension if not exists pgcrypto;

drop table if exists public.markets_v8 cascade;

create table public.markets_v8 (
  id uuid primary key default gen_random_uuid(),
  market_id text not null unique,
  transaction_id text not null unique,
  title text not null,
  description text not null default '',
  source text not null default 'Creator',
  category smallint not null check (category between 0 and 6),
  market_type smallint not null check (market_type in (0, 1)), -- 0=binary, 1=categorical
  outcome_count smallint not null check (outcome_count between 2 and 8),
  outcome_labels text[] not null,
  token_id text not null,
  close_time bigint not null,
  resolution_time bigint not null,
  expiry_time bigint generated always as (close_time * 1000) stored,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint markets_v8_outcome_labels_len_chk check (cardinality(outcome_labels) = outcome_count),
  constraint markets_v8_outcome_labels_nonempty_chk check (array_position(outcome_labels, '') is null),
  constraint markets_v8_binary_shape_chk
    check (
      market_type <> 0
      or (
        outcome_count = 2
        and lower(outcome_labels[1]) = 'no'
        and lower(outcome_labels[2]) = 'yes'
      )
    ),
  constraint markets_v8_time_chk check (resolution_time > close_time)
);

create index if not exists markets_v8_created_at_idx on public.markets_v8 (created_at desc);
create index if not exists markets_v8_close_time_idx on public.markets_v8 (close_time);
create index if not exists markets_v8_market_type_idx on public.markets_v8 (market_type);
create index if not exists markets_v8_category_idx on public.markets_v8 (category);
create index if not exists markets_v8_token_id_idx on public.markets_v8 (token_id);

create index if not exists markets_v8_search_idx
  on public.markets_v8 using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_markets_v8_updated_at on public.markets_v8;
create trigger trg_markets_v8_updated_at
before update on public.markets_v8
for each row execute function public.set_updated_at();

alter table public.markets_v8 enable row level security;

drop policy if exists markets_v8_select_public on public.markets_v8;
create policy markets_v8_select_public
  on public.markets_v8
  for select
  to anon, authenticated
  using (true);

drop policy if exists markets_v8_insert_public on public.markets_v8;
create policy markets_v8_insert_public
  on public.markets_v8
  for insert
  to anon, authenticated
  with check (true);

commit;
