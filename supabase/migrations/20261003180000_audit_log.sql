create table if not exists public.triage_audit_log (
    id uuid primary key default gen_random_uuid(),
    wallet_id text,
    population text,
    verdict text,
    cause text,
    posterior jsonb,
    reasons jsonb,
    created_at timestamptz default now()
);

alter table public.triage_audit_log enable row level security;
