# CivicPulse AI — Multilingual Civic Grievance & Accountability Platform

CivicPulse AI is an end-to-end civic complaint management platform that bridges citizens and government authorities. It automatically classifies civic hazards, determines the legally responsible municipal or state department, dispatches complaints through verified delivery adapters, tracks external delivery separately from authority acknowledgement, and enforces statutory SLA escalation.

## Core Platform Highlights

1. **Multilingual Citizen Experience (Tamil & English):**
   - Natural language voice dictation and speech-to-text simulation.
   - Camera and gallery photo attachments.
   - High-precision GPS geotagging with reverse-geocoded municipal wards and manual pin adjustment.
   - Real-time AI categorizer with confidence metrics and explainable urgency rationale.
   - Duplicate detection warnings to prevent redundant reports.

2. **Intelligent Authority Identification & Routing:**
   - Database-backed authority directory with jurisdiction boundaries (Coimbatore Corporation, TWAD Board, TANGEDCO, PWD).
   - Automated routing based on category, ward, and municipal level.
   - Human review routing queue when confidence falls below threshold.

3. **Separate Delivery vs Acknowledgement State Machine:**
   - **Internal Submission:** Stored in CivicPulse repository.
   - **External Delivery:** Dispatched through REST API, Gov Email Gateway, or Signed Webhook with delivery receipt.
   - **Authority Acknowledgement:** Official officer confirms receipt with reference number.
   - **Resolution Verification:** Citizen independently confirms resolution or disputes and reopens the case.

4. **SLA Deadlines & Automated Escalation:**
   - Background worker monitors 24h acknowledgement and 72h resolution deadlines.
   - Auto-escalates overdue grievances to Tier-2 District Collectorate & Commissioner Cell.

5. **Authority Administration Dashboard:**
   - Real-time grievance status KPIs.
   - Interactive GIS ward map with priority cluster heatmaps.
   - Detailed complaint inspection, delivery log history, manual re-routing, and resolution verification.
   - Statutory CSV audit export.

## Running the Application

### 1. Unified Full-Stack Live Web App (Port 3000)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the integrated Authority Dashboard, Citizen Mobile Simulator, GIS Hotspot Map, and Code Export Hub.

### 2. Python FastAPI Backend (Port 8000)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation available at: `http://localhost:8000/docs`

### 3. Flutter Android App
```bash
cd mobile
flutter pub get
flutter run
```

### 4. Docker Compose
```bash
docker-compose up --build
```
