from fastapi import APIRouter, HTTPException
from app.database import get_db
from scoring_engine import score_responses

router = APIRouter(prefix="/assessments", tags=["Scoring"])

DOMAIN_WEIGHTS = {
    "Provisioning": 0.20, "RBAC": 0.18, "IAM": 0.18,
    "Authentication": 0.12, "Governance": 0.12, "Audit": 0.08,
    "Training": 0.07, "Operational": 0.05,
}

@router.post("/{assessment_uuid}/score")
def run_scoring(assessment_uuid: str):
    db = get_db()

    assessment_result = db.table("assessments").select("*").eq("assessment_uuid", assessment_uuid).execute()
    if not assessment_result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment = assessment_result.data[0]
    assessment_id = assessment["id"]

    responses_result = db.table("assessment_responses").select("question_id, selected_answer").eq("assessment_id", assessment_id).execute()
    if not responses_result.data:
        raise HTTPException(status_code=400, detail="No responses found")

    results = score_responses(responses_result.data)
    domain_scores = results["domain_scores"]
    overall_score = results["overall_score"]
    maturity_level = results["maturity_level"]
    findings = results["findings"]

    db.table("domain_scores").delete().eq("assessment_id", assessment_id).execute()
    for domain_name, normalized_score in domain_scores.items():
        weight = DOMAIN_WEIGHTS.get(domain_name, 0.05)
        weighted = round(normalized_score * weight, 4)
        db.table("domain_scores").insert({
            "assessment_id": assessment_id,
            "domain_name": domain_name,
            "raw_points": int(round(normalized_score * 10)),
            "max_points": 100,
            "normalized_score": normalized_score,
            "weight": weight,
            "weighted_contribution": weighted,
        }).execute()

    db.table("findings").delete().eq("assessment_id", assessment_id).execute()
    for finding in findings:
        db.table("findings").insert({
            "assessment_id": assessment_id,
            "source_rule": finding["source_rule"],
            "title": finding["title"],
            "severity": finding["severity"],
            "explanation": finding["explanation"],
            "business_impact": finding["business_impact"],
            "visibility_scope": "both",
        }).execute()

    db.table("assessments").update({
        "overall_score_100": overall_score,
        "maturity_level": maturity_level,
        "status": "completed",
    }).eq("assessment_uuid", assessment_uuid).execute()

    return {
        "assessment_uuid": assessment_uuid,
        "overall_score_100": overall_score,
        "maturity_level": maturity_level,
        "domain_scores": domain_scores,
        "findings_count": len(findings),
    }
