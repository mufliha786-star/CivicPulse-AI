"""
CivicPulse AI — Pydantic Request/Response Validation Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LocationSchema(BaseModel):
    address: str
    city: str = "Coimbatore"
    district: str = "Coimbatore"
    state: str = "Tamil Nadu"
    ward: Optional[str] = "Ward 35"
    latitude: float = 11.0168
    longitude: float = 76.9558


class CitizenInfoSchema(BaseModel):
    name: str = "Citizen"
    phone: Optional[str] = None
    email: Optional[str] = None


class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    title_ta: Optional[str] = None
    description: str = Field(..., min_length=10)
    description_ta: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = "en"
    location: LocationSchema
    citizen: Optional[CitizenInfoSchema] = None


class ComplaintResponse(BaseModel):
    id: str
    reference_number: str
    title: str
    title_ta: Optional[str]
    description: str
    category: str
    status: str
    priority: str
    priority_score: int
    language: str
    address: str
    ward: Optional[str]
    latitude: float
    longitude: float
    routing_confidence: float
    routing_reason: Optional[str]
    delivery_status: str
    is_acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AIAnalysisRequest(BaseModel):
    title: str
    description: str
    location_text: Optional[str] = None
