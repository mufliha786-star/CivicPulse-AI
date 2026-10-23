"""
CivicPulse AI — User & Authentication Models
Role-based access control: citizen, authority_officer, superadmin.
"""

from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
import uuid
from app.models.complaint import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen")  # citizen, authority_officer, superadmin
    preferred_language = Column(String(10), default="en")  # en, ta
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
