begin;

create extension if not exists pgcrypto;

create table if not exists public.markets_v14 (
  market_id text primary key,
  program_id text not null default 'veilmarkets_core_v14.aleo',
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
  constraint markets_v14_outcome_labels_len_chk check (cardinality(outcome_labels) = outcome_count),
  constraint markets_v14_outcome_labels_nonempty_chk check (array_position(outcome_labels, '') is null),
  constraint markets_v14_binary_shape_chk
    check (
      market_type <> 0
      or (
        outcome_count = 2
        and lower(outcome_labels[1]) = 'no'
        and lower(outcome_labels[2]) = 'yes'
      )
    ),
  constraint markets_v14_time_chk check (resolution_time > close_time)
);

create index if not exists markets_v14_created_at_idx on public.markets_v14 (created_at desc);
create index if not exists markets_v14_close_time_idx on public.markets_v14 (close_time);
create index if not exists markets_v14_market_type_idx on public.markets_v14 (market_type);
create index if not exists markets_v14_category_idx on public.markets_v14 (category);
create index if not exists markets_v14_token_id_idx on public.markets_v14 (token_id);
create index if not exists markets_v14_program_id_idx on public.markets_v14 (program_id);

create index if not exists markets_v14_search_idx
  on public.markets_v14 using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

alter table public.markets_v14 enable row level security;

drop policy if exists markets_v14_select_public on public.markets_v14;
create policy markets_v14_select_public
  on public.markets_v14
  for select
  to anon, authenticated
  using (true);

drop policy if exists markets_v14_insert_public on public.markets_v14;
create policy markets_v14_insert_public
  on public.markets_v14
  for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'markets_v14'
    ) then
      execute 'alter publication supabase_realtime add table public.markets_v14';
    end if;
  end if;
end
$$;

commit;
