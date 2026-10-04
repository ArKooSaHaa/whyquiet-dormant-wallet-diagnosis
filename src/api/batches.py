import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Query as FastQuery
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from src.api.auth import Actor, current_user, role_of, supabase_client
from src.api.schemas import (
    AuditEntry,
    Batch,
    BatchStatus,
    CreateBatchRequest,
    DecisionRequest,
    ExportBatchResponse,
    LockedWallet,
    LockReason,
    LoginRequest,
    LoginResponse,
    UserRole,
)
from src.rules.remedies import REMEDIES
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

SB = Annotated[Client, Depends(supabase_client)]
User = Annotated[Actor, Depends(current_user)]

# Postgres error codes raised by the migration's functions/constraints -> HTTP.
DB_ERRORS = {
    "23505": (409, "A wallet is already in an open batch"),
    "P0002": (404, "Batch not found"),
    "55000": (409, "Batch is not in 'proposed' state"),
    "42501": (403, "You cannot decide a batch you proposed"),
    "P0004": (409, "A wallet was approved in a campaign in the last 30 days"),
    "P0005": (429, "Too many open batches. Wait for a decision before proposing more."),
}


def _rpc(sb: Client, fn: str, params: dict) -> Any:
    try:
        return sb.rpc(fn, params).execute().data
    except APIError as exc:
        if exc.code in DB_ERRORS:
            status, detail = DB_ERRORS[exc.code]
            raise HTTPException(status, detail) from exc
        raise


def _batch(row: Any) -> Batch:
    return Batch(
        id=str(row["id"]),
        cause=row["cause"],
        remedy_code=row["remedy_code"],
        unit_cost_bdt=row["unit_cost_paisa"] / 100,
        wallet_count=row["wallet_count"],
        status=row["status"],
        proposed_by=str(row["proposed_by"]),
        decided_by=row["decided_by"],
        decided_at=row["decided_at"],
        decision_note=row["decision_note"],
        created_at=row["created_at"],
    )


def _require(actor: Actor, role: UserRole) -> None:
    if actor.role != role:
        raise HTTPException(403, f"Requires the {role.value} role")


@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, sb: SB) -> LoginResponse:
    # Authenticate with Supabase credentials and return JWT access token and user role
    try:
        resp = sb.auth.sign_in_with_password({"email": req.email, "password": req.password})
    except AuthApiError as exc:
        raise HTTPException(401, "Invalid email or password") from exc
    except Exception as exc:
        logger.warning("Supabase login failed: %s", exc)
        raise HTTPException(503, "Write path offline") from exc
    if not resp.session or not resp.user:
        raise HTTPException(401, "Invalid email or password")
    return LoginResponse(
        access_token=resp.session.access_token,
        user_id=resp.user.id,
        role=role_of(resp.user.app_metadata),
    )


@router.get("/batches", response_model=list[Batch])
def list_batches(
    sb: SB,
    status: BatchStatus | None = None,
    limit: int = FastQuery(20, ge=1, le=100),
    offset: int = FastQuery(0, ge=0),
) -> list[Batch]:
    # List all proposed, approved, and rejected batches with optional filtering/pagination
    query = sb.table("batch_summaries").select("*").order("created_at", desc=True)
    if status is not None:
        query = query.eq("status", status.value)
    rows: Any = query.range(offset, offset + limit - 1).execute().data
    return [_batch(r) for r in rows]


@router.post("/batches", response_model=Batch)
def create_batch(req: CreateBatchRequest, sb: SB, actor: User) -> Batch:
    # Propose a new cause-targeted batch (Analyst only). Remedy and pricing derived from rules
    _require(actor, UserRole.analyst)
    remedy = REMEDIES[req.cause.value]
    row: Any = _rpc(
        sb,
        "propose_batch",
        {
            "p_actor": actor.id,
            "p_cause": req.cause.value,
            "p_remedy_code": remedy["remedy_code"],
            "p_unit_cost_paisa": round(remedy["unit_cost_bdt"] * 100),
            "p_wallet_ids": req.wallet_ids,
        },
    )
    return _batch(row)


def _decide(sb: Client, actor: Actor, batch_id: UUID, status: BatchStatus, note: str) -> Batch:
    _require(actor, UserRole.approver)
    row: Any = _rpc(
        sb,
        "decide_batch",
        {"p_actor": actor.id, "p_batch_id": str(batch_id), "p_status": status.value, "p_note": note},
    )
    return _batch(row)


@router.post("/batches/{id}/approve", response_model=Batch)
def approve_batch(id: UUID, req: DecisionRequest, sb: SB, actor: User) -> Batch:
    # Approve a proposed batch (Approver only, cannot approve self-proposed batches)
    return _decide(sb, actor, id, BatchStatus.approved, req.note)


@router.post("/batches/{id}/reject", response_model=Batch)
def reject_batch(id: UUID, req: DecisionRequest, sb: SB, actor: User) -> Batch:
    # Reject a proposed batch (Approver only, cannot reject self-proposed batches)
    return _decide(sb, actor, id, BatchStatus.rejected, req.note)


@router.get("/batches/{id}/export", response_model=ExportBatchResponse)
def export_batch(id: UUID, sb: SB, actor: User) -> ExportBatchResponse:
    # Export campaign parameters and target wallet IDs for an approved batch (Authenticated only)
    rows: Any = sb.table("batch_summaries").select("*").eq("id", str(id)).execute().data
    if not rows:
        raise HTTPException(404, "Batch not found")
    b: Any = rows[0]
    if b["status"] != BatchStatus.approved.value:
        raise HTTPException(409, "Batch is not approved")
    wallets: Any = (
        sb.table("batch_wallets").select("wallet_id").eq("batch_id", str(id)).order("wallet_id").execute().data
    )
    wallet_ids = [w["wallet_id"] for w in wallets]
    return ExportBatchResponse(
        batch_id=str(b["id"]),
        cause=b["cause"],
        remedy_code=b["remedy_code"],
        wallet_ids=wallet_ids,
        cost_bdt=b["unit_cost_paisa"] * len(wallet_ids) / 100,
        approved_by=str(b["decided_by"]),
        approved_at=b["decided_at"],
    )


@router.get("/wallets/locked", response_model=list[LockedWallet])
def list_locked_wallets(sb: SB, actor: User) -> list[LockedWallet]:
    # Returns wallets currently in an open proposed batch or within 30 days of approval
    locked_dict: dict[str, LockedWallet] = {}
    try:
        # 1. Open wallets in proposed batches
        open_rows: Any = sb.table("batch_wallets").select("wallet_id").eq("batch_status", "proposed").execute().data
        for r in open_rows:
            locked_dict[r["wallet_id"]] = LockedWallet(wallet_id=r["wallet_id"], reason=LockReason.open)

        # 2. Cooldown wallets from batches approved in last 30 days
        cutoff = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        appr_batches: Any = (
            sb.table("remedy_batches")
            .select("id, decided_at")
            .eq("status", "approved")
            .gt("decided_at", cutoff)
            .execute()
            .data
        )
        if appr_batches:
            batch_ids = [b["id"] for b in appr_batches]
            batch_times = {b["id"]: b["decided_at"] for b in appr_batches}
            cooldown_wallets: Any = (
                sb.table("batch_wallets")
                .select("batch_id, wallet_id")
                .in_("batch_id", batch_ids)
                .execute()
                .data
            )
            for cw in cooldown_wallets:
                w_id = cw["wallet_id"]
                if w_id not in locked_dict:
                    d_at = batch_times.get(cw["batch_id"])
                    until_str = None
                    if d_at:
                        try:
                            d_time = datetime.fromisoformat(d_at)
                            until_str = (d_time + timedelta(days=30)).isoformat()
                        except (ValueError, TypeError):
                            until_str = None
                    locked_dict[w_id] = LockedWallet(
                        wallet_id=w_id, reason=LockReason.cooldown, until=until_str
                    )
    except APIError as exc:
        logger.warning("Failed to fetch locked wallets from Supabase: %s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Unexpected error fetching locked wallets: %s", exc)

    return list(locked_dict.values())


@router.get("/batches/{id}/audit", response_model=list[AuditEntry])
def get_batch_audit(id: UUID, sb: SB, actor: User) -> list[AuditEntry]:
    # Returns the immutable audit history entries for a given batch, oldest first
    b_rows: Any = sb.table("remedy_batches").select("id").eq("id", str(id)).execute().data
    if not b_rows:
        raise HTTPException(404, "Batch not found")
    rows: Any = (
        sb.table("audit_log")
        .select("*")
        .eq("target_id", str(id))
        .order("created_at", desc=False)
        .execute()
        .data
    )
    result: list[AuditEntry] = []
    for r in rows:
        result.append(
            AuditEntry(
                id=str(r["id"]),
                actor_id=str(r["actor_id"]),
                actor_role=UserRole(r["actor_role"]),
                action=r["action"],
                target_id=str(r["target_id"]),
                metadata=r.get("metadata") or {},
                created_at=r["created_at"],
            )
        )
    return result

