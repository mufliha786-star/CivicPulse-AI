"""
CivicPulse AI — SLA Deadline Monitor & Automated Escalation Worker
Detects overdue authority acknowledgements and breaches of resolution deadlines.
Escalates complaints automatically to Tier-2 District Collectorate.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.complaint import Complaint, Authority


def check_and_escalate_deadlines(db: Session) -> dict:
    """Evaluates acknowledgement and resolution deadlines for all active complaints."""
    now = datetime.utcnow()
    escalated_count = 0
    marked_overdue_count = 0

    active_complaints = db.query(Complaint).filter(
        Complaint.status.notin_(["closed", "resolved"])
    ).all()

    for c in active_complaints:
        # Check acknowledgement SLA (default 24h)
        if not c.is_acknowledged and c.status == "delivered_to_destination":
            ack_deadline = c.created_at + timedelta(hours=24)
            if now > ack_deadline:
                marked_overdue_count += 1

        # Check resolution SLA (default 72h)
        res_deadline = c.created_at + timedelta(hours=72)
        if now > res_deadline and not c.is_escalated:
            c.is_escalated = True
            c.escalated_at = now
            c.status = "escalated"
            c.escalation_reason = "Resolution deadline breached (72h). Automatically escalated to District Collectorate Grievance Cell."
            escalated_count += 1

    db.commit()
    return {
        "status": "success",
        "evaluated_complaints": len(active_complaints),
        "escalated_count": escalated_count,
        "marked_overdue_count": marked_overdue_count,
        "timestamp": now.isoformat()
    }
