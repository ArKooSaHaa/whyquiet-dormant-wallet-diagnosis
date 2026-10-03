import logging

from fastapi import FastAPI

from src.api.batches import router as batches_router
from src.api.schemas import (
    EXAMPLE_ASSUMPTIONS,
    EXAMPLE_POSTERIOR,
    EXAMPLE_REASONS,
    CauseFamily,
    ExplainRequest,
    HealthResponse,
    ProfileRequest,
    RefuseRequest,
    RefuseResponse,
    StoreKind,
    TriageRequest,
    TriageResponse,
    Verdict,
)
from src.api.store import get_store

logger = logging.getLogger(__name__)

VERSION = "0.1.0"

app = FastAPI(title="WhyQuiet API", version=VERSION, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(batches_router)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    store_kind = StoreKind.local
    try:
        store_kind = StoreKind(get_store().kind())
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to determine store kind: %s", exc)
    return HealthResponse(status="ok", version=VERSION, store=store_kind)


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
