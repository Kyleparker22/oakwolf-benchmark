import requests
import json

SLACK_WEBHOOK = "https://hooks.slack.com/services/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"

def notify_new_lead(lead: dict, assessment: dict):
    """Send a Slack notification when a new lead submits their info."""
    score = assessment.get("overall_score_100", "—")
    maturity = assessment.get("maturity_level", "—")
    name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
    org = lead.get("organization", "Unknown org")
    title = lead.get("title", "—")
    email = lead.get("email", "—")
    job_function = lead.get("job_function", "—")
    heard_from = lead.get("heard_from", "—")

    score_emoji = "🟢" if isinstance(score, (int, float)) and score >= 70 else "🟡" if isinstance(score, (int, float)) and score >= 50 else "🔴"

    message = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🎯 New Benchmark Submission", "emoji": True}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Name:*\n{name}"},
                    {"type": "mrkdwn", "text": f"*Organization:*\n{org}"},
                    {"type": "mrkdwn", "text": f"*Title:*\n{title}"},
                    {"type": "mrkdwn", "text": f"*Job Function:*\n{job_function}"},
                    {"type": "mrkdwn", "text": f"*Email:*\n{email}"},
                    {"type": "mrkdwn", "text": f"*Heard From:*\n{heard_from}"},
                ]
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Score:*\n{score_emoji} {score} / 100"},
                    {"type": "mrkdwn", "text": f"*Maturity Level:*\n{maturity}"},
                ]
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"📧 <mailto:{email}|Reply to {name}>  |  🔗 <https://oakwolf-benchmark.vercel.app/internal/login|View in Internal Portal>"}
            }
        ]
    }

    try:
        requests.post(SLACK_WEBHOOK, json=message, timeout=5)
    except Exception:
        pass  # Never let Slack errors break the lead submission
