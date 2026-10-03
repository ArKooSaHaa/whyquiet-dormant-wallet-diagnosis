from enum import Enum

from pydantic import BaseModel, Field


class CauseFamily(str, Enum):
    job_exit = "job_exit"
    migration = "migration"
    solved_problem = "solved_problem"
    fee_shock = "fee_shock"
    supply_failure = "supply_failure"


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
