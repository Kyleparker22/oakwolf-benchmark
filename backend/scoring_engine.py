"""
Oakwolf Epic Security Maturity Scoring Engine v2
- Domain scoring with anchor question weighting
- Contradiction detection within domains
- Cross-domain logic for inconsistent answer patterns
"""

import json
from pathlib import Path

BASE = Path(__file__).parent

# ── Answer map ────────────────────────────────────────────────────────────
with open(BASE / "answer_map.json") as f:
    _raw = json.load(f)
    if isinstance(_raw, list):
        ANSWER_MAP = {}
        for item in _raw:
            key = f"{item['question_id']}:{item['answer_label']}"
            ANSWER_MAP[key] = {
                'score': item.get('base_points', 0),
                'domain': item.get('domain', ''),
                'risk_flag': item.get('risk_flag', False),
            }
    else:
        ANSWER_MAP = _raw

# ── Domain weights ────────────────────────────────────────────────────────
DOMAIN_WEIGHTS = {
    "Provisioning":    0.20,
    "RBAC":            0.18,
    "IAM":             0.18,
    "Authentication":  0.12,
    "Governance":      0.12,
    "Audit":           0.08,
    "Training":        0.07,
    "Operational":     0.05,
}

# ── Anchor question multipliers (more important questions score higher weight) ──
ANCHOR_WEIGHTS = {
    # Provisioning - termination speed is the highest signal
    "Q3": 1.8,  # How quickly are terminated users removed?
    "Q4": 1.5,  # AD-disabled users still active in Epic?
    "Q1": 1.2,  # % provisioning automated
    "Q2": 1.0,  # How are users provisioned

    # RBAC
    "Q5": 1.0,  # Avg roles per user
    "Q6": 1.4,  # Exception rate - high signal
    "Q7": 1.2,  # Standardization
    "Q8": 1.3,  # Duplicate/overlapping roles

    # IAM
    "Q9":  1.2,  # % managed through IAM
    "Q10": 1.8,  # Lifecycle automation - anchor
    "Q11": 1.0,  # Provider onboarding
    "Q12": 1.4,  # Enforcement consistency

    # Authentication
    "Q13": 1.2,  # SSO coverage
    "Q14": 1.5,  # Native auth - high risk signal
    "Q15": 1.8,  # MFA enforcement - anchor

    # Training
    "Q16": 1.8,  # Access before training - anchor
    "Q17": 1.2,  # Training alignment
    "Q18": 1.5,  # Users with access but no training

    # Audit
    "Q19": 1.5,  # Access review frequency
    "Q20": 1.4,  # Anomaly monitoring
    "Q21": 1.2,  # Audit logging

    # Governance
    "Q22": 1.5,  # Clear ownership - anchor
    "Q23": 1.4,  # Formal governance structure
    "Q24": 1.3,  # Access change process
    "Q25": 1.8,  # HR/IAM/Epic alignment - anchor

    # Operational
    "Q26": 1.5,  # Reactive vs proactive
    "Q27": 1.2,  # Optimization frequency
    "Q28": 1.3,  # Overall maturity
}

# ── Contradiction detection rules ─────────────────────────────────────────
# Format: (q_high, q_low, domain, title, explanation)
# If q_high answer score is HIGH but q_low answer score is LOW -> contradiction
CONTRADICTION_RULES = [
    # Provisioning contradictions
    {
        "q_high": "Q1", "high_min": 7,  # Claims 75-100% automated
        "q_low":  "Q2", "low_max": 4,   # But says mostly manual
        "domain": "Provisioning",
        "title": "Provisioning automation claim inconsistency",
        "explanation": "Answers indicate high automation on one question but mostly manual provisioning on another. This may reflect partial automation (some workflows automated, others not) or measurement inconsistency.",
        "severity": "medium",
    },
    {
        "q_high": "Q1", "high_min": 7,  # Claims high automation
        "q_low":  "Q3", "low_max": 4,   # But termination takes days
        "domain": "Provisioning",
        "title": "Automation level vs termination speed gap",
        "explanation": "High automation is claimed but terminated users take 1-3+ days to be removed. A truly automated environment should deprovision within the hour. This suggests lifecycle automation is incomplete — provisioning may be automated but deprovisioning is not.",
        "severity": "high",
    },
    # IAM contradictions
    {
        "q_high": "Q9", "high_min": 7,  # Claims high IAM coverage
        "q_low":  "Q10", "low_max": 4,  # But lifecycle not automated
        "domain": "IAM",
        "title": "IAM coverage vs lifecycle automation gap",
        "explanation": "High IAM user coverage is claimed but the lifecycle process is not fully automated. Having users in IAM without automated lifecycle management creates a false sense of control — accounts exist in IAM but events still require manual intervention.",
        "severity": "high",
    },
    {
        "q_high": "Q10", "high_min": 7,  # Claims full automation
        "q_low":  "Q3",  "low_max": 4,   # But termination slow
        "domain": "Provisioning",
        "title": "Lifecycle automation vs termination speed contradiction",
        "explanation": "Full lifecycle automation is claimed but termination takes more than a day. These are inconsistent — truly automated lifecycle should terminate access within the hour of an HR event.",
        "severity": "high",
    },
    # Authentication contradictions
    {
        "q_high": "Q13", "high_min": 7,  # High SSO coverage
        "q_low":  "Q14", "low_max": 4,   # But many native auth users
        "domain": "Authentication",
        "title": "SSO coverage vs native authentication contradiction",
        "explanation": "High SSO coverage is reported alongside significant native authentication users. These are mutually inconsistent — if 75%+ use SSO, native auth should be rare. This may indicate SSO is deployed but not enforced, or that certain user populations are excluded.",
        "severity": "medium",
    },
    {
        "q_high": "Q13", "high_min": 7,  # High SSO
        "q_low":  "Q15", "low_max": 4,   # But MFA not enforced
        "domain": "Authentication",
        "title": "SSO deployed but MFA not enforced",
        "explanation": "SSO is broadly deployed but MFA is not fully enforced. SSO without MFA enforcement leaves the EHR vulnerable to credential-based attacks — SSO centralizes access, but MFA is the control that protects it.",
        "severity": "high",
    },
    # Training contradictions
    {
        "q_high": "Q16", "high_min": 7,  # Training before access
        "q_low":  "Q18", "low_max": 4,   # But users without training exist
        "domain": "Training",
        "title": "Training requirement vs untrained active users contradiction",
        "explanation": "Training is reported as required before access, but active users with incomplete training exist. This typically means the policy exists but is not technically enforced — training completion is checked manually rather than being a system-enforced gate.",
        "severity": "high",
    },
    # Governance contradictions
    {
        "q_high": "Q22", "high_min": 7,  # Clear ownership
        "q_low":  "Q24", "low_max": 4,   # But ad hoc access changes
        "domain": "Governance",
        "title": "Ownership defined but no formal change process",
        "explanation": "Clear Epic Security ownership is reported but access changes are handled ad hoc. Defined ownership without a formal process means accountability exists on paper but not in practice.",
        "severity": "medium",
    },
    {
        "q_high": "Q23", "high_min": 7,  # Formal governance
        "q_low":  "Q19", "low_max": 4,   # But infrequent access reviews
        "domain": "Governance",
        "title": "Governance structure vs access review frequency gap",
        "explanation": "A formal governance structure is claimed but access reviews are infrequent or informal. True governance requires regular access certification — annual or ad hoc reviews undermine the governance framework.",
        "severity": "medium",
    },
]

# ── Cross-domain logic rules ──────────────────────────────────────────────
CROSS_DOMAIN_RULES = [
    {
        "id": "R001",
        "condition": lambda ds: ds.get("Provisioning", 0) < 5 or ds.get("IAM", 0) < 5,
        "extra": lambda ds: True,
        "title": "Lifecycle deprovisioning gap",
        "explanation": "Low scores in Provisioning and/or IAM indicate that user lifecycle management — particularly deprovisioning of terminated users — is not operating at a mature level.",
        "business_impact": "Terminated or transferred employees may retain inappropriate access to clinical systems, creating HIPAA exposure, audit risk, and potential patient safety concerns. This is one of the most commonly cited findings in healthcare IT audits.",
        "severity": "high",
        "domain": "Provisioning",
    },
    {
        "id": "R002",
        "condition": lambda ds: ds.get("RBAC", 0) < 5,
        "extra": lambda ds: ds.get("IAM", 0) > 6,
        "title": "IAM tooling ahead of RBAC maturity",
        "explanation": "IAM scores are relatively strong but RBAC design and governance are underdeveloped. IAM can only enforce access as well as the underlying role model — if roles are poorly designed, IAM automation amplifies those problems at scale.",
        "business_impact": "Automated provisioning of poorly designed roles creates systematic access issues across the user population. Role sprawl and exception-heavy environments negate the efficiency gains of IAM investment.",
        "severity": "medium",
        "domain": "RBAC",
    },
    {
        "id": "R003",
        "condition": lambda ds: ds.get("Provisioning", 0) < 4,
        "extra": lambda ds: ds.get("Operational", 0) < 5,
        "title": "Manual provisioning driving operational overload",
        "explanation": "Low Provisioning and Operational scores together indicate a team that is consumed by manual access work with limited capacity for improvement.",
        "business_impact": "Teams in this pattern spend 70-80% of time on reactive access tickets, leaving no bandwidth for governance, cleanup, or strategic initiatives. This is self-perpetuating — manual work creates more manual work.",
        "severity": "high",
        "domain": "Operational",
    },
    {
        "id": "R004",
        "condition": lambda ds: ds.get("RBAC", 0) < 5,
        "extra": lambda ds: ds.get("Governance", 0) < 5,
        "title": "Role sprawl and governance gap",
        "explanation": "Low scores in both RBAC and Governance indicate an environment where roles have accumulated without structured governance or cleanup programs.",
        "business_impact": "Role sprawl increases audit surface, complicates access reviews, and creates a pattern of exception-based access that is difficult to audit or remediate without a structured program.",
        "severity": "high",
        "domain": "RBAC",
    },
    {
        "id": "R005",
        "condition": lambda ds: ds.get("Authentication", 0) < 5,
        "extra": lambda ds: True,
        "title": "Authentication control gaps",
        "explanation": "Low Authentication scores indicate that access to Epic is not adequately protected through SSO, MFA, or by eliminating native authentication pathways.",
        "business_impact": "Weak authentication controls are the primary vector for unauthorized EHR access. Without MFA and SSO enforcement, a stolen credential provides unrestricted access to patient records.",
        "severity": "high",
        "domain": "Authentication",
    },
    {
        "id": "R009",
        "condition": lambda ds: ds.get("Training", 0) < 5,
        "extra": lambda ds: True,
        "title": "Training and access alignment gap",
        "explanation": "Low Training scores indicate that access is not consistently gated on training completion, or that training does not align to actual job-based access.",
        "business_impact": "Users accessing Epic without completing required training creates patient safety risk and compliance exposure. Joint Commission and HIPAA both require demonstrated competency before access to clinical systems.",
        "severity": "medium",
        "domain": "Training",
    },
    {
        "id": "R011",
        "condition": lambda ds: ds.get("Authentication", 0) < 4,
        "extra": lambda ds: ds.get("Governance", 0) < 5,
        "title": "Authentication and governance compound risk",
        "explanation": "Weak authentication combined with governance gaps creates compounded risk — not only is access to Epic inadequately protected, there is no oversight structure to detect or respond to unauthorized access.",
        "business_impact": "This combination represents one of the highest-risk profiles in Epic Security. HIPAA audit exposure is elevated, and the organization may be unable to demonstrate reasonable safeguards in the event of a breach.",
        "severity": "high",
        "domain": "Authentication",
    },
    {
        "id": "R015",
        "condition": lambda ds: ds.get("Audit", 0) < 5,
        "extra": lambda ds: True,
        "title": "Audit and monitoring gaps",
        "explanation": "Low Audit scores indicate that access review programs, anomaly monitoring, and audit logging are not mature.",
        "business_impact": "Without adequate audit controls, the organization cannot detect inappropriate access, demonstrate compliance during audits, or investigate incidents after the fact. This is a direct HIPAA compliance gap.",
        "severity": "medium",
        "domain": "Audit",
    },
    {
        "id": "R016",
        "condition": lambda ds: ds.get("Audit", 0) < 5,
        "extra": lambda ds: ds.get("Governance", 0) < 5,
        "title": "Audit and governance program gaps",
        "explanation": "Low scores in both Audit and Governance indicate that neither the monitoring nor the oversight structure for Epic Security is mature.",
        "business_impact": "Health systems without formal audit programs and governance structures are significantly more likely to receive adverse findings during Joint Commission surveys, state audits, or HIPAA investigations.",
        "severity": "high",
        "domain": "Governance",
    },
    {
        "id": "R017",
        "condition": lambda ds: ds.get("Governance", 0) < 4,
        "extra": lambda ds: True,
        "title": "Epic Security governance undefined",
        "explanation": "Very low Governance scores indicate that ownership, accountability, and formal processes for Epic Security are not clearly defined.",
        "business_impact": "Without defined governance, every other maturity domain is at risk of regression. Improvements made without governance tend to erode over time as organizational changes occur.",
        "severity": "high",
        "domain": "Governance",
    },
    {
        "id": "R018",
        "condition": lambda ds: ds.get("Governance", 0) < 5,
        "extra": lambda ds: ds.get("IAM", 0) > 6,
        "title": "IAM investment at risk without governance",
        "explanation": "IAM tooling is relatively mature but governance is underdeveloped. IAM investments require governance to sustain — without it, role design decisions are ad hoc and automation enforces inconsistent access patterns.",
        "business_impact": "Organizations that invest in IAM without corresponding governance programs often find that the automation amplifies existing access problems rather than solving them.",
        "severity": "medium",
        "domain": "Governance",
    },
    {
        "id": "R022",
        "condition": lambda ds: ds.get("Operational", 0) < 4,
        "extra": lambda ds: True,
        "title": "Team operating in reactive mode",
        "explanation": "Very low Operational scores indicate a team that is fully consumed by reactive work with no meaningful capacity for proactive improvement.",
        "business_impact": "Teams in perpetual firefighting mode cannot improve their environment. This pattern is self-reinforcing — manual processes generate more tickets, which consume more team time, which prevents automation from being built.",
        "severity": "medium",
        "domain": "Operational",
    },
]


def score_responses(responses: list[dict]) -> dict:
    """
    Score a list of question responses.
    Returns domain scores, overall score, findings (including contradictions).
    """
    # Build answer lookup
    answer_lookup: dict[str, dict] = {}
    for r in responses:
        qid = r["question_id"]
        ans = r["selected_answer"]
        key = f"{qid}:{ans}"
        if key in ANSWER_MAP:
            answer_lookup[qid] = ANSWER_MAP[key]

    # Group by domain with anchor weighting
    domain_raw: dict[str, list[float]] = {}
    for qid, data in answer_lookup.items():
        domain = data.get("domain")
        score = data.get("score", 0)
        weight = ANCHOR_WEIGHTS.get(qid, 1.0)
        if domain:
            if domain not in domain_raw:
                domain_raw[domain] = []
            domain_raw[domain].append(score * weight)

    # Compute weighted domain averages
    domain_scores_raw: dict[str, float] = {}
    for domain, scores in domain_raw.items():
        q_ids_in_domain = [
            qid for qid, data in answer_lookup.items()
            if data.get("domain") == domain
        ]
        total_weight = sum(ANCHOR_WEIGHTS.get(qid, 1.0) for qid in q_ids_in_domain)
        if total_weight > 0:
            domain_scores_raw[domain] = sum(scores) / total_weight

    # Normalize to 0-10
    domain_scores_normalized: dict[str, float] = {
        d: round(min(10.0, max(0.0, s)), 2)
        for d, s in domain_scores_raw.items()
    }

    # Overall score (0-100)
    overall = 0.0
    for domain, norm_score in domain_scores_normalized.items():
        weight = DOMAIN_WEIGHTS.get(domain, 0.05)
        overall += (norm_score / 10.0) * weight * 100
    overall = round(overall, 1)

    # Maturity level
    if overall >= 85:
        maturity = "Level 5 – Architected / Optimized"
    elif overall >= 70:
        maturity = "Level 4 – Governed"
    elif overall >= 50:
        maturity = "Level 3 – Stabilizing"
    elif overall >= 30:
        maturity = "Level 2 – Accumulating"
    else:
        maturity = "Level 1 – Reactive"

    # ── Contradiction detection ───────────────────────────────────────────
    contradiction_findings = []
    for rule in CONTRADICTION_RULES:
        q_high = rule["q_high"]
        q_low = rule["q_low"]
        high_min = rule["high_min"]
        low_max = rule["low_max"]

        high_data = answer_lookup.get(q_high)
        low_data = answer_lookup.get(q_low)

        if high_data and low_data:
            high_score = high_data.get("score", 0)
            low_score = low_data.get("score", 0)
            if high_score >= high_min and low_score <= low_max:
                contradiction_findings.append({
                    "source_rule": f"CONTRA_{q_high}_{q_low}",
                    "title": rule["title"],
                    "explanation": rule["explanation"],
                    "business_impact": "Contradictory answers in this area may indicate incomplete implementation, policy-vs-reality gaps, or measurement inconsistency. Oakwolf recommends validating these areas during a structured assessment.",
                    "severity": rule["severity"],
                    "domain": rule["domain"],
                    "is_contradiction": True,
                })

    # ── Cross-domain findings ─────────────────────────────────────────────
    cross_findings = []
    for rule in CROSS_DOMAIN_RULES:
        try:
            if rule["condition"](domain_scores_normalized) and rule["extra"](domain_scores_normalized):
                cross_findings.append({
                    "source_rule": rule["id"],
                    "title": rule["title"],
                    "explanation": rule["explanation"],
                    "business_impact": rule["business_impact"],
                    "severity": rule["severity"],
                    "domain": rule.get("domain", ""),
                    "is_contradiction": False,
                })
        except Exception:
            pass

    # Deduplicate and combine findings
    all_findings = contradiction_findings + cross_findings

    return {
        "domain_scores": domain_scores_normalized,
        "overall_score": overall,
        "maturity_level": maturity,
        "findings": all_findings,
    }


def lookup_answer(question_id: str, selected_answer: str) -> dict:
    """Legacy lookup function for responses router compatibility."""
    key = f"{question_id}:{selected_answer}"
    return ANSWER_MAP.get(key, {"score": 0, "domain": "", "risk_flag": False})
