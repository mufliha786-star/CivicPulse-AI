"""
CivicPulse AI — Python FastAPI Core Backend Service
Implements Section 17 API requirements & Section 7 Intelligent Authority Routing
"""

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.complaint import Complaint, Authority, DeliveryAttempt, Base
from app.schemas.complaint import ComplaintCreate, ComplaintResponse, AIAnalysisRequest
from app.ai.gemini_service import CivicIntelligenceEngine
from app.routing.authority_engine import AuthorityRoutingEngine
from app.delivery.adapters import DeliveryGatewayService
from app.workers.sla_escalation import check_and_escalate_deadlines

app = FastAPI(
    title="CivicPulse AI API",
    description="Multilingual civic complaint reporting, intelligent authority routing, delivery tracking, and accountability platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_engine = CivicIntelligenceEngine()
routing_engine = AuthorityRoutingEngine()
delivery_service = DeliveryGatewayService()


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "healthy",
        "service": "CivicPulse AI Core API",
        "version": "1.0.0"
    }


@app.post("/api/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, tags=["Complaints"])
async def create_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends()
):
    """
    Every complaint goes through complete responsibility and delivery workflow:
    1. Understand the complaint via AI
    2. Determine responsible department & authority
    3. Route through supported delivery mechanism
    4. Record delivery result
    5. Maintain separate delivery vs acknowledgement states
    """
    ai_result = await ai_engine.analyze(
        title=payload.title,
        description=payload.description,
        location_text=payload.location.address
    )

    routing_decision = routing_engine.determine_authority(
        category=payload.category or ai_result.predicted_category,
        location=payload.location,
        ai_confidence=ai_result.confidence,
        db=db
    )

    complaint = Complaint(
        title=payload.title,
        title_ta=payload.title_ta,
        description=payload.description,
        description_ta=payload.description_ta,
        category=payload.category or ai_result.predicted_category,
        priority=ai_result.priority,
        priority_explanation=ai_result.priority_explanation,
        status="delivered_to_destination" if not routing_decision.requires_human_review else "awaiting_routing_review",
        language=payload.language or "en",
        latitude=payload.location.latitude,
        longitude=payload.location.longitude,
        address=payload.location.address,
        ward=payload.location.ward,
        assigned_authority_id=routing_decision.authority_id,
        routing_confidence=routing_decision.confidence,
        routing_reason=routing_decision.reason
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    if not routing_decision.requires_human_review:
        background_tasks.add_task(
            delivery_service.dispatch_complaint,
            complaint_id=complaint.id,
            authority_id=routing_decision.authority_id,
            db=db
        )

    return complaint


@app.post("/api/complaints/{complaint_id}/acknowledge", tags=["Accountability"])
def acknowledge_complaint(
    complaint_id: str,
    officer_name: str,
    official_ref: str,
    notes: Optional[str] = None,
    db: Session = Depends()
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.is_acknowledged = True
    complaint.acknowledged_by = officer_name
    complaint.official_ack_ref = official_ref
    complaint.ack_notes = notes
    complaint.status = "acknowledged_by_authority"
    db.commit()
    return {"status": "success", "message": "Authority acknowledgement recorded"}


@app.post("/api/workers/check-deadlines", tags=["SLA Worker"])
def trigger_sla_worker(db: Session = Depends()):
    return check_and_escalate_deadlines(db)
