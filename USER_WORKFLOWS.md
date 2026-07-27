# Market Conduct & Surveillance Platform — User Workflows & Investigation Journeys
**Document Version**: 1.0.0  

---

## 1. User Persona Overview

| Persona | Primary Goal | Core Modules Used | Key Output |
| :--- | :--- | :--- | :--- |
| **Surveillance Analyst** | Daily alert triage, price/volume anomaly evaluation, initial risk tagging. | Module 2 (Alerts), Module 3 (Security), Module 4 (Trades) | Triage Status Transition & Compliance Notes |
| **Surveillance Supervisor** | Macro risk oversight, metric weight tuning, escalation approval. | Module 1 (Dash), Module 2 (Alerts), Module 10 (Reports) | Scoring Model Calibration & Report Approvals |
| **Investigation Officer** | Deep-dive forensic case building, entity cross-matching, regulatory dossiers. | Module 5 (Participant), Module 6 (Client 360), Module 9 (Case) | Formal Regulatory Case Report |
| **Member Supervision Officer**| Broker/TM conduct monitoring, terminal allocation compliance, wash trade tracking.| Module 7 (Broker), Module 4 (Trades), Module 8 (CTCL) | Member Audit Findings & Penalty Recommendations |
| **HFT / Algo Specialist** | Spoofing detection, HFT strategy cancellation ratio audit, DMA channel review. | Module 8 (CTCL & Algo), Module 4 (Trades) | Algo Strategy Suspension Recommendation |

---

## 2. Detailed Persona Workflows

### 2.1 Persona 1: Surveillance Analyst — Daily Alert Triage Journey

```
┌─────────────────────────┐
│ 1. Open Alert Queue     │ Analyst logs in at market open / post EOD batch.
│ (Module 2)              │ Views 18 active alerts sorted by Composite Risk Score.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Expand Scorecard     │ Clicks ALPHATECH (Score 88.5). Reviews 5 metric scores:
│ (Module 2 Drawer)       │ Price Rise (+124.5%), Price Z (3.12), Vol Z (2.85), Hits (12d).
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Security Deep-Dive   │ Opens 180-day candlestick chart. Verifies price rise coincides
│ (Module 3)              │ with upper circuit hits and no corporate announcements exist.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Trade Execution Audit│ Navigates to Trade Explorer. Filters for `wash_flag = 1`.
│ (Module 4)              │ Discovers 42 self-matched trades by broker `TM00001`.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Triage Decision      │ Transitions Alert status from `OPEN` -> `ESCALATED`.
│ (Module 2 Action)       │ Enters Compliance Note & assigns to Investigation Officer.
└─────────────────────────┘
```

---

### 2.2 Persona 2: Investigation Officer — Cross-Market Entity Collusion Case

```
┌─────────────────────────┐
│ 1. Receive Escalation   │ Receives notification of Escalated Alert for ALPHATECH.
│ (Module 9 Workspace)    │ Creates Case `CASE-2026-ALPHATECH-001`.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Participant Conduct  │ Launches Participant Audit module. Reviews LTP Contributors.
│ (Module 5)              │ Identifies PAN A (AAACB1234F) and PAN B (XYZPB9876K) driving 62.6% of LTP.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Circular Loop Check  │ Renders Circular Trade Visualizer. Discovers 3-node loop:
│ (Module 5 Visualizer)   │ PAN A -> PAN B -> PAN C -> PAN A (1.20M Shares rotated).
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Client 360° Audit    │ Opens Client 360° for PAN A. Cross-checks Depository `DDCL`.
│ (Module 6)              │ Finds PAN A and PAN B share a JOINT DEMAT ACCOUNT and BANK ACCOUNT.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Case Report Export   │ Pins charts, trade logs, and joint demat proof to Case Dossier.
│ (Module 9 & Module 10)  │ Exports Masked Regulatory PDF Report for Legal Examination.
└─────────────────────────┘
```

---

### 2.3 Persona 3: HFT & Algo Specialist — Order Book Spoofing Audit

```
┌─────────────────────────┐
│ 1. Review Algo Channel  │ Reviews Order Book & CTCL Intelligence dashboard.
│ (Module 8)              │ Identifies security ORBITCEM with Spoof Ratio 54.2x.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Strategy ID Analysis │ Inspects Algo Strategy Leaderboard (`FTRD_BUY_ALGO_ID`).
│ (Module 8 Table)        │ Finds `ALGO0004` (HFT) has 142,500 pending bids but 99.1% Cancel Ratio.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Execution Depth Check│ Drills down into Trade Execution Explorer at match timestamp.
│ (Module 4 Depth)        │ Confirms large 50,000 share bids placed and cancelled within 20ms.
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Issue Suspension     │ Recommends immediate suspension of strategy `ALGO0004`
│ (Module 9/10 Action)    │ and flags Trading Member for algo check failure.
└─────────────────────────┘
```
