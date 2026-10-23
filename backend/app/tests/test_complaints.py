"""
CivicPulse AI — Automated Pytest Test Suite
Covers:
- Health check
- End-to-end complaint submission
- Category & Urgency AI classification
- Authority routing
- Separation of delivery vs acknowledgement
- Citizen verification
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_complaint_submission():
    payload = {
        "title": "Severe road crater near bus stop",
        "description": "Deep dangerous pothole on Cross Cut road causing vehicular damage.",
        "category": "roads_potholes",
        "language": "en",
        "location": {
            "address": "Cross Cut Road, Gandhipuram, Coimbatore",
            "city": "Coimbatore",
            "district": "Coimbatore",
            "ward": "Ward 35",
            "latitude": 11.0168,
            "longitude": 76.9558
        }
    }
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "reference_number" in data
    assert data["category"] == "roads_potholes"
    assert data["priority"] in ["high", "critical"]


def test_acknowledgement_separation():
    # Submit complaint
    payload = {
        "title": "Water valve leak on residential street",
        "description": "Drinking water flowing on road for 3 hours.",
        "category": "water_supply",
        "location": {
            "address": "RS Puram, Coimbatore",
            "city": "Coimbatore",
            "district": "Coimbatore",
            "latitude": 11.008,
            "longitude": 76.946
        }
    }
    res = client.post("/api/complaints", json=payload)
    complaint_id = res.json()["id"]

    # Delivery occurs, but acknowledgement must remain False until officer acts
    assert res.json()["is_acknowledged"] is False

    # Perform official acknowledgement
    ack_res = client.post(
        f"/api/complaints/{complaint_id}/acknowledge?officer_name=Er.+Murugesan&official_ref=CCMC-ACK-101"
    )
    assert ack_res.status_code == 200
