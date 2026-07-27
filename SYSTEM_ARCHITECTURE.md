# Market Conduct & Surveillance Platform — System Architecture Specification
**Document Version**: 1.0.0  
**Target Systems**: Teradata Data Warehouse (`FACT_TRADES`, `DIM_EXCH_CLNT_DTLS`, `DIM_DEP_CLNT_DTLS`) | FastAPI Backend | Next.js Enterprise Compliance Suite  

---

## 1. Overall System Architecture & Architectural Evaluation

### 1.1 Architectural Evaluation & Boundary Isolation
The surveillance platform uses a **Strictly Layered Boundary Pattern**. Database schemas and raw warehouse surrogate keys are completely isolated behind repository interfaces. Business services operate exclusively on domain entities, ensuring that switching underlying database engines (e.g. SQLite local dev to Teradata JDBC/ODBC production) requires **zero changes** to API schemas, domain models, or UI components.

### 1.2 Top-Level System Topology

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 15 SURVEILLANCE FRONTEND                         │
│   (App Router | Tailwind CSS | Recharts | React Query | Role-Based Nav)          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST / HTTPS (JSON)
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           FASTAPI SURVEILLANCE ENGINE                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ API ROUTER LAYER (Request Validation, Pydantic v2 Serialization, RBAC)     │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
│                                        │ Calls Domain Services                   │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐  │
│  │ SERVICE LAYER (Business Logic, Anomaly Algorithms, Domain Coordination)     │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
│                                        │ Interacts via Interfaces                │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐  │
│  │ REPOSITORY LAYER (Data Access, Query Compilation, Cache Invalidation)       │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
└────────────────────────────────────────┼─────────────────────────────────────────┘
                                         │ SQLAlchemy ORM / Connection Pool
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                      DATA WAREHOUSE / STORAGE LAYER                              │
│   [ SQLite (Local Dev / Test)  |  Teradata Data Warehouse (Production / ODBC) ]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layered Architecture & Component Ownership

```
[ UI Component Layer ]
       │
       ▼  (JSON Payloads / HTTP Status)
[ API Router Layer ] ──> Validates Request via Pydantic Schemas & Checks RBAC Tokens
       │
       ▼  (Domain DTOs & Command Queries)
[ Service Layer ]    ──> Orchestrates Anomaly Metrics, Calculations & Business Rules
       │
       ▼  (Entity Model Parameters)
[ Repository Layer ] ──> Compiles SQLAlchemy / ANSI SQL & Manages Transactions
       │
       ▼  (SQL Execution & Result Sets)
[ Database Engine ]  ──> Teradata SQL / SQLite DB
```

### Component Responsibilities & Boundaries

| Architecture Layer | Primary Responsibility | Input Boundary | Output Boundary | Forbidden Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **UI Component Layer** | Visual rendering, user interactions, chart animations, client-side state. | User Clicks, HTTP Responses | API Requests | **Must NOT** access SQL, ORM models, or raw warehouse surrogate tokens. |
| **API Router Layer** | HTTP verb mapping, parameter parsing, Pydantic validation, RBAC checks. | HTTP Requests | JSON Responses / HTTP Exceptions | **Must NOT** execute database queries directly or contain business calculations. |
| **Service Layer** | Domain workflows, score aggregation, anomaly logic, multi-repository coordination. | Business Parameters / DTOs | Domain Model Results | **Must NOT** depend on HTTP frameworks (FastAPI request objects) or raw database engines. |
| **Repository Layer** | Data access, ANSI SQL compilation, ORM mapping, connection lifecycle. | Repository Method Invocations | ORM Entities / Aggregates | **Must NOT** contain UI formatting or FastAPI HTTP exceptions. |
| **Database Engine** | Persistence, indexing, analytical window calculations, transactional integrity. | SQL Queries | Relational Tuple Sets | N/A |

---

## 3. Module Navigation & User Journey

The application enforces a **3-Click Investigation Journey**:
1. **Click 1 (Macro Assessment)**: Analyst reviews Executive Dashboard or Alert Triage Queue.
2. **Click 2 (Contextual Deep-Dive)**: Analyst clicks flagged security or participant to open Security Analytics or Participant Audit.
3. **Click 3 (Forensic Verification)**: Analyst drills down into Trade Execution Explorer or Client 360° Profile and attaches evidence to an Investigation Case.

```
                                  ┌──────────────────────────┐
                                  │   MODULE 1: DASHBOARD    │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │ Module 2: Alert Triage   │
                                  └────────────┬─────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               │                               │                               │
               ▼                               ▼                               ▼
  ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
  │ Module 3: Security Deep  │   │ Module 5: Participant    │   │ Module 7: Broker Conduct │
  └────────────┬─────────────┘   └────────────┬─────────────┘   └────────────┬─────────────┘
               │                               │                               │
               ▼                               ▼                               ▼
  ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
  │ Module 4: Trade Explorer │   │ Module 6: Client 360     │   │ Module 8: Order Book &   │
  └────────────┬─────────────┘   └────────────┬─────────────┘   │ CTCL Intelligence        │
               │                               │                └────────────┬─────────────┘
               └───────────────────────────────┼─────────────────────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │ Module 9: Case Workspace │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │ Module 10: Reports       │
                                  └──────────────────────────┘
```

---

## 4. Repository Ownership & Boundary Matrix

To prevent duplicated queries and tangled service calls, every Teradata table has a single owner repository:

```
[ FactTradesRepository ] ────────> Owns FACT_TRADES (FTRD)
[ DimExchClntRepository ] ───────> Owns DIM_EXCH_CLNT_DTLS (DECL)
[ DimDepClntRepository ] ────────> Owns DIM_DEP_CLNT_DTLS (DDCL)
[ ExternalFeedRepository ] ──────> Owns External Feeds (DS-02, DS-04, DS-05 Mocks)
```

- **Cross-Entity Queries**: Services coordinate calls across repositories. For instance, `ClientService` invokes `DimExchClntRepository.get_by_token()` and `DimDepClntRepository.get_by_clnt_token()` to build the unified Client 360° DTO. No repository directly imports another repository.
