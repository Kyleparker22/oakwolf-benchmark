"""
AI router — generates narrative outputs and proposals for completed assessments.
"""

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.services.ai_service import generate_all_ai_outputs

router = APIRouter(prefix="/assessments", tags=["AI"])


@router.post("/{assessment_uuid}/generate-ai")
def generate_ai(assessment_uuid: str, mode: str = "external"):
    db = get_db()
    assessment_result = (
        db.table("assessments").select("*").eq("assessment_uuid", assessment_uuid).execute()
    )
    if not assessment_result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment = assessment_result.data[0]
    if assessment["status"] != "completed":
        raise HTTPException(status_code=400, detail="Assessment must be scored before generating AI content")
    domain_scores = (db.table("domain_scores").select("*").eq("assessment_id", assessment["id"]).execute()).data
    findings = (db.table("findings").select("*").eq("assessment_id", assessment["id"]).execute()).data
    context = (db.table("organization_context").select("*").eq("assessment_id", assessment["id"]).execute()).data
    results = {
        "assessment": {
            "overall_score_100": assessment["overall_score_100"],
            "maturity_level": assessment["maturity_level"],
        },
        "domain_scores": domain_scores,
        "findings": findings,
        "organization_context": context[0] if context else {},
    }
    outputs = generate_all_ai_outputs(results, mode)
    db.table("ai_outputs").delete().eq("assessment_id", assessment["id"]).execute()
    for output_type, output_text in outputs.items():
        if output_text:
            db.table("ai_outputs").insert({
                "assessment_id": assessment["id"],
                "output_type": output_type,
                "prompt_version": "v1",
                "output_text": output_text,
            }).execute()
    return {"assessment_uuid": assessment_uuid, "outputs": outputs, "mode": mode}


@router.get("/{assessment_uuid}/ai-outputs")
def get_ai_outputs(assessment_uuid: str):
    db = get_db()
    assessment_result = (
        db.table("assessments").select("id").eq("assessment_uuid", assessment_uuid).execute()
    )
    if not assessment_result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
    outputs = (
        db.table("ai_outputs").select("*").eq("assessment_id", assessment_result.data[0]["id"]).execute()
    ).data
    return {"assessment_uuid": assessment_uuid, "outputs": {o["output_type"]: o["output_text"] for o in outputs}}


@router.post("/{assessment_uuid}/generate-proposal")
def generate_proposal(assessment_uuid: str):
    db = get_db()
    assessment_result = (
        db.table("assessments").select("*").eq("assessment_uuid", assessment_uuid).execute()
    )
    if not assessment_result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
    assessment = assessment_result.data[0]
    if assessment["status"] != "completed":
        raise HTTPException(status_code=400, detail="Assessment must be scored before generating a proposal")
    domain_scores = (db.table("domain_scores").select("*").eq("assessment_id", assessment["id"]).execute()).data
    findings = (db.table("findings").select("*").eq("assessment_id", assessment["id"]).execute()).data
    context = (db.table("organization_context").select("*").eq("assessment_id", assessment["id"]).execute()).data
    results = {
        "assessment": {
            "client_name": assessment.get("client_name", "Your Organization"),
            "overall_score_100": assessment["overall_score_100"],
            "maturity_level": assessment["maturity_level"],
        },
        "domain_scores": domain_scores,
        "findings": findings,
        "organization_context": context[0] if context else {},
    }
    from app.services.ai_service import generate_proposal_content
    proposal = generate_proposal_content(results)
    return {
        "assessment_uuid": assessment_uuid,
        "client_name": assessment.get("client_name", "Your Organization"),
        "overall_score_100": assessment["overall_score_100"],
        "maturity_level": assessment["maturity_level"],
        "proposal": proposal,
    }
