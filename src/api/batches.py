"""Write-path endpoints (docs/contracts/api.md). Remedy + cost come from src.rules, never the client."""

import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from src.api.auth import Actor, current_user, role_of, supabase_client
from src.api.schemas import (
    Batch,
    BatchStatus,
    CreateBatchRequest,
    DecisionRequest,
    ExportBatchResponse,
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
def list_batches(sb: SB) -> list[Batch]:
    # List all proposed, approved, and rejected batches, ordered newest first
    rows = sb.table("batch_summaries").select("*").order("created_at", desc=True).execute().data
    return [_batch(r) for r in rows]


@router.post("/batches", response_model=Batch)
def create_batch(req: CreateBatchRequest, sb: SB, actor: User) -> Batch:
    # Propose a new cause-targeted batch (Analyst only). Remedy and pricing derived from rules
    _require(actor, UserRole.analyst)
    remedy = REMEDIES[req.cause.value]
    row = _rpc(
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
    row = _rpc(
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
def export_batch(id: UUID, sb: SB) -> ExportBatchResponse:
    # Export campaign parameters and target wallet IDs for an approved batch
    rows = sb.table("batch_summaries").select("*").eq("id", str(id)).execute().data
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
