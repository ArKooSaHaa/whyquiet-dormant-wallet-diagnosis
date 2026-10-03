# Contract 2 — Write-path API

> FROZEN at H0. Owner: **Arko** (`src/api/`). Consumer: **Shads** (`web/`).
> Source of truth after H1 = generated `web/src/api/schema.d.ts` (`make gen-types`). This file is the
> plan; if they disagree, raise it in chat. Arko pushes **stubs returning the exact shapes by H1**.

Auth: `Authorization: Bearer <access_token>` from `/api/auth/login`. Role comes from Supabase
`app_metadata.role` and is checked server-side. No new frontend dependency (no supabase-js): login is
proxied through the existing Python `supabase` client.

| Method & path | Who | Body | 200 response | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | anyone | `{email, password}` | `{access_token, user_id, role: "analyst"\|"approver"}` | 401 bad creds, 503 Supabase down |
| `GET /api/batches` | anyone | — | `Batch[]` (newest first) | 503 → UI shows "write path offline" |
| `POST /api/batches` | analyst | `{cause, wallet_ids: string[1..1000]}` | `Batch` | 401, 403 not analyst, 409 wallet already in an open batch, 422 |
| `POST /api/batches/{id}/approve` | approver, not proposer | `{note: string[1..500]}` | `Batch` | 401, 403 (role, or self-approval), 404, 409 not `proposed` |
| `POST /api/batches/{id}/reject` | approver, not proposer | `{note: string[1..500]}` | `Batch` | same as approve |
| `GET /api/batches/{id}/export` | anyone | — | `{batch_id, cause, remedy_code, wallet_ids, cost_bdt, approved_by, approved_at}` | 404, 409 not approved |

```ts
type Batch = {
  id: string; cause: Cause; remedy_code: string; unit_cost_bdt: number; wallet_count: number;
  status: "proposed" | "approved" | "rejected";
  proposed_by: string; decided_by: string | null; decided_at: string | null; decision_note: string | null;
  created_at: string;
};
```

Error body is FastAPI's default: `{"detail": "<human readable>"}`. Show `detail` to the user.

Demo accounts (seeded by Arko, passwords in team chat only, never in git):
`analyst@whyquiet.demo` (analyst), `approver@whyquiet.demo` (approver).
