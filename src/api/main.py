import logging

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from supabase_auth.errors import AuthRetryableError

from src.api.batches import router as batches_router
from src.api.schemas import HealthResponse, StoreKind
from src.api.store import store_kind

logger = logging.getLogger(__name__)

VERSION = "0.1.0"

app = FastAPI(title="WhyQuiet API", version=VERSION, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(batches_router)


# Supabase down or paused (network error, or auth 5xx) -> 503 per docs/contracts/api.md, never 401.
@app.exception_handler(httpx.TransportError)
@app.exception_handler(AuthRetryableError)
def supabase_unreachable(_req: Request, exc: Exception) -> JSONResponse:
    logger.warning("Supabase unreachable: %s", exc)
    return JSONResponse({"detail": "Write path offline"}, status_code=503)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=VERSION, store=StoreKind(store_kind()))
