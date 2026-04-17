"""
Responses router — saves questionnaire answers for an assessment.
"""

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.schemas import SubmitResponsesIn, MessageOut
import sys
import os

# Import scoring engine from parent directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from scoring_engine import lookup_answer

router = APIRouter(prefix="/assessments", tags=["Responses"])


@router.post("/{assessment_uuid}/responses", response_model=MessageOut, status_code=201)
def submit_responses(assessment_uuid: str, body: SubmitResponsesIn):
    """
    Submit all 28 questionnaire responses for an assessment.
    Validates each answer against the answer map before saving.
    Replaces any existing responses.
    """
    db = get_db()
    assessment = _get_assessment(db, assessment_uuid)
    assessment_id = assessment["id"]

    # Validate every answer against the answer map
    enriched = []
    validation_errors = []
    for r in body.responses:
        try:
            entry = lookup_answer(r.question_id, r.selected_answer)
            enriched.append({
                "assessment_id":  assessment_id,
                "question_id":    r.question_id,
                "domain":         entry["domain"],
                "selected_answer": r.selected_answer,
                "base_points":    entry.get("score", entry.get("base_points", 0)),
                "risk_flag":      entry["risk_flag"],
                "source":         r.source,
            })
        except ValueError as e:
            validation_errors.append(str(e))

    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid answers: {'; '.join(validation_errors)}"
        )

    # Delete existing responses and replace
    db.table("assessment_responses").delete().eq("assessment_id", assessment_id).execute()

    result = db.table("assessment_responses").insert(enriched).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save responses")

    return {"message": f"Saved {len(enriched)} responses successfully"}


@router.get("/{assessment_uuid}/responses")
def get_responses(assessment_uuid: str):
    """
    Retrieve all saved responses for an assessment.
    """
    db = get_db()
    assessment = _get_assessment(db, assessment_uuid)

    result = (
        db.table("assessment_responses")
        .select("*")
        .eq("assessment_id", assessment["id"])
        .order("question_id")
        .execute()
    )

    return {"responses": result.data, "count": len(result.data)}


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
