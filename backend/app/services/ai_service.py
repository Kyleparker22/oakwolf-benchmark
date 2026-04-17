"""
AI Narrative Service — V1

Generates executive summaries and findings narrative using OpenAI.
AI is ONLY used for narrative text. It never determines scores or maturity levels.
All inputs to AI are pre-computed structured data from the scoring engine.
"""

import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

MATURITY_DESCRIPTIONS = {
    "Level 1": "The environment lacks foundational controls. Provisioning is largely manual, access governance is absent or informal, and the team operates primarily in reactive mode.",
    "Level 2": "Basic controls exist but are inconsistently applied. Some automation is in place but lifecycle gaps are common. Governance is informal and ownership is unclear in places.",
    "Level 3": "The organization has established a functional baseline. Automation covers a meaningful portion of provisioning and some governance structure is in place. Gaps remain in role standardization or cross-functional alignment.",
    "Level 4": "Mature controls are consistently applied across most domains. Provisioning automation is high, lifecycle management is reliable, and governance ownership is clear.",
    "Level 5": "The organization operates at the highest level of Epic Security and IAM maturity. Automation is comprehensive, governance is embedded in operational workflows, and monitoring is advanced.",
}


def _build_ai_input(results: dict, mode: str) -> dict:
    """
    Build the structured input object passed to the AI.
    Strips any PII — only aggregated scores and findings are included.
    """
    assessment = results.get("assessment", {})
    domain_scores = results.get("domain_scores", [])
    findings = results.get("findings", [])
    context = results.get("organization_context") or {}

    level_label = (assessment.get("maturity_level") or "").split("–")[0].strip()
    level_desc = MATURITY_DESCRIPTIONS.get(level_label, "")

    # Sort domains by score for strength/risk identification
    sorted_domains = sorted(domain_scores, key=lambda d: d["normalized_score"], reverse=True)
    strengths = [d["domain_name"] for d in sorted_domains[:2]]
    risks = [d["domain_name"] for d in sorted_domains[-2:]]

    return {
        "organization_context": {
            "org_type": context.get("org_type"),
            "hospital_count": context.get("hospital_count"),
            "user_count": context.get("user_count"),
            "epic_tenure": context.get("epic_tenure"),
            "iam_platform": context.get("iam_platform"),
            "security_model": context.get("security_model"),
            "strategic_focus": context.get("strategic_focus"),
            "lifecycle_stage": context.get("lifecycle_stage"),
        },
        "overall_score_100": assessment.get("overall_score_100"),
        "maturity_level": assessment.get("maturity_level"),
        "maturity_description": level_desc,
        "domain_scores": {d["domain_name"]: round(d["normalized_score"], 1) for d in domain_scores},
        "strongest_domains": strengths,
        "weakest_domains": risks,
        "findings": [
            {
                "title": f["title"],
                "severity": f.get("severity"),
                "explanation": f.get("explanation"),
                "business_impact": f.get("business_impact"),
            }
            for f in findings
            if f.get("visibility_scope") in ("both", "external" if mode == "external" else "internal", "internal")
        ],
        "report_mode": mode,
        "high_severity_count": sum(1 for f in findings if f.get("severity") == "high"),
        "medium_severity_count": sum(1 for f in findings if f.get("severity") == "medium"),
    }


def generate_executive_summary(results: dict, mode: str = "external") -> str:
    """
    Generate a 4-6 sentence executive summary.
    External mode: no remediation detail.
    Internal mode: includes practical interpretation.
    """
    ai_input = _build_ai_input(results, mode)

    if mode == "external":
        scope_instruction = (
            "Do NOT provide implementation steps, quick wins, or remediation detail. "
            "Keep the tone advisory and high-level. This is for a prospect audience."
        )
    else:
        scope_instruction = (
            "Include practical interpretation of the key risk areas. "
            "Reference the organization context where relevant. "
            "This is for internal Oakwolf use to support a client conversation."
        )

    prompt = f"""You are generating an executive summary for an Epic Security and IAM benchmarking assessment conducted by Oakwolf, a healthcare IT consulting firm.

Use ONLY the structured data provided below. Do not invent facts, scores, or findings not present in the input.
Write in a concise, consulting-grade tone appropriate for a health system security or IT leader.

The output must:
- Be 4-6 sentences
- Mention the current maturity level and score
- Reference 1-2 domain strengths (the strongest domains)
- Reference 1-2 key risk areas (the weakest domains or highest severity findings)
- Close with a forward-looking statement appropriate for the maturity level
- {scope_instruction}
- Output plain text only — no markdown, no bullet points, no headers

DATA:
{json.dumps(ai_input, indent=2)}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()


def generate_what_good_looks_like(results: dict) -> str:
    """
    Generate a short 'What Good Looks Like' section describing Level 4-5 characteristics.
    Used in external reports to create aspiration and interest in follow-up.
    """
    ai_input = _build_ai_input(results, "external")

    prompt = f"""You are writing a short section for an Epic Security benchmark report that explains what a more mature Epic Security and IAM environment looks like.

Use the organization's current maturity level and domain scores as context.
Keep the language high-level and aspirational — 3-4 sentences.
Focus on characteristics of a Level 4-5 environment.
Do not give implementation steps or quick wins.
Do not reference the organization's specific scores directly.
Output plain text only — no markdown, no bullet points, no headers.

DATA:
{json.dumps(ai_input, indent=2)}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()


def generate_all_ai_outputs(results: dict, mode: str = "external") -> dict:
    """
    Generate all AI outputs for an assessment in one call.
    Returns a dict of output_type -> text.
    Handles failures gracefully — returns placeholder text if AI call fails.
    """
    outputs = {}

    try:
        outputs["executive_summary"] = generate_executive_summary(results, mode)
    except Exception as e:
        print(f"AI executive summary failed: {e}")
        outputs["executive_summary"] = ""

    try:
        outputs["what_good_looks_like"] = generate_what_good_looks_like(results)
    except Exception as e:
        print(f"AI what_good_looks_like failed: {e}")
        outputs["what_good_looks_like"] = ""

    return outputs


def generate_proposal_content(results: dict) -> dict:
    """
    Generate structured proposal content for internal Oakwolf use.
    """
    ai_input = _build_ai_input(results, "internal")
    client_name = results.get("assessment", {}).get("client_name", "Your Organization")
    score = results.get("assessment", {}).get("overall_score_100", 50)
    maturity = results.get("assessment", {}).get("maturity_level", "Level 3 - Stabilizing")

    context = results.get("organization_context") or {}
    user_count = context.get("user_count", "2,000-5,000")
    is_large = user_count in ["5,000-10,000", "10,000+"]

    if is_large:
        assess_low = 1 * 20 * 3 * 150 + 2 * 40 * 3 * 150
        assess_high = 1 * 20 * 6 * 200 + 2 * 40 * 6 * 200
    else:
        assess_low = 1 * 20 * 3 * 150 + 1 * 40 * 3 * 150
        assess_high = 1 * 20 * 6 * 200 + 1 * 40 * 6 * 200

    prompt = f"""You are generating a structured consulting proposal for Oakwolf, a healthcare IT consulting firm specializing in Epic Security and IAM.

The client is: {client_name}
Their benchmark score is: {score}/100
Their maturity level is: {maturity}

Use ONLY the structured data provided. Do not invent facts.
Be specific, practical, and consulting-grade.

Return ONLY valid JSON with this exact structure, no markdown fences:
{{
  "situation_summary": "2-3 sentences summarizing the client current state and key risk areas",
  "quick_wins": [
    {{"title": "...", "description": "...", "timeline": "30 days", "effort": "Low"}},
    {{"title": "...", "description": "...", "timeline": "30-60 days", "effort": "Medium"}},
    {{"title": "...", "description": "...", "timeline": "60 days", "effort": "Low"}}
  ],
  "near_term": [
    {{"title": "...", "description": "...", "timeline": "60-90 days", "effort": "Medium"}},
    {{"title": "...", "description": "...", "timeline": "90 days", "effort": "High"}}
  ],
  "long_term": [
    {{"title": "...", "description": "...", "timeline": "6-12 months", "effort": "High"}},
    {{"title": "...", "description": "...", "timeline": "6-12 months", "effort": "Medium"}}
  ],
  "engagement_rationale": "2-3 sentences explaining why a structured Oakwolf engagement is the right next step"
}}

DATA:
{json.dumps(ai_input, indent=2)}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
        temperature=0.4,
    )

    raw = response.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    proposal_content = json.loads(raw)
    proposal_content["pricing"] = {
        "assessment": {
            "label": "Phase 1 - Epic Security Assessment",
            "duration": "3-6 weeks",
            "team": "1 Senior Advisor + 1-2 Analysts",
            "rate": "",
            "range_low": assess_low,
            "range_high": assess_high,
            "notes": "Scope varies based on health system size, number of Epic environments, and Community Connect footprint.",
        },
        "remediation": {
            "label": "Phase 2 - Remediation and Implementation",
            "duration": "TBD based on assessment findings",
            "team": "TBD based on scope",
            "rate": "",
            "range_low": None,
            "range_high": None,
            "notes": "Remediation scope and cost will be defined following the Phase 1 assessment. Investment varies based on the number of domains requiring intervention and organizational complexity.",
        },
        "health_check": {
            "label": "Phase 3 - Ongoing Health Check",
            "duration": "Semi-annual",
            "team": "1 Senior Advisor + 1 Analyst",
            "rate": "",
            "range_low": 14000,
            "range_high": 28000,
            "notes": "Per engagement. Includes access review, benchmark refresh, and maturity progression report. Based on 1 Advisor at 20 hrs/week and 1 Analyst at 20 hrs/week.",
        },
    }

    return proposal_content


def generate_proposal_content(results: dict) -> dict:
    """
    Generate structured proposal content for internal Oakwolf use.
    """
    ai_input = _build_ai_input(results, "internal")
    client_name = results.get("assessment", {}).get("client_name", "Your Organization")
    score = results.get("assessment", {}).get("overall_score_100", 50)
    maturity = results.get("assessment", {}).get("maturity_level", "Level 3 - Stabilizing")

    context = results.get("organization_context") or {}
    user_count = context.get("user_count", "2,000-5,000")
    is_large = user_count in ["5,000-10,000", "10,000+"]

    if is_large:
        assess_low = 1 * 20 * 3 * 150 + 2 * 40 * 3 * 150
        assess_high = 1 * 20 * 6 * 200 + 2 * 40 * 6 * 200
    else:
        assess_low = 1 * 20 * 3 * 150 + 1 * 40 * 3 * 150
        assess_high = 1 * 20 * 6 * 200 + 1 * 40 * 6 * 200

    prompt = f"""You are generating a structured consulting proposal for Oakwolf, a healthcare IT consulting firm specializing in Epic Security and IAM.

The client is: {client_name}
Their benchmark score is: {score}/100
Their maturity level is: {maturity}

Use ONLY the structured data provided. Do not invent facts.
Be specific, practical, and consulting-grade.

Return ONLY valid JSON with this exact structure, no markdown fences:
{{
  "situation_summary": "2-3 sentences summarizing the client current state and key risk areas",
  "quick_wins": [
    {{"title": "...", "description": "...", "timeline": "30 days", "effort": "Low"}},
    {{"title": "...", "description": "...", "timeline": "30-60 days", "effort": "Medium"}},
    {{"title": "...", "description": "...", "timeline": "60 days", "effort": "Low"}}
  ],
  "near_term": [
    {{"title": "...", "description": "...", "timeline": "60-90 days", "effort": "Medium"}},
    {{"title": "...", "description": "...", "timeline": "90 days", "effort": "High"}}
  ],
  "long_term": [
    {{"title": "...", "description": "...", "timeline": "6-12 months", "effort": "High"}},
    {{"title": "...", "description": "...", "timeline": "6-12 months", "effort": "Medium"}}
  ],
  "engagement_rationale": "2-3 sentences explaining why a structured Oakwolf engagement is the right next step"
}}

DATA:
{json.dumps(ai_input, indent=2)}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
        temperature=0.4,
    )

    raw = response.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    proposal_content = json.loads(raw)
    proposal_content["pricing"] = {
        "assessment": {
            "label": "Phase 1 - Epic Security Assessment",
            "duration": "3-6 weeks",
            "team": "1 Senior Advisor + 1-2 Analysts",
            "rate": "",
            "range_low": assess_low,
            "range_high": assess_high,
            "notes": "Scope varies based on health system size, number of Epic environments, and Community Connect footprint.",
        },
        "remediation": {
            "label": "Phase 2 - Remediation and Implementation",
            "duration": "TBD based on assessment findings",
            "team": "TBD based on scope",
            "rate": "",
            "range_low": None,
            "range_high": None,
            "notes": "Remediation scope and cost will be defined following the Phase 1 assessment. Investment varies based on the number of domains requiring intervention and organizational complexity.",
        },
        "health_check": {
            "label": "Phase 3 - Ongoing Health Check",
            "duration": "Semi-annual",
            "team": "1 Senior Advisor + 1 Analyst",
            "rate": "",
            "range_low": 14000,
            "range_high": 28000,
            "notes": "Per engagement. Includes access review, benchmark refresh, and maturity progression report. Based on 1 Advisor at 20 hrs/week and 1 Analyst at 20 hrs/week.",
        },
    }

    return proposal_content
