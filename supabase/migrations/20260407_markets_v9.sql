begin;

create extension if not exists pgcrypto;

create table if not exists public.markets_v9 (
  id uuid primary key default gen_random_uuid(),
  program_id text not null default 'veilmarkets_v9.aleo',
  market_id text not null unique,
  transaction_id text not null unique,
  title text not null,
  description text not null default '',
  source text not null default 'Creator',
  category smallint not null check (category between 0 and 6),
  market_type smallint not null check (market_type in (0, 1)), -- 0=binary, 1=categorical
  outcome_count smallint not null check (outcome_count between 2 and 32),
  outcome_labels text[] not null,
  token_id text not null,
  close_time bigint not null,
  resolution_time bigint not null,
  expiry_time bigint generated always as (close_time * 1000) stored,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint markets_v9_outcome_labels_len_chk check (cardinality(outcome_labels) = outcome_count),
  constraint markets_v9_outcome_labels_nonempty_chk check (array_position(outcome_labels, '') is null),
  constraint markets_v9_binary_shape_chk
    check (
      market_type <> 0
      or (
        outcome_count = 2
        and lower(outcome_labels[1]) = 'no'
        and lower(outcome_labels[2]) = 'yes'
      )
    ),
  constraint markets_v9_time_chk check (resolution_time > close_time)
);

create index if not exists markets_v9_created_at_idx on public.markets_v9 (created_at desc);
create index if not exists markets_v9_close_time_idx on public.markets_v9 (close_time);
create index if not exists markets_v9_market_type_idx on public.markets_v9 (market_type);
create index if not exists markets_v9_category_idx on public.markets_v9 (category);
create index if not exists markets_v9_token_id_idx on public.markets_v9 (token_id);
create index if not exists markets_v9_program_id_idx on public.markets_v9 (program_id);

create index if not exists markets_v9_search_idx
  on public.markets_v9 using gin (
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

drop trigger if exists trg_markets_v9_updated_at on public.markets_v9;
create trigger trg_markets_v9_updated_at
before update on public.markets_v9
for each row execute function public.set_updated_at();

alter table public.markets_v9 enable row level security;

drop policy if exists markets_v9_select_public on public.markets_v9;
create policy markets_v9_select_public
  on public.markets_v9
  for select
  to anon, authenticated
  using (true);

drop policy if exists markets_v9_insert_public on public.markets_v9;
create policy markets_v9_insert_public
  on public.markets_v9
  for insert
  to anon, authenticated
  with check (true);

create table if not exists public.market_trades_v9 (
  id uuid primary key default gen_random_uuid(),
  market_id text not null references public.markets_v9(market_id) on delete cascade,
  transaction_id text not null unique,
  trader text not null,
  side text not null check (side in ('buy', 'sell')),
  outcome_index smallint not null check (outcome_index between 0 and 31),
  collateral_amount bigint not null check (collateral_amount >= 0),
  shares bigint not null check (shares >= 0),
  token_id text not null,
  block_height bigint,
  created_at timestamptz not null default now()
);

create index if not exists market_trades_v9_market_id_idx on public.market_trades_v9 (market_id);
create index if not exists market_trades_v9_created_at_idx on public.market_trades_v9 (created_at desc);
create index if not exists market_trades_v9_trader_idx on public.market_trades_v9 (trader);

alter table public.market_trades_v9 enable row level security;

drop policy if exists market_trades_v9_select_public on public.market_trades_v9;
create policy market_trades_v9_select_public
  on public.market_trades_v9
  for select
  to anon, authenticated
  using (true);

drop policy if exists market_trades_v9_insert_public on public.market_trades_v9;
create policy market_trades_v9_insert_public
  on public.market_trades_v9
  for insert
  to anon, authenticated
  with check (true);

create table if not exists public.market_resolutions_v9 (
  id uuid primary key default gen_random_uuid(),
  market_id text not null references public.markets_v9(market_id) on delete cascade,
  transaction_id text not null unique,
  outcome_index smallint not null check (outcome_index between 0 and 31),
  resolver text not null,
  disputed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists market_resolutions_v9_market_id_idx on public.market_resolutions_v9 (market_id);
create index if not exists market_resolutions_v9_created_at_idx on public.market_resolutions_v9 (created_at desc);

alter table public.market_resolutions_v9 enable row level security;

drop policy if exists market_resolutions_v9_select_public on public.market_resolutions_v9;
create policy market_resolutions_v9_select_public
  on public.market_resolutions_v9
  for select
  to anon, authenticated
  using (true);

drop policy if exists market_resolutions_v9_insert_public on public.market_resolutions_v9;
create policy market_resolutions_v9_insert_public
  on public.market_resolutions_v9
  for insert
  to anon, authenticated
  with check (true);

commit;
