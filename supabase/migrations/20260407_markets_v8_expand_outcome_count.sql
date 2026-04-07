begin;

alter table public.markets_v8
  drop constraint if exists markets_v8_outcome_count_check;

alter table public.markets_v8
  add constraint markets_v8_outcome_count_check
  check (outcome_count between 2 and 8);

commit;
