# CivicPulse AI — Authority Routing Engine Specification

## 1. Overview
The core responsibility of CivicPulse AI is to ensure that complaints never remain floating in an unassigned database. Every complaint is matched against verified government department responsibility boundaries.

## 2. Decision Logic
When a complaint is submitted, the engine evaluates:
1. **Reported Problem Category:** Maps to the primary technical division.
2. **Geographic Ward & Jurisdiction:** Resolves whether the jurisdiction belongs to:
   - Municipal Corporation (e.g. Coimbatore City Municipal Corporation - CCMC)
   - State Parastatal Board (e.g. TWAD Board for water mains, TANGEDCO for 11kV/33kV grids)
   - State Highways or PWD (for state highways passing through municipal limits)
3. **Delivery Mechanism:** Retrieves the active delivery channel (REST API, Gov Email Gateway, or Webhook).
4. **Confidence Threshold:** If confidence is below 75% or boundary is ambiguous, the complaint is placed in `awaiting_routing_review` for authorized human operator confirmation.

## 3. Separation of Delivery vs Acknowledgement
- **Delivered:** External gateway confirmed HTTP 200/201 or SMTP 250 with external ticket ID.
- **Acknowledged:** Official authority officer confirms case receipt, records duty officer name, and assigns field crew.

## 4. SLA Timelines & Escalation
- **Acknowledgement SLA:** 24 Hours default (12h for drainage, 6h for electrical hazard).
- **Resolution SLA:** 72 Hours default (24h for electrical, 48h for water burst).
- **Escalation Target:** Unacknowledged or overdue complaints automatically transfer oversight to the District Collector & Corporation Commissioner Grievance Cell (Tier-2).
