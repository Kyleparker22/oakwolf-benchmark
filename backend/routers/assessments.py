"""
Assessments Router
Handles creating and retrieving assessments.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────

class CreateAssessmentRequest(BaseModel):
    user_type: str        # "internal" or "external"
    report_type: str      # "internal" or "external"
    client_name: Optional[str] = None
    input_method: str = "manual"


class AssessmentResponse(BaseModel):
    id: int
    assessment_uuid: str
    user_type: str
    report_type: str
    client_name: Optional[str]
    assessment_date: str
    input_method: str
    status: str
    overall_score_10: Optional[float]
    overall_score_100: Optional[float]
    maturity_level: Optional[str]
    created_at: str


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=AssessmentResponse, status_code=201)
def create_assessment(body: CreateAssessmentRequest):
    """
    Create a new assessment.
    Returns the created assessment including its UUID.
    """
    if body.user_type not in ("internal", "external"):
        raise HTTPException(400, "user_type must be 'internal' or 'external'")
    if body.report_type not in ("internal", "external"):
        raise HTTPException(400, "report_type must be 'internal' or 'external'")

    result = db.table("assessments").insert({
        "user_type":    body.user_type,
        "report_type":  body.report_type,
        "client_name":  body.client_name,
        "input_method": body.input_method,
        "status":       "in_progress",
    }).execute()

    if not result.data:
        raise HTTPException(500, "Failed to create assessment")

    return result.data[0]


@router.get("/{assessment_uuid}", response_model=AssessmentResponse)
def get_assessment(assessment_uuid: str):
    """
    Retrieve a single assessment by its UUID.
    Used by the frontend to load results after scoring.
    """
    result = db.table("assessments") \
        .select("*") \
        .eq("assessment_uuid", assessment_uuid) \
        .execute()

    if not result.data:
        raise HTTPException(404, f"Assessment '{assessment_uuid}' not found")

    return result.data[0]


@router.get("/")
def list_assessments():
    """
    List all assessments (internal use only).
    """
    result = db.table("assessments") \
        .select("*") \
        .order("created_at", desc=True) \
        .execute()

    return {"assessments": result.data, "count": len(result.data)}
