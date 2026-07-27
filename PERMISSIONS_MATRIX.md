# Market Conduct & Surveillance Platform — Role-Based Access Control (RBAC) Matrix
**Document Version**: 1.0.0  

---

## 1. Role Definitions

| Role Code | Role Name | Primary Responsibility |
| :--- | :--- | :--- |
| `ROLE_ANALYST` | **Surveillance Analyst** | Triage daily alerts, review scrip charts, update alert notes. |
| `ROLE_SUPERVISOR` | **Surveillance Supervisor** | Macro dashboard, score weight tuning, escalation approval, analyst assignment. |
| `ROLE_INVESTIGATOR`| **Investigation Officer** | Forensic case management, entity collusion inspection, regulatory dossier creation. |
| `ROLE_MEMBER_SUP` | **Member Supervision Officer**| Trading Member audit, terminal location checks, code alteration reviews. |
| `ROLE_ALGO_SPEC` | **HFT & Algo Specialist** | Order book depth analysis, spoofing detection, algo strategy audits. |
| `ROLE_ADMIN` | **System Administrator** | User management, EOD batch execution, system health monitoring. |

---

## 2. Global Module Access Matrix

*Legend*: `[F]` = Full Control (Create, Read, Update, Delete, Export), `[V]` = View Only, `[E]` = Edit / Action Permission, `[X]` = No Access.

| Module | `ANALYST` | `SUPERVISOR` | `INVESTIGATOR` | `MEMBER_SUP` | `ALGO_SPEC` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Module 1: Dashboard** | **V** | **F** | **V** | **V** | **V** | **F** |
| **Module 2: Alert Management** | **E** | **F** | **V** | **V** | **V** | **F** |
| **Module 3: Security Analytics** | **V** | **V** | **V** | **V** | **V** | **V** |
| **Module 4: Trade Explorer** | **V** | **V** | **V** | **V** | **V** | **V** |
| **Module 5: Participant Audit** | **V** | **V** | **F** | **V** | **O** | **V** |
| **Module 6: Client 360° Profile** | **V** | **V** | **F** | **V** | **X** | **V** |
| **Module 7: Broker Conduct** | **X** | **V** | **V** | **F** | **X** | **V** |
| **Module 8: Order Book & CTCL** | **O** | **V** | **V** | **O** | **F** | **V** |
| **Module 9: Case Workspace** | **X** | **V** | **F** | **X** | **X** | **F** |
| **Module 10: Compliance Exports**| **X** | **F** | **F** | **F** | **X** | **F** |

---

## 3. Data Sensitivity & PII Masking Rules

| User Role | PAN Masking Rule | Mobile / Email Masking Rule | Bank Account Masking Rule |
| :--- | :--- | :--- | :--- |
| `ROLE_ANALYST` | Masked: `XXXXX1234F` | Masked: `+91 98200*****` | Masked: `HDFC - ****4501` |
| `ROLE_SUPERVISOR` | Full Unmasked | Full Unmasked | Full Unmasked |
| `ROLE_INVESTIGATOR` | Full Unmasked | Full Unmasked | Full Unmasked |
| `ROLE_MEMBER_SUP` | Masked | Masked | Masked |
| `ROLE_ALGO_SPEC` | Masked | Masked | Masked |
| `ROLE_ADMIN` | Masked | Masked | Masked |
