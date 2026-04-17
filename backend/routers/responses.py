"""
Responses Router
Handles saving questionnaire answers for an assessment.
Answers are validated against the answer map before saving.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db
from scoring_engine import lookup_answer

router = APIRouter()


# ─── Request Models ───────────────────────────────────────────────────────────

class SingleResponse(BaseModel):
    question_id: str
    selected_answer: str
    source: str = "manual"


class BulkResponsesRequest(BaseModel):
    responses: list[SingleResponse]


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/{assessment_uuid}/responses", status_code=201)
def save_responses(assessment_uuid: str, body: BulkResponsesRequest):
    """
    Save questionnaire responses for an assessment.

    - Validates every answer against the answer map before saving.
    - If responses already exist for a question, they are replaced.
    - Accepts partial saves (you can submit one section at a time).
    """
    # Look up assessment
    assessment = db.table("assessments") \
        .select("id") \
        .eq("assessment_uuid", assessment_uuid) \
        .execute()

    if not assessment.data:
        raise HTTPException(404, f"Assessment '{assessment_uuid}' not found")

    assessment_id = assessment.data[0]["id"]

    # Validate all answers against the answer map first
    # If any answer is invalid, reject the whole batch with a clear error
    validated = []
    errors = []
    for r in body.responses:
        try:
            entry = lookup_answer(r.question_id, r.selected_answer)
            validated.append({
                "assessment_id":   assessment_id,
                "question_id":     r.question_id,
                "domain":          entry["domain"],
                "selected_answer": r.selected_answer,
                "base_points":     entry["base_points"],
                "risk_flag":       entry["risk_flag"],
                "source":          r.source,
            })
        except ValueError as e:
            errors.append(str(e))

    if errors:
        raise HTTPException(422, {
            "message": "One or more answers failed validation against the answer map.",
            "errors": errors,
        })

    # Delete existing responses for these question IDs (upsert pattern)
    question_ids = [r.question_id for r in body.responses]
    db.table("assessment_responses") \
        .delete() \
        .eq("assessment_id", assessment_id) \
        .in_("question_id", question_ids) \
        .execute()

    # Insert validated responses
    result = db.table("assessment_responses").insert(validated).execute()

    if not result.data:
        raise HTTPException(500, "Failed to save responses")

    return {
        "status": "ok",
        "saved": len(result.data),
        "message": f"{len(result.data)} responses saved successfully",
    }


@router.get("/{assessment_uuid}/responses")
def get_responses(assessment_uuid: str):
    """
    Retrieve all saved responses for an assessment.
    """
    assessment = db.table("assessments") \
        .select("id") \
        .eq("assessment_uuid", assessment_uuid) \
        .execute()

    if not assessment.data:
        raise HTTPException(404, f"Assessment '{assessment_uuid}' not found")

    assessment_id = assessment.data[0]["id"]

    result = db.table("assessment_responses") \
        .select("*") \
        .eq("assessment_id", assessment_id) \
        .order("question_id") \
        .execute()

    return {
        "responses": result.data,
        "count": len(result.data),
        "complete": len(result.data) == 28,
    }
