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


class StoreKind(str, Enum):
    local = "local"
    supabase = "supabase"


class HealthResponse(BaseModel):
    status: str
    version: str
    store: StoreKind
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
