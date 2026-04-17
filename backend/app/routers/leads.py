"""
Leads router — captures prospect contact info before unlocking external results.
"""

from fastapi import APIRouter, HTTPException
from app.database import get_db
from slack_notify import notify_new_lead
from app.models.schemas import SubmitLeadIn, LeadOut

router = APIRouter(prefix="/assessments", tags=["Leads"])


@router.post("/{assessment_uuid}/lead", response_model=LeadOut, status_code=201)
def submit_lead(assessment_uuid: str, body: SubmitLeadIn):
    db = get_db()
    assessment = _get_assessment(db, assessment_uuid)
    assessment_id = assessment["id"]

    if assessment["user_type"] == "internal":
        raise HTTPException(status_code=400, detail="Lead capture is not required for internal assessments")

    if assessment["status"] != "completed":
        raise HTTPException(status_code=400, detail="Assessment must be scored before submitting lead info")

    existing = db.table("leads").select("id").eq("assessment_id", assessment_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Lead already submitted for this assessment")

    data = {
        "assessment_id": assessment_id,
        "first_name":    body.first_name,
        "last_name":     body.last_name,
        "title":         body.title,
        "organization":  body.organization,
        "email":         body.email,
        "phone":         body.phone,
    }

    # Add optional fields if they exist
    if hasattr(body, 'job_function') and body.job_function:
        data["job_function"] = body.job_function
    if hasattr(body, 'heard_from') and body.heard_from:
        data["heard_from"] = body.heard_from

    result = db.table("leads").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save lead")

    row = result.data[0]

    # Send Slack notification
    try:
        assessment_info = db.table("assessments").select("overall_score_100, maturity_level").eq("id", assessment_id).execute().data
        notify_new_lead(data, assessment_info[0] if assessment_info else {})
    except Exception:
        pass

    return LeadOut(
        id=row["id"],
        assessment_id=row["assessment_id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        organization=row["organization"],
        email=row["email"],
        created_at=str(row["created_at"]),
    )


def _get_assessment(db, assessment_uuid: str) -> dict:
    result = db.table("assessments").select("id, assessment_uuid, user_type, status").eq("assessment_uuid", assessment_uuid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result.data[0]


@router.get("/list")
def list_leads():
    db = get_db()
    leads_result = db.table("leads").select("*").order("created_at", desc=True).limit(100).execute()
    leads = leads_result.data or []

    for lead in leads:
        try:
            assessment = db.table("assessments").select("overall_score_100").eq("id", lead.get("assessment_id")).eq("status", "completed").execute().data
            lead["score"] = assessment[0].get("overall_score_100") if assessment else None
        except Exception:
            lead["score"] = None

    return {"leads": leads, "count": len(leads)}
