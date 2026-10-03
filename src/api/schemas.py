from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints


class CauseFamily(str, Enum):
    job_exit = "job_exit"
    migration = "migration"
    solved_problem = "solved_problem"
    fee_shock = "fee_shock"
    supply_failure = "supply_failure"


class UserRole(str, Enum):
    analyst = "analyst"
    approver = "approver"


class BatchStatus(str, Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"


class Verdict(str, Enum):
    attributed = "attributed"
    refused = "refused"


class StoreKind(str, Enum):
    local = "local"
    supabase = "supabase"


class HealthResponse(BaseModel):
    status: str
    version: str
    store: StoreKind
    stub: bool = False


class ProfileRequest(BaseModel):
    wallet_id: str


class Reason(BaseModel):
    feature: str
    contribution: float
    direction: str = Field(description="'toward' or 'against' the attributed cause")


class TriageRequest(BaseModel):
    wallet_id: str


class TriageResponse(BaseModel):
    verdict: Verdict
    cause: CauseFamily | None
    posterior: dict[str, float]
    reasons: list[Reason]
    assumptions: list[str]
    generated_text: str | None
    stub: bool = False


class ExplainRequest(BaseModel):
    wallet_id: str


class RefuseRequest(BaseModel):
    wallet_id: str


class RefuseResponse(BaseModel):
    verdict: Verdict
    cause: None = None
    posterior: dict[str, float]
    reasons: list[Reason]
    assumptions: list[str]
    generated_text: str | None
    refusal_reasons: list[str]
    stub: bool = False


# Write-path models (docs/contracts/api.md)

WalletIdStr = Annotated[str, StringConstraints(pattern=r"^W-[0-9A-Z]{6}$")]


class LoginRequest(BaseModel):
    # Credentials for Supabase password-based authentication
    email: str
    password: str


class LoginResponse(BaseModel):
    # JWT access token and user metadata returned upon successful login
    access_token: str
    user_id: str
    role: UserRole


class Batch(BaseModel):
    # Batch representation matching the frontend contract (docs/contracts/api.md)
    id: str
    cause: CauseFamily
    remedy_code: str
    unit_cost_bdt: float
    wallet_count: int
    status: BatchStatus
    proposed_by: str
    decided_by: str | None = None
    decided_at: str | None = None
    decision_note: str | None = None
    created_at: str


class CreateBatchRequest(BaseModel):
    # Proposal payload from an analyst. Wallet IDs must match ^W-[0-9A-Z]{6}$ (1..1000 items)
    cause: CauseFamily
    wallet_ids: list[WalletIdStr] = Field(..., min_length=1, max_length=1000)


class DecisionRequest(BaseModel):
    # Approver decision payload with mandatory audit note (1..500 characters)
    note: Annotated[str, StringConstraints(min_length=1, max_length=500, strip_whitespace=True)]


class ExportBatchResponse(BaseModel):
    # Export payload containing approved campaign remedy parameters and target wallets
    batch_id: str
    cause: CauseFamily
    remedy_code: str
    wallet_ids: list[str]
    cost_bdt: float
    approved_by: str
    approved_at: str


EXAMPLE_POSTERIOR: dict[str, float] = {
    CauseFamily.job_exit: 0.3,
    CauseFamily.migration: 0.2,
    CauseFamily.solved_problem: 0.2,
    CauseFamily.fee_shock: 0.15,
    CauseFamily.supply_failure: 0.15,
}

EXAMPLE_REASONS: list[Reason] = [
    Reason(feature="weeks_silent", contribution=0.42, direction="toward"),
    Reason(feature="payday_only_activity", contribution=0.31, direction="toward"),
]

EXAMPLE_ASSUMPTIONS: list[str] = [
    "ASSUMED: triage rate 35% (economics.md #15)",
    "ASSUMED: recovery rate 4% (no evidence in either direction)",
]
