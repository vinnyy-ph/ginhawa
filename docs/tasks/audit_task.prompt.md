# /ginhawa-spec-audit — Full Project Audit (Read-Only)

## Objective
Perform a comprehensive, **read-only** sanity check and audit of the entire telehealth application.
Cross-reference all code against `@docs/SPECS.md` to verify alignment with project specifications.
**DO NOT modify, add, or delete any code under any circumstances.**

---

## Scope

### Frontend (`@frontend/`)
Audit every page and UI component:

- **Page Accessibility** — Confirm every defined page/route is reachable (directly or via navigation)
- **Navigation Flows** — For each page, verify all buttons, links, and triggers correctly navigate to their intended targets (e.g., Page A → Page B)
- **UI Functionality** — Audit all interactive elements: buttons, forms, modals, dropdowns, inputs — check if they are wired to the correct handlers
- **Spec Alignment** — Verify that each frontend feature, page, and user flow matches the requirements in `@docs/SPECS.md`
- **Demo Readiness** — Flag any broken routes, missing pages, dead-end navigations, or UI states that would fail during a demo
- **Page Reachability** — Audit all pages to ensure they are reachable (directly or via navigation)
- **Wired Pages** — Make sure all pages are properly wired and functional and can be reached (directly or via navigation) from the dashboard (for patients and for doctors) or from the landing page (for non-logged in users)

### Backend (`@backend/`)
Audit all server-side logic:

- **Authentication & Authorization** — Verify auth flows (login, logout, token handling, session management, role-based access) are correctly implemented
- **API Endpoints** — Check all endpoints for correctness: proper HTTP methods, request validation, response structure, error handling
- **Business Logic** — Confirm all core logic matches specifications in `@docs/SPECS.md`
- **Data Flows** — Trace data from request intake to response output; verify integrity and correctness
- **Security Checks** — Look for obvious vulnerabilities: unprotected routes, missing input sanitization, exposed credentials
- **Demo Readiness** — Identify anything that would cause failures or errors during a live demo

### Cross-Cutting Concerns
- **Frontend ↔ Backend Integration** — Confirm API calls from the frontend correctly map to backend endpoints (correct URLs, methods, payloads, and expected responses)
- **Spec Compliance** — Flag any deviations, missing features, or unimplemented requirements compared to `@docs/SPECS.md`

---

## Deliverables

Generate a structured audit report and save it to:
telehealth-app/docs/audits/project_audit_[YYYY-MM-DD_HHMMSS].md


### Report Structure

```markdown
# Project Audit Report
**Date:** [timestamp]
**Auditor:** AI Agent
**Spec Reference:** docs/SPECS.md

***

## Executive Summary
[Brief pass/fail overview]

## Frontend Audit
### Page Coverage
### Navigation & Button Flows
### UI Functionality
### Spec Alignment
### Demo Readiness Issues

## Backend Audit
### Authentication & Authorization
### API Endpoints
### Business Logic
### Data Flows
### Security
### Demo Readiness Issues

## Integration Audit
### Frontend ↔ Backend Mapping
### Spec Deviations

## Critical Issues (Demo Blockers)
## Warnings (Non-blocking)
## Passed Checks
```

---

## Rules
- **STRICTLY READ-ONLY.** Do not write, edit, refactor, or delete any code.
- Scan the **entire** project — every file in both `@frontend/` and `@backend/`.
- Report findings factually; do not suggest fixes inline (recommendations only in the report).
- If a spec item has no corresponding implementation, flag it as **MISSING**.
- If an implementation has no corresponding spec, flag it as **UNDOCUMENTED**.