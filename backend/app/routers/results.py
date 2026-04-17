"""
Results router — returns the full scored result for an assessment.
Enforces internal vs external visibility rules.
External users must have submitted lead info before seeing results.
"""

from fastapi import APIRouter, HTTPException, Query
from app.database import get_db

router = APIRouter(prefix="/assessments", tags=["Results"])


@router.get("/{assessment_uuid}/results")
def get_results(
    assessment_uuid: str,
    mode: str = Query(default="external", description="'internal' or 'external'"),
):
    """
    Returns the full scored result for an assessment.

    For external mode:
    - Lead must have been submitted first
    - Findings with visibility_scope='internal' are excluded
    - Recommendations are excluded

    For internal mode:
    - All findings and recommendations are included
    - No lead gate check
    """
    db = get_db()

    # Load assessment
    assessment_result = (
        db.table("assessments")
        .select("*")
        .eq("assessment_uuid", assessment_uuid)
        .execute()
    )
    if not assessment_result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment = assessment_result.data[0]

    if assessment["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail="Assessment has not been scored yet"
        )

    # External mode: verify lead has been submitted
    if mode == "external":
        lead_check = (
            db.table("leads")
            .select("id")
            .eq("assessment_id", assessment["id"])
            .execute()
        )
        if not lead_check.data and assessment["user_type"] == "external":
            raise HTTPException(
                status_code=403,
                detail="Lead information must be submitted before viewing results"
            )

    # Load domain scores
    domain_scores = (
        db.table("domain_scores")
        .select("*")
        .eq("assessment_id", assessment["id"])
        .execute()
    ).data

    # Load findings — filter by visibility for external mode
    findings_query = (
        db.table("findings")
        .select("*")
        .eq("assessment_id", assessment["id"])
    )
    if mode == "external":
        # External users see findings scoped to "external" or "both"
        findings_query = findings_query.in_("visibility_scope", ["external", "both"])

    findings = findings_query.execute().data

    # Load org context
    context = (
        db.table("organization_context")
        .select("*")
        .eq("assessment_id", assessment["id"])
        .execute()
    ).data

    # Load recommendations (internal only)
    recommendations = []
    if mode == "internal":
        recommendations = (
            db.table("recommendations")
            .select("*")
            .eq("assessment_id", assessment["id"])
            .order("priority")
            .execute()
        ).data

    # Sort findings by severity (high → medium → low)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: severity_order.get(f.get("severity", "low"), 3))

    return {
        "assessment": {
            "uuid":             assessment["assessment_uuid"],
            "client_name":      assessment.get("client_name"),
            "assessment_date":  str(assessment.get("assessment_date", "")),
            "user_type":        assessment["user_type"],
            "overall_score_10":  assessment["overall_score_10"],
            "overall_score_100": assessment["overall_score_100"],
            "maturity_level":   assessment["maturity_level"],
        },
        "domain_scores":    domain_scores,
        "findings":         findings,
        "recommendations":  recommendations,
        "organization_context": context[0] if context else None,
        "mode":             mode,
        "finding_count":    len(findings),
    }
