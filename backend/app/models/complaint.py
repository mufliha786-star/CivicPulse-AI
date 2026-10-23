"""
CivicPulse AI — Database Schema Models (SQLAlchemy ORM)
Implements Section 16 Database Design:
Normalized models for Users, Authorities, Complaints, DeliveryAttempts, Acknowledgements, and Audit History.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Enum as SQLEnum
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class Authority(Base):
    __tablename__ = "authorities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=True)
    level = Column(String(50), nullable=False, default="municipal")  # municipal, district, state
    department = Column(String(255), nullable=False)
    department_ta = Column(String(255), nullable=True)
    categories = Column(JSON, nullable=False)  # list of complaint categories
    
    # Jurisdiction boundaries
    jurisdiction_state = Column(String(100), default="Tamil Nadu")
    jurisdiction_district = Column(String(100), default="Coimbatore")
    jurisdiction_city = Column(String(100), default="Coimbatore")
    jurisdiction_wards = Column(JSON, default=list)

    # Official contact info
    official_name = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    contact_address = Column(Text, nullable=True)

    # Delivery gateway
    delivery_method = Column(String(50), nullable=False, default="rest_api")  # rest_api, email_gateway, webhook, internal_dashboard
    delivery_endpoint = Column(String(500), nullable=False)
    auth_type = Column(String(50), default="bearer")
    is_verified = Column(Boolean, default=True)
    last_verified_date = Column(DateTime, default=datetime.utcnow)

    # SLA configurations
    ack_sla_hours = Column(Integer, default=24)
    resolution_sla_hours = Column(Integer, default=72)
    escalation_authority_id = Column(String(36), ForeignKey("authorities.id"), nullable=True)

    data_source = Column(String(255), default="CCMC Directory 2026")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaints = relationship("Complaint", back_populates="assigned_authority")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reference_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    title_ta = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    description_ta = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)

    # Status & Priority
    status = Column(String(50), nullable=False, default="submitted_internal", index=True)
    priority = Column(String(20), nullable=False, default="medium", index=True)
    priority_score = Column(Integer, default=50)
    priority_explanation = Column(Text, nullable=True)
    language = Column(String(10), default="en")

    # Geolocation
    address = Column(String(500), nullable=False)
    landmark = Column(String(255), nullable=True)
    ward = Column(String(100), nullable=True)
    city = Column(String(100), default="Coimbatore")
    district = Column(String(100), default="Coimbatore")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Citizen details
    citizen_name = Column(String(255), nullable=False)
    citizen_phone = Column(String(50), nullable=True)
    citizen_email = Column(String(255), nullable=True)

    # Routing
    assigned_authority_id = Column(String(36), ForeignKey("authorities.id"), nullable=True)
    routing_confidence = Column(Float, default=0.0)
    routing_reason = Column(Text, nullable=True)

    # Delivery tracking (Separate from acknowledgement)
    delivery_status = Column(String(50), default="not_dispatched")
    delivery_attempts_count = Column(Integer, default=0)
    external_reference_id = Column(String(100), nullable=True)
    delivery_receipt = Column(Text, nullable=True)

    # Acknowledgement tracking
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    official_ack_ref = Column(String(100), nullable=True)
    ack_notes = Column(Text, nullable=True)

    # Escalation
    is_escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime, nullable=True)
    escalated_to_id = Column(String(36), nullable=True)
    escalation_reason = Column(Text, nullable=True)

    # Resolution
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    resolution_description = Column(Text, nullable=True)
    is_citizen_verified = Column(Boolean, nullable=True)
    citizen_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_authority = relationship("Authority", back_populates="complaints")
    delivery_attempts = relationship("DeliveryAttempt", back_populates="complaint")


class DeliveryAttempt(Base):
    __tablename__ = "delivery_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=False)
    destination_endpoint = Column(String(500), nullable=False)
    method = Column(String(50), nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False)  # success / failed
    http_status = Column(Integer, nullable=True)
    receipt = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="delivery_attempts")
