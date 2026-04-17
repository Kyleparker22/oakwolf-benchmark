"""
Organization context router — saves the context section for an assessment.
"""

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.schemas import OrganizationContextIn, MessageOut

router = APIRouter(prefix="/assessments", tags=["Organization Context"])


@router.post("/{assessment_uuid}/context", response_model=MessageOut, status_code=201)
def save_context(assessment_uuid: str, body: OrganizationContextIn):
    """
    Save or replace the organizational context for an assessment.
    Can be called multiple times — replaces previous context if it exists.
    """
    db = get_db()

    # Verify assessment exists
    assessment = _get_assessment(db, assessment_uuid)
    assessment_id = assessment["id"]

    # Delete existing context if any (upsert pattern)
    db.table("organization_context").delete().eq("assessment_id", assessment_id).execute()

    # Insert new context
    data = {"assessment_id": assessment_id, **body.model_dump()}
    result = db.table("organization_context").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save context")

    return {"message": "Context saved successfully"}


@router.get("/{assessment_uuid}/context")
def get_context(assessment_uuid: str):
    """
    Retrieve the organizational context for an assessment.
    """
    db = get_db()
    assessment = _get_assessment(db, assessment_uuid)

    result = (
        db.table("organization_context")
        .select("*")
        .eq("assessment_id", assessment["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="No context found for this assessment")

    return result.data[0]


def _get_assessment(db, assessment_uuid: str) -> dict:
    result = (
        db.table("assessments")
        .select("id, assessment_uuid, status")
        .eq("assessment_uuid", assessment_uuid)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result.data[0]
