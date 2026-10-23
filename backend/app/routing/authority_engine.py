"""
CivicPulse AI — Intelligent Authority Identification & Routing Engine
Evaluates Category, GPS Coordinates, Administrative Ward Boundaries, and Responsibility Rules.
"""

from dataclasses import dataclass
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.complaint import Authority
from app.schemas.complaint import LocationSchema


@dataclass
class RoutingDecision:
    authority_id: Optional[str]
    department_name: str
    confidence: float
    reason: str
    requires_human_review: bool
    alternative_authorities: List[str]


class AuthorityRoutingEngine:
    def __init__(self, confidence_threshold: float = 0.75):
        self.confidence_threshold = confidence_threshold

    def determine_authority(
        self,
        category: str,
        location: LocationSchema,
        ai_confidence: float,
        db: Session
    ) -> RoutingDecision:
        """
        Determines the responsible civic department using:
        1. Complaint Category
        2. Ward & City Jurisdiction
        3. Department Responsibility Rules
        """
        # Find active authorities whose categories contain this category
        all_authorities = db.query(Authority).filter(Authority.is_active == True).all()
        matched = [a for a in all_authorities if category in (a.categories or [])]

        if not matched:
            return RoutingDecision(
                authority_id=None,
                department_name="Central Grievance Triage Cell",
                confidence=0.40,
                reason=f"No verified department found mapped directly to category '{category}'. Forwarded to manual review.",
                requires_human_review=True,
                alternative_authorities=[]
            )

        # Check ward-level or district-level match
        target_auth = None
        for a in matched:
            if location.ward and location.ward in (a.jurisdiction_wards or []):
                target_auth = a
                break

        if not target_auth:
            target_auth = matched[0]

        routing_confidence = min(1.0, (ai_confidence * 0.7) + 0.3)
        requires_review = routing_confidence < self.confidence_threshold

        return RoutingDecision(
            authority_id=target_auth.id,
            department_name=target_auth.department,
            confidence=round(routing_confidence, 2),
            reason=f"Matched problem category '{category}' and jurisdiction boundary to {target_auth.name}.",
            requires_human_review=requires_review,
            alternative_authorities=[a.name for a in matched if a.id != target_auth.id]
        )
