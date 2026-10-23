# CivicPulse AI — Local Development & Setup Guide

## Prerequisites
- Node.js >= 20
- Python >= 3.10
- Flutter SDK >= 3.2.0 (for Android mobile build)
- Docker & Docker Compose (optional)

## 1. Quick Start (Web Unified Dev Server)
The quickest way to run the full platform (Citizen App, Authority Dashboard, API Engine, GIS Heatmap) is:

```bash
# Install Node dependencies
npm install

# Start full-stack server
npm run dev
```

App runs on: `http://localhost:3000`

## 2. Running FastAPI Backend Standalone
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```
Interactive API docs at: `http://localhost:8000/docs`

## 3. Running Flutter Android App Standalone
```bash
cd mobile
flutter pub get
flutter run
```

## 4. Running Automated Pytest Suite
```bash
cd backend
pytest app/tests/ -v
```
