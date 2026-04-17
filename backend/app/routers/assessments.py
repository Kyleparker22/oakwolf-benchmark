"""
Assessments router — handles creating and retrieving assessments.
"""

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.schemas import CreateAssessmentIn, AssessmentOut, MessageOut

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.post("", response_model=AssessmentOut, status_code=201)
def create_assessment(body: CreateAssessmentIn):
    """
    Create a new assessment.
    Returns the created assessment including its UUID (used for all subsequent calls).
    """
    db = get_db()

    data = {
        "user_type":   body.user_type,
        "report_type": body.user_type,  # report_type matches user_type by default
        "client_name": body.client_name,
        "status":      "in_progress",
        "input_method": "manual",
    }

    result = db.table("assessments").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create assessment")

    row = result.data[0]
    return _format_assessment(row)


@router.get("", response_model=dict)
def list_assessments():
    """
    List all assessments for the internal dashboard.
    Returns most recent first.
    """
    db = get_db()
    result = (
        db.table("assessments")
        .select("id, assessment_uuid, client_name, assessment_date, status, overall_score_100, maturity_level, user_type, created_at")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"assessments": result.data, "count": len(result.data)}


@router.get("/peer-benchmarks")
def get_peer_benchmarks(org_type: str = None, user_count: str = None):
    """
    Returns peer benchmark distribution data for comparison.
    Uses real data when 10+ submissions exist for a peer group,
    otherwise falls back to industry estimates.
    """
    db = get_db()

    # Try to get real peer data
    query = db.table("assessments").select("overall_score_100, maturity_level, organization_context(org_type, user_count)").eq("status", "completed")
    result = query.execute()

    all_scores = [r["overall_score_100"] for r in result.data if r.get("overall_score_100") is not None]

    # Filter to peer group if we have org context
    peer_scores = []
    if org_type and len(result.data) >= 10:
        peer_scores = [
            r["overall_score_100"] for r in result.data
            if r.get("overall_score_100") is not None
            and r.get("organization_context")
            and (r["organization_context"][0] if isinstance(r["organization_context"], list) else r["organization_context"]).get("org_type") == org_type
        ]

    use_real = len(peer_scores) >= 10

    if use_real:
        scores = peer_scores
        data_source = "real"
    else:
        # Industry estimates by org type — based on Oakwolf's observations
        estimates = {
            "Academic Medical Center":          {"p25": 38, "p50": 52, "p75": 67, "mean": 53},
            "Community Health System":          {"p25": 32, "p50": 47, "p75": 61, "mean": 48},
            "Integrated Delivery Network (IDN)":{"p25": 41, "p50": 55, "p75": 70, "mean": 56},
            "Regional Health System":           {"p25": 30, "p50": 45, "p75": 60, "mean": 46},
            "Specialty Hospital System":        {"p25": 35, "p50": 50, "p75": 63, "mean": 50},
        }
        defaults = {"p25": 33, "p50": 48, "p75": 63, "mean": 49}
        est = estimates.get(org_type, defaults) if org_type else defaults

        return {
            "data_source": "industry_estimates",
            "org_type": org_type or "All organization types",
            "peer_group_size": "industry",
            "percentiles": est,
            "distribution": [
                {"range": "0–24",   "label": "Reactive",     "pct": 12},
                {"range": "25–39",  "label": "Early",        "pct": 22},
                {"range": "40–54",  "label": "Developing",   "pct": 31},
                {"range": "55–69",  "label": "Stabilizing",  "pct": 24},
                {"range": "70–84",  "label": "Governed",     "pct": 8},
                {"range": "85–100", "label": "Optimized",    "pct": 3},
            ],
            "note": "Based on Oakwolf industry estimates. Data will update as real benchmark submissions accumulate."
        }

    # Calculate real percentiles
    scores_sorted = sorted(scores)
    n = len(scores_sorted)
    p25 = scores_sorted[int(n * 0.25)]
    p50 = scores_sorted[int(n * 0.50)]
    p75 = scores_sorted[int(n * 0.75)]
    mean = round(sum(scores_sorted) / n, 1)

    # Build distribution
    bands = [(0,24,"Reactive"),(25,39,"Early"),(40,54,"Developing"),(55,69,"Stabilizing"),(70,84,"Governed"),(85,100,"Optimized")]
    distribution = []
    for low, high, label in bands:
        count = sum(1 for s in scores_sorted if low <= s <= high)
        distribution.append({"range": f"{low}–{high}", "label": label, "pct": round(count / n * 100)})

    return {
        "data_source": "real",
        "org_type": org_type or "All organization types",
        "peer_group_size": n,
        "percentiles": {"p25": p25, "p50": p50, "p75": p75, "mean": mean},
        "distribution": distribution,
        "note": f"Based on {n} real benchmark submissions."
    }


@router.get("/retake")
def find_previous_assessment(email: str):
    """
    Look up previous assessments by email address.
    Returns the most recent completed assessment for this email.
    """
    db = get_db()

    lead_result = (
        db.table("leads")
        .select("assessment_id, email, created_at")
        .eq("email", email.lower().strip())
        .order("created_at", desc=True)
        .execute()
    )

    if not lead_result.data:
        return {"found": False, "assessments": []}

    assessment_ids = [r["assessment_id"] for r in lead_result.data]

    assessments = []
    for aid in assessment_ids[:5]:
        a = (
            db.table("assessments")
            .select("assessment_uuid, client_name, assessment_date, overall_score_100, maturity_level, status")
            .eq("id", aid)
            .eq("status", "completed")
            .execute()
        ).data
        if a:
            assessments.append(a[0])

    return {
        "found": len(assessments) > 0,
        "email": email.lower().strip(),
        "assessments": assessments
    }


@router.get("/{assessment_uuid}", response_model=AssessmentOut)
def get_assessment(assessment_uuid: str):
    """
    Retrieve an assessment by its UUID.
    """
    db = get_db()

    result = (
        db.table("assessments")
        .select("*")
        .eq("assessment_uuid", assessment_uuid)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Assessment not found")

    return _format_assessment(result.data[0])


def _format_assessment(row: dict) -> dict:
    return {
        "id":               row["id"],
        "assessment_uuid":  row["assessment_uuid"],
        "user_type":        row["user_type"],
        "report_type":      row["report_type"],
        "client_name":      row.get("client_name"),
        "assessment_date":  row.get("assessment_date"),
        "input_method":     row["input_method"],
        "status":           row["status"],
        "overall_score_10":  row.get("overall_score_10"),
        "overall_score_100": row.get("overall_score_100"),
        "maturity_level":   row.get("maturity_level"),
        "created_at":       str(row["created_at"]),
    }


def _format_assessment(row: dict) -> dict:
    return {
        "id":               row["id"],
        "assessment_uuid":  row["assessment_uuid"],
        "user_type":        row["user_type"],
        "report_type":      row["report_type"],
        "client_name":      row.get("client_name"),
        "assessment_date":  row.get("assessment_date"),
        "input_method":     row["input_method"],
        "status":           row["status"],
        "overall_score_10":  row.get("overall_score_10"),
        "overall_score_100": row.get("overall_score_100"),
        "maturity_level":   row.get("maturity_level"),
        "created_at":       str(row["created_at"]),
    }