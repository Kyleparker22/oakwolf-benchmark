"""
Organization Context Router
Handles saving the Section 0 context questions for an assessment.
These answers are not scored but are used for AI narrative and report framing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter()


# ─── Request Model ────────────────────────────────────────────────────────────

class OrgContextRequest(BaseModel):
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


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/{assessment_uuid}/context", status_code=201)
def save_context(assessment_uuid: str, body: OrgContextRequest):
    """
    Save organizational context for an assessment.
    If context already exists for this assessment, it will be replaced.
    """
    # Look up the assessment by UUID to get its internal ID
    assessment = db.table("assessments") \
        .select("id") \
        .eq("assessment_uuid", assessment_uuid) \
        .execute()

    if not assessment.data:
        raise HTTPException(404, f"Assessment '{assessment_uuid}' not found")

    assessment_id = assessment.data[0]["id"]

    # Delete existing context if present (upsert pattern)
    db.table("organization_context") \
        .delete() \
        .eq("assessment_id", assessment_id) \
        .execute()

    # Insert new context
    payload = body.model_dump()
    payload["assessment_id"] = assessment_id

    result = db.table("organization_context").insert(payload).execute()

    if not result.data:
        raise HTTPException(500, "Failed to save organization context")

    return {"status": "ok", "message": "Context saved successfully"}


@router.get("/{assessment_uuid}/context")
def get_context(assessment_uuid: str):
    """
    Retrieve organizational context for an assessment.
    """
    assessment = db.table("assessments") \
        .select("id") \
        .eq("assessment_uuid", assessment_uuid) \
        .execute()

    if not assessment.data:
        raise HTTPException(404, f"Assessment '{assessment_uuid}' not found")

    assessment_id = assessment.data[0]["id"]

    result = db.table("organization_context") \
        .select("*") \
        .eq("assessment_id", assessment_id) \
        .execute()

    if not result.data:
        return {"context": None}

    return {"context": result.data[0]}
