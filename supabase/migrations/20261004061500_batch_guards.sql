-- Batch guards: 30-day cooldown on re-targeting approved wallets (FR-6 / D48)
-- and maximum 5 open proposed batches per analyst.

create index if not exists remedy_batches_approved_decided_at_idx
  on public.remedy_batches (decided_at desc) where status = 'approved';

create or replace function public.propose_batch(
  p_actor uuid, p_cause text, p_remedy_code text, p_unit_cost_paisa bigint, p_wallet_ids text[]
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  -- Guard 1: Cooldown on re-targeting (wallet approved in last 30 days)
  if exists (
    select 1 from public.batch_wallets w
    join public.remedy_batches b on b.id = w.batch_id
    where w.wallet_id = any(p_wallet_ids)
      and b.status = 'approved'
      and b.decided_at > now() - interval '30 days'
  ) then
    raise exception 'wallet recently targeted in approved campaign' using errcode = 'P0004';
  end if;

  -- Guard 2: Cap open batches per analyst (max 5)
  if (
    select count(*) from public.remedy_batches
    where proposed_by = p_actor and status = 'proposed'
  ) >= 5 then
    raise exception 'too many open batches' using errcode = 'P0005';
  end if;

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

grant execute on function public.propose_batch(uuid, text, text, bigint, text[]) to service_role;
