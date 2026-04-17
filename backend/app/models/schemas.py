"""
Pydantic models — defines the shape of all API request and response bodies.
FastAPI uses these for automatic validation and documentation.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date


# ─── Organization Context ────────────────────────────────────────────────────

class OrganizationContextIn(BaseModel):
    org_type: Optional[str] = None
    hospital_count: Optional[str] = None
    user_count: Optional[str] = None
    sites: Optional[str] = None
    community_connect: Optional[str] = None
    mna_activity: Optional[str] = None
    epic_instances: Optional[str] = None
    security_model: Optional[str] = None
    iam_alignment: Optional[str] = None
    team_size: Optional[str] = None
    iam_platform: Optional[str] = None
    epic_tenure: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    strategic_focus: Optional[str] = None
    security_priority: Optional[str] = None


# ─── Assessment ───────────────────────────────────────────────────────────────

class CreateAssessmentIn(BaseModel):
    user_type: str  # "internal" or "external"
    client_name: Optional[str] = None

    @field_validator("user_type")
    @classmethod
    def validate_user_type(cls, v: str) -> str:
        if v not in ("internal", "external"):
            raise ValueError("user_type must be 'internal' or 'external'")
        return v


class AssessmentOut(BaseModel):
    id: int
    assessment_uuid: str
    user_type: str
    report_type: str
    client_name: Optional[str]
    assessment_date: Optional[date]
    input_method: str
    status: str
    overall_score_10: Optional[float]
    overall_score_100: Optional[float]
    maturity_level: Optional[str]
    created_at: str


# ─── Responses ────────────────────────────────────────────────────────────────

class SingleResponse(BaseModel):
    question_id: str
    selected_answer: str
    source: str = "manual"

    @field_validator("question_id")
    @classmethod
    def validate_question_id(cls, v: str) -> str:
        # Must be Q1–Q28
        if not v.startswith("Q"):
            raise ValueError("question_id must start with Q (e.g. Q1, Q28)")
        try:
            n = int(v[1:])
            if n < 1 or n > 28:
                raise ValueError
        except ValueError:
            raise ValueError("question_id must be Q1 through Q28")
        return v


class SubmitResponsesIn(BaseModel):
    responses: list[SingleResponse]

    @field_validator("responses")
    @classmethod
    def validate_all_questions_present(cls, v: list[SingleResponse]) -> list[SingleResponse]:
        provided = {r.question_id for r in v}
        required = {f"Q{i}" for i in range(1, 29)}
        missing = required - provided
        if missing:
            sorted_missing = sorted(missing, key=lambda x: int(x[1:]))
            raise ValueError(f"Missing answers for: {', '.join(sorted_missing)}")
        return v


# ─── Scoring results ──────────────────────────────────────────────────────────

class DomainScoreOut(BaseModel):
    domain_name: str
    raw_points: int
    max_points: int
    normalized_score: float
    weight: float
    weighted_contribution: float


class FindingOut(BaseModel):
    title: str
    severity: str
    explanation: str
    business_impact: str
    visibility_scope: str
    source_rule: str


class ScoreResultOut(BaseModel):
    assessment_uuid: str
    overall_score_10: float
    overall_score_100: float
    maturity_level: str
    domain_scores: list[DomainScoreOut]
    findings: list[FindingOut]


# ─── Lead capture ─────────────────────────────────────────────────────────────

class SubmitLeadIn(BaseModel):
    first_name: str
    last_name: str
    title: str
    organization: str
    email: str
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("A valid email address is required")
        return v.lower().strip()

    @field_validator("organization", "first_name", "last_name", "title")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field cannot be empty")
        return v.strip()


class LeadOut(BaseModel):
    id: int
    assessment_id: int
    first_name: str
    last_name: str
    organization: str
    email: str
    created_at: str


# ─── Generic responses ────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    message: str


class ErrorOut(BaseModel):
    detail: str
