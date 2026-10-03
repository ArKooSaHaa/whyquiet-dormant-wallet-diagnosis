import logging
from datetime import UTC, datetime

from fastapi import FastAPI

from src.api.schemas import (
    EXAMPLE_ASSUMPTIONS,
    EXAMPLE_POSTERIOR,
    EXAMPLE_REASONS,
    Batch,
    BatchStatus,
    CauseFamily,
    CreateBatchRequest,
    DecisionRequest,
    ExplainRequest,
    ExportBatchResponse,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    ProfileRequest,
    RefuseRequest,
    RefuseResponse,
    StoreKind,
    TriageRequest,
    TriageResponse,
    UserRole,
    Verdict,
)
from src.api.store import get_store

logger = logging.getLogger(__name__)

VERSION = "0.1.0"

app = FastAPI(title="WhyQuiet API", version=VERSION, docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    store_kind = StoreKind.local
    try:
        store_kind = StoreKind(get_store().kind())
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to determine store kind: %s", exc)
    return HealthResponse(status="ok", version=VERSION, store=store_kind)


@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest) -> LoginResponse:
    # Stub response: return role based on email or default to analyst
    role = UserRole.approver if "approver" in req.email else UserRole.analyst
    return LoginResponse(
        access_token="mock-jwt-token-stub",
        user_id="usr-mock-001",
        role=role,
    )


@app.get("/api/batches", response_model=list[Batch])
def list_batches() -> list[Batch]:
    now_iso = datetime.now(UTC).isoformat()
    return [
        Batch(
            id="batch-001",
            cause=CauseFamily.job_exit,
            remedy_code="job_exit_payroll_reengage",
            unit_cost_bdt=15.0,
            wallet_count=42,
            status=BatchStatus.proposed,
            proposed_by="usr-mock-001",
            decided_by=None,
            decided_at=None,
            decision_note=None,
            created_at=now_iso,
        )
    ]


@app.post("/api/batches", response_model=Batch)
def create_batch(req: CreateBatchRequest) -> Batch:
    now_iso = datetime.now(UTC).isoformat()
    return Batch(
        id="batch-002",
        cause=req.cause,
        remedy_code=f"{req.cause.value}_default_remedy",
        unit_cost_bdt=15.0,
        wallet_count=len(req.wallet_ids),
        status=BatchStatus.proposed,
        proposed_by="usr-mock-001",
        decided_by=None,
        decided_at=None,
        decision_note=None,
        created_at=now_iso,
    )


@app.post("/api/batches/{id}/approve", response_model=Batch)
def approve_batch(id: str, req: DecisionRequest) -> Batch:
    now_iso = datetime.now(UTC).isoformat()
    return Batch(
        id=id,
        cause=CauseFamily.job_exit,
        remedy_code="job_exit_payroll_reengage",
        unit_cost_bdt=15.0,
        wallet_count=20,
        status=BatchStatus.approved,
        proposed_by="usr-mock-001",
        decided_by="usr-mock-approver",
        decided_at=now_iso,
        decision_note=req.note,
        created_at=now_iso,
    )


@app.post("/api/batches/{id}/reject", response_model=Batch)
def reject_batch(id: str, req: DecisionRequest) -> Batch:
    now_iso = datetime.now(UTC).isoformat()
    return Batch(
        id=id,
        cause=CauseFamily.job_exit,
        remedy_code="job_exit_payroll_reengage",
        unit_cost_bdt=15.0,
        wallet_count=20,
        status=BatchStatus.rejected,
        proposed_by="usr-mock-001",
        decided_by="usr-mock-approver",
        decided_at=now_iso,
        decision_note=req.note,
        created_at=now_iso,
    )


@app.get("/api/batches/{id}/export", response_model=ExportBatchResponse)
def export_batch(id: str) -> ExportBatchResponse:
    now_iso = datetime.now(UTC).isoformat()
    return ExportBatchResponse(
        batch_id=id,
        cause=CauseFamily.job_exit,
        remedy_code="job_exit_payroll_reengage",
        wallet_ids=["W-ABC123", "W-XYZ789"],
        cost_bdt=30.0,
        approved_by="usr-mock-approver",
        approved_at=now_iso,
    )


@app.post("/api/profile", response_model=TriageResponse)
def profile(req: ProfileRequest) -> TriageResponse:
    return _example_triage(req.wallet_id)


@app.post("/api/triage", response_model=TriageResponse)
def triage(req: TriageRequest) -> TriageResponse:
    resp = _example_triage(req.wallet_id)
    try:
        get_store().log_triage(
            {
                "wallet_id": req.wallet_id,
                "population": "B",
                "verdict": resp.verdict.value,
                "cause": resp.cause.value if resp.cause else None,
                "posterior": resp.posterior,
                "reasons": [r.model_dump() for r in resp.reasons],
            }
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to log triage audit: %s", exc)
    return resp


@app.post("/api/explain", response_model=TriageResponse)
def explain(req: ExplainRequest) -> TriageResponse:
    return _example_triage(req.wallet_id)


@app.post("/api/refuse", response_model=RefuseResponse)
def refuse(req: RefuseRequest) -> RefuseResponse:
    return RefuseResponse(
        verdict=Verdict.refused,
        cause=None,
        posterior=EXAMPLE_POSTERIOR,
        reasons=EXAMPLE_REASONS,
        assumptions=EXAMPLE_ASSUMPTIONS,
        generated_text=None,
        refusal_reasons=["No feature discriminates; posterior is near-uniform."],
        stub=True,
    )


def _example_triage(wallet_id: str) -> TriageResponse:
    return TriageResponse(
        verdict=Verdict.attributed,
        cause=CauseFamily.job_exit,
        posterior=EXAMPLE_POSTERIOR,
        reasons=EXAMPLE_REASONS,
        assumptions=EXAMPLE_ASSUMPTIONS,
        generated_text=None,
        stub=True,
    )
