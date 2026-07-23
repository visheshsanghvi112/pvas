# Price-Volume Alert Surveillance Framework (PVASF)

An institutional Price-Volume (PV) compliance surveillance platform and interactive desktop workspace built with **FastAPI** (Python backend), **Next.js 15** (React frontend), and **Recharts**.

---

## Key Features

- **5 Core Statistical Shortlisting Metrics**: Price Rise %, Price Z-Score, Volume Z-Score, Circuit Band Persistence (90% Band Hits), and 180-Day New High Breakouts.
- **Participant-Level Audit Engine**: LTP contribution tracking, volume concentration per PAN, counterparty pair networks, trade reversal ratios (RTR), circular loop detection (3–5 node directed cycles), and top profit-maker rankings.
- **Teradata Integration Ready**: Pre-built Teradata SQL analytical window function queries (`DATA_REQUIREMENTS.md`) for EOD batch processing.
- **Interactive Investigation Dashboard**: 180-day price/volume trend timeline, score breakdown drivers, corporate filing timelines, and risk triage queue.

---

## Quick Start

### 1. Backend (FastAPI + Python Surveillance Engine)
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend server (port 8000)
python3 -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend (Next.js Dashboard UI)
```bash
# Install Node dependencies
npm install

# Run Next.js dev server (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
pvas/
├── backend/
│   ├── main.py
│   ├── routers/
│   │   └── surveillance.py
│   ├── services/
│   │   └── surveillance_service.py
│   └── requirements.txt
├── app/                      # Next.js App Router pages
├── components/               # UI components & charts
├── lib/                      # API client & utilities
├── pv_alert_surveillance.py  # Core Python Surveillance Engine
├── test_surveillance.py      # Unit tests
├── DATA_REQUIREMENTS.md      # Teradata SQL & Data Specs
└── PVASF_CORE_SPEC.md        # Technical Spec Document
```
