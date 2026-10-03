-- Write path: remedy batches, their wallets, append-only audit log.
-- Tables/triggers/indexes: docs/database-schema.md §2 (D15), unchanged.
-- Added (D20): batch_summaries view + propose_batch/decide_batch functions so each
-- state change and its audit row commit in ONE transaction. Only service_role may call them.

-- ── shared trigger functions ───────────────────────────────────────────────
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create function public.forbid_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% on %.% is not allowed', tg_op, tg_table_schema, tg_table_name;
end $$;

-- ── remedy_batches ─────────────────────────────────────────────────────────
create table public.remedy_batches (
  id              uuid primary key default gen_random_uuid(),
  cause           text not null
                  check (cause in ('job_exit','migration','solved_problem','fee_shock','supply_failure')),
  remedy_code     text not null check (remedy_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  unit_cost_paisa bigint not null check (unit_cost_paisa >= 0),
  status          text not null default 'proposed'
                  check (status in ('proposed','approved','rejected')),
  proposed_by     uuid not null references auth.users (id) on delete restrict,
  decided_by      uuid references auth.users (id) on delete restrict,
  decided_at      timestamptz,
  decision_note   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- FR-10 two-person rule
  constraint remedy_batches_two_person check (decided_by <> proposed_by),
  -- decision fields are all-null while proposed, all-present once decided
  constraint remedy_batches_decision_shape check (
    (status = 'proposed' and decided_by is null and decided_at is null and decision_note is null)
    or
    (status <> 'proposed' and decided_by is not null and decided_at is not null
       and length(btrim(decision_note)) > 0)
  ),
  constraint remedy_batches_decided_after_created check (decided_at >= created_at),
  -- target for batch_wallets' composite FK (lets the child mirror status)
  constraint remedy_batches_id_status_key unique (id, status)
);

-- FR-6: proposed -> approved | rejected, once. Only decision fields may change.
create function public.lock_decided_batch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'proposed' then
    raise exception 'batch % is already %', old.id, old.status;
  end if;
  if (new.cause, new.remedy_code, new.unit_cost_paisa, new.proposed_by, new.created_at)
     is distinct from
     (old.cause, old.remedy_code, old.unit_cost_paisa, old.proposed_by, old.created_at) then
    raise exception 'only the decision fields of batch % may change', old.id;
  end if;
  return new;
end $$;

create trigger remedy_batches_lock      before update on public.remedy_batches
  for each row execute function public.lock_decided_batch();
create trigger remedy_batches_updated_at before update on public.remedy_batches
  for each row execute function public.set_updated_at();
create trigger remedy_batches_no_delete before delete on public.remedy_batches
  for each row execute function public.forbid_change();

create index remedy_batches_status_created_at_idx
  on public.remedy_batches (status, created_at desc);
create index remedy_batches_proposed_by_created_at_idx
  on public.remedy_batches (proposed_by, created_at desc);
create index remedy_batches_decided_by_idx
  on public.remedy_batches (decided_by) where decided_by is not null;

-- ── batch_wallets ──────────────────────────────────────────────────────────
create table public.batch_wallets (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null,
  batch_status text not null default 'proposed',
  wallet_id    text not null check (wallet_id ~ '^W-[0-9A-Z]{6}$'),   -- FR-11 pseudonymous only
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint batch_wallets_batch_fk foreign key (batch_id, batch_status)
    references public.remedy_batches (id, status) on update cascade on delete restrict,
  constraint batch_wallets_batch_wallet_key unique (batch_id, wallet_id)
);

-- FR-6: a wallet may be in at most one open (proposed) batch
create unique index batch_wallets_one_open_batch_idx
  on public.batch_wallets (wallet_id) where batch_status = 'proposed';

-- Wallets can only be added or removed while the batch is proposed. Only the
-- cascaded batch_status may change on an existing row.
create function public.guard_batch_wallets() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (new.batch_id, new.wallet_id, new.created_at)
       is distinct from (old.batch_id, old.wallet_id, old.created_at) then
      raise exception 'batch_wallets rows are immutable';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.batch_status <> 'proposed' then
      raise exception 'batch % is %, its wallets are frozen', old.batch_id, old.batch_status;
    end if;
    return old;
  else
    if new.batch_status <> 'proposed' then
      raise exception 'batch % is %, its wallets are frozen', new.batch_id, new.batch_status;
    end if;
    return new;
  end if;
end $$;

create trigger batch_wallets_guard before insert or update or delete on public.batch_wallets
  for each row execute function public.guard_batch_wallets();
create trigger batch_wallets_updated_at before update on public.batch_wallets
  for each row execute function public.set_updated_at();

-- ── audit_log (FR-9, append-only) ──────────────────────────────────────────
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid not null references auth.users (id) on delete restrict,
  actor_role text not null check (actor_role in ('analyst','approver')),
  action     text not null check (action in ('batch.propose','batch.approve','batch.reject')),
  target_id  uuid not null references public.remedy_batches (id) on delete restrict,
  metadata   jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint audit_log_role_matches_action check (
    (action = 'batch.propose' and actor_role = 'analyst')
    or (action in ('batch.approve','batch.reject') and actor_role = 'approver')
  ),
  constraint audit_log_never_updated check (updated_at = created_at)
);

create trigger audit_log_no_update_delete before update or delete on public.audit_log
  for each row execute function public.forbid_change();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.forbid_change();

create index audit_log_target_id_created_at_idx on public.audit_log (target_id, created_at);
create index audit_log_actor_id_created_at_idx  on public.audit_log (actor_id, created_at desc);

-- ── API read shape (D20) ───────────────────────────────────────────────────
create view public.batch_summaries with (security_invoker = true) as
select b.id, b.cause, b.remedy_code, b.unit_cost_paisa, b.status, b.proposed_by,
       b.decided_by, b.decided_at, b.decision_note, b.created_at,
       (select count(*) from public.batch_wallets w where w.batch_id = b.id)::int as wallet_count
from public.remedy_batches b;

-- ── transactional write functions (D20) ────────────────────────────────────
-- Error codes the API maps: 23505 -> 409 wallet already in an open batch,
-- P0002 -> 404, 55000 -> 409 not proposed, 42501 -> 403 self-approval.
create function public.propose_batch(
  p_actor uuid, p_cause text, p_remedy_code text, p_unit_cost_paisa bigint, p_wallet_ids text[]
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.remedy_batches (cause, remedy_code, unit_cost_paisa, proposed_by)
  values (p_cause, p_remedy_code, p_unit_cost_paisa, p_actor)
  returning id into v_id;

  insert into public.batch_wallets (batch_id, wallet_id)
  select v_id, w from (select distinct unnest(p_wallet_ids) as w) d;

  insert into public.audit_log (actor_id, actor_role, action, target_id, metadata)
  values (p_actor, 'analyst', 'batch.propose', v_id,
          jsonb_build_object('cause', p_cause, 'remedy_code', p_remedy_code,
                             'wallet_count', (select count(*) from public.batch_wallets where batch_id = v_id)));

  return (select to_jsonb(s) from public.batch_summaries s where s.id = v_id);
end $$;

create function public.decide_batch(
  p_actor uuid, p_batch_id uuid, p_status text, p_note text
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_batch public.remedy_batches;
begin
  if p_status not in ('approved','rejected') then
    raise exception 'invalid decision %', p_status using errcode = '22023';
  end if;

  select * into v_batch from public.remedy_batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch % not found', p_batch_id using errcode = 'P0002';
  end if;
  if v_batch.status <> 'proposed' then
    raise exception 'batch % is already %', p_batch_id, v_batch.status using errcode = '55000';
  end if;
  if v_batch.proposed_by = p_actor then
    raise exception 'proposer cannot decide batch %', p_batch_id using errcode = '42501';
  end if;

  update public.remedy_batches
     set status = p_status, decided_by = p_actor, decided_at = now(), decision_note = p_note
   where id = p_batch_id;

  insert into public.audit_log (actor_id, actor_role, action, target_id, metadata)
  values (p_actor, 'approver',
          case p_status when 'approved' then 'batch.approve' else 'batch.reject' end,
          p_batch_id, jsonb_build_object('note', p_note));

  return (select to_jsonb(s) from public.batch_summaries s where s.id = p_batch_id);
end $$;

-- ── access ─────────────────────────────────────────────────────────────────
-- Only the FastAPI backend touches these objects, using the service role, which
-- bypasses RLS. RLS on with no policies = anon/authenticated clients get nothing.
alter table public.remedy_batches enable row level security;
alter table public.batch_wallets  enable row level security;
alter table public.audit_log      enable row level security;

revoke all on public.batch_summaries from anon, authenticated;
revoke execute on function public.propose_batch(uuid, text, text, bigint, text[]) from public, anon, authenticated;
revoke execute on function public.decide_batch(uuid, uuid, text, text)            from public, anon, authenticated;
grant  execute on function public.propose_batch(uuid, text, text, bigint, text[]) to service_role;
grant  execute on function public.decide_batch(uuid, uuid, text, text)            to service_role;
