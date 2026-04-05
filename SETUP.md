# 🚀 Setup & Execution Guide — SecureSync AI

This document provides definitive instructions for local development, environment configuration, and production-like orchestration.

---

## 🛠 Prerequisites
Ensure the following are installed on your workstation:
- **Node.js** (v20.x recommended)
- **Python** (v3.11.x recommended)
- **Docker & Docker Compose** (required for full stack orchestration)

---

## 🚦 Quick Start (Local Development)

### 1. Environment Configuration
Copy the default environment templates and configure your keys.
```powershell
# Root Directory
cp .env.example .env
# Frontend Directory
cp .env.example frontend/.env
```

### 1.1 Partner Verification Mode (Hackathon Recommended)
SecureSync uses a provider mode switch for partner verification.

- `PARTNER_PROVIDER_MODE=mock` keeps verification on the built-in mock partner catalog.
- `STRICT_MOCK_PARTNER_IDS=true` rejects unknown partner IDs with HTTP 404.

For demos, keep both values as above so verification is deterministic and realistic.

Known demo IDs:
- Swiggy: `SW-982341`, `SW-223344`, `SW-667788`
- Zomato: `ZM-112233`, `ZM-556677`, `ZM-445521`

If `PARTNER_PROVIDER_MODE` is set to an unsupported value, `/api/v1/workers/verify` returns HTTP 503 by design.

### 2. Backend Setup (FastAPI)
The backend manages the neural engine, database models, and trigger monitoring.
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup (Vite)
The PWA is built with Vite for optimal performance on low-end devices.
```powershell
cd frontend
npm install
npm run dev -- --port 5173
```
- **App URL**: [http://localhost:5173](http://localhost:5173)

### 3.1 Frontend Test Guardrail
Run frontend unit tests (Vitest) before build/deploy.
```powershell
cd frontend
npm run test
```

---

## 🐳 Docker Stack Orchestration

For the most robust experience (including PostgreSQL, Redis, and Kafka), use the pre-configured Docker stack.

Security default: Docker Compose now binds service ports to `127.0.0.1` so databases and brokers are not exposed on your LAN by default.

### One-Command Startup
Use the provided PowerShell script to bring up the entire stack with migrations and health checks.
```powershell
.\scripts\stack-up.ps1
```

### Managed Services Overview
- **Postgres + PostGIS**: Geospatial data storage.
- **Redis**: Rate limiting and real-time caching.
- **Kafka + Zookeeper**: High-throughput event streaming for triggers.

### Kubernetes Secret Bootstrap (Required)
Before applying Kubernetes deployments, create secrets from non-placeholder values.

```powershell
# Edit placeholders first
code k8s/secrets.example.yaml

# Apply after replacement
kubectl apply -f k8s/secrets.example.yaml
```

Do not commit real secret values to git.

### Maintenance Commands
- **Check Status**: `.\scripts\stack-status.ps1`
- **Shut Down**: `.\scripts\stack-down.ps1`
- **Reset Volumes**: `.\scripts\stack-down.ps1 -DeleteVolumes`

---

## 🧪 Verification & Smoke Testing

### Payout Webhook Validation
Validate that the Razorpay webhook signature path is correctly configured and reachable.
```powershell
.\scripts\razorpay-webhook-smoke.ps1
```

### Database Persistence Check
Verify that the SQLite/PostgreSQL models are correctly initialized.
```powershell
# (Backend Active)
curl http://localhost:8000/api/v1/health
```

### Partner Verification Smoke Check
Verify strict mock behavior end-to-end after login.

- Use one of the known demo IDs and expect HTTP 200.
- Use an unknown ID and expect HTTP 404 when `STRICT_MOCK_PARTNER_IDS=true`.

### Full Local Quality Check
Run the same core checks expected by CI.
```powershell
cd backend
pytest -q

cd ..\frontend
npm run test
npm run build
```

### Release Readiness Checklist
Before creating a release candidate, validate against:

- `RELEASE_CHECKLIST.md`

---

## 🏗 Project Architecture
- `backend/`: FastAPI source, models, and trigger logic.
- `frontend/`: Vite-based PWA, screens, and assets.
- `scripts/`: Cross-platform utility scripts for infrastructure.
- `audit_report.md`: Technical audit of system security and architecture.
