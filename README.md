# AI Governance Platform

**End-to-end AI risk management — from use case intake to production monitoring.**

![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue) ![Tests](https://img.shields.io/badge/Tests-565%20passing-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-16.2-black) ![License](https://img.shields.io/badge/License-Private-lightgrey)

---

## What This Platform Does

This platform manages the full lifecycle of AI systems within an organization — from the moment someone proposes a new AI use case through production deployment, ongoing monitoring, and eventual retirement. It automates the risk classification process, routes each case through the appropriate level of governance review, and maintains a complete audit trail that can be presented to regulators, internal auditors, or risk committees.

The platform combines a structured intake process with automated risk scoring across seven dimensions, regulatory framework detection for 14 named frameworks (including the EU AI Act, GDPR, NIST AI RMF, and US financial regulations), and a compliance control library that tracks which evidence artifacts have been collected against which regulatory obligations. An AI coaching layer powered by a local LLM assists analysts during intake by checking consistency, suggesting values, and flagging potential gaps in real time.

For organizations managing AI model inventories, a dedicated Model Registry integrates with Hugging Face to pull live model metadata, benchmarks, and documentation, then runs an AI-powered governance analysis that produces a structured 11-section audit of each model's risk profile. The entire case record — risk scores, compliance status, evidence, exceptions, and timeline — can be exported as a formal 14-section audit report in Microsoft Word format, built to the quality standard of an SSAE 18 SOC 2 Type II report.

---

## Who It's For

- **Business Users** — Submit new AI use cases for governance review, track submission status, and respond to analyst feedback through an adaptive intake wizard.
- **AI Governance Analysts** — Triage incoming cases, confirm risk tiers, conduct pre-production assessments, approve or reject cases, and manage the exception register.
- **Risk Officers and Compliance Teams** — Review compliance control status across regulatory frameworks, monitor evidence collection completeness, and generate audit-ready reports.
- **Model Risk Officers** — Manage the AI model registry, review governance analyses, and track model cards with live data from Hugging Face.
- **Regulators and Auditors** — Review the governance timeline, evidence attestation chain, and exported risk assessment reports for examination readiness.
- **ML Engineers and Data Scientists** — Register models in the model registry, link them to use cases, and export professional model card PDFs.

---

## Platform Capabilities

### AI Use Case Intake

Four intake methods adapt to different user preferences and risk profiles. **Quick Register** captures 7 essential fields and routes low-risk cases directly to lightweight review. **Card Flip** presents one question at a time with 3D card animations. **Single Page** renders all questions on one scrollable form. **Full Guided Wizard** provides a multi-step flow with a live risk classification sidebar. All methods share the same 34-question intake schema with conditional branching — vendor-specific questions appear only when third-party involvement is indicated, foundation model details only when applicable. Auto-save fires every 2 seconds to prevent data loss.

### Automated Risk Classification

Every submission runs through a **7-dimension inherent risk scorer** (Decision Domain, Decision Authority, Affected Population, Data Sensitivity, AI Capability, Regulatory Exposure, Reversibility) that produces a composite score on a 0–100 scale mapped to a 5-tier classification (Low, Medium-Low, Medium, Medium-High, High). On top of the dimensional scoring, a **regulatory rules engine** with 9 named hard rules enforces minimum tiers for EU AI Act prohibited practices, GDPR automated decision-making, NYC Local Law 144, Colorado SB 24-205, NAIC insurance AI, SR 11-7 model risk, and HIPAA health data decisions. A **pattern detection engine** with 10 named confluence patterns identifies dangerous factor combinations — GenAI customer exposure (grounded vs unconstrained), cross-border sensitive data, vendor black-box + consequential decisions, shadow IT in production, agentic code execution, autonomous decisions at scale, IP exfiltration, and bias amplification. The **EU AI Act auto-classifier** maps cases to Prohibited, High Risk (Annex III), Limited Risk, or Minimal Risk with specific article citations.

### Four-Lane Review Routing

A Layer 1 intake router with **14 named rules** assigns every case to one of four governance lanes based on risk signals. **Lightweight** (default when no rules fire) routes to single-reviewer approval. **Standard** (customer data, customer content, AI agents, shadow AI, employee data, SR 11-7 pre-notify, customer PII) routes to triage and full assessment. **Enhanced** (financial decisions, employment decisions, health/biometric, autonomous, Annex III areas) routes to priority triage and committee review. **Blocked** (biometric + computer vision, or autonomous + financial decisions) halts the case until the governance team speaks with the submitter. Each fired rule is recorded on the case with regulatory tags for traceability.

### Pre-Production Risk Assessment

A **67-question assessment** across 8 sections (plus a review section) with section-level branching that adapts to the case's governance path and intake profile. Sections covering workplace monitoring, emerging AI risks, and third-party vendor assessment are auto-skipped when the intake answers make them irrelevant. Fields already captured at intake (customer-facing status, deployment regions, GenAI usage, vendor details, data classification) are pre-filled and hidden to avoid redundant data entry. The assessment produces a **7-dimension assessment scoring** (Regulatory & Compliance, Data Risk, Model/Technical Risk, Operational Risk, Fairness & Ethical Risk, Reputational & Strategic Risk, Third-Party/Supplier Risk) and an independent EU AI Act classification.

### AI Coaching Layer (Ollama)

An optional AI coaching integration powered by a local **Ollama** instance running the **qwen3:14b** model. During intake, the coaching layer provides three services: **business purpose analysis** that suggests how the AI system description could be strengthened, **value coaching** that highlights governance-relevant considerations for each field, and **consistency checking** that flags contradictions between answers. The coaching is toggled on/off per session and runs entirely locally — no data leaves the user's machine.

### Governance Analysis (AI-Powered)

For the Model Registry, an LLM-powered **governance analysis pipeline** produces a structured 11-section audit of each model: Intended Use, User & Stakeholder Impact, Risk Assessment (with per-category ratings for hallucination, bias, security, and misuse), Performance & Evaluation, Training Data Overview, Safety & Mitigations, Limitations, Operational Guidance, Compliance & Governance, Versioning & Change Log, and Open Gaps. Each section is generated with an auditor persona that explicitly marks unknowns as governance gaps rather than smoothing them over. The analysis includes a confidence score (0–100) and is cached on the model record for on-demand refresh.

### Residual Risk and Mitigation Tracking

The platform separates **inherent risk** (before controls) from **residual risk** (after mitigations). Seven mitigation evaluators — human oversight, bias audit, robustness testing, drift monitoring, incident response, risk management plan, and independent model validation — each earn 0–1.0 credit based on evidence quality. The human oversight evaluator recognizes structured design documentation: pre-decision review earns 1.0, post-decision review with documented SLA earns 0.4–0.6, and spot-check with escalation procedures earns 0.2. Total credit converts to tier reductions capped at 2 tiers, with a regulatory floor preventing mitigation below a minimum tier when regulatory-origin rules fired.

### Compliance Control Library

**31 named controls** across **10 regulatory frameworks**: EU AI Act (Articles 9, 10, 11, 12, 14, 15, 27, 50), GDPR (Articles 22, 35), NIST AI RMF 1.0, Federal Reserve SR 11-7, ISO/IEC 42001:2023, ECOA / Fair Housing, SEC / FINRA, Reg E / EFTA, FTC Act Section 5, and CFPB / OCC. Each control maps to acceptable evidence categories, a responsible role, and a refresh cadence. Per-case compliance completeness is computed as the percentage of mandatory controls with attested evidence on file.

### Evidence Collection and Attestation

**19 evidence categories** spanning model cards, dataset sheets, bias audits, robustness tests, DPIAs, FRIAs, risk management plans, technical documentation, human oversight design, monitoring plans, incident response plans, validation reports, security assessments, vendor DPAs/SLAs, training records, change logs, and signed attestations. Each artifact progresses through a lifecycle: uploaded → attested by a named individual with role and timestamp → or rejected with reason. Attested evidence automatically updates the residual risk computation and compliance control satisfaction in real time.

### Model Registry

A dedicated registry for tracking AI models used across the organization. Each model record captures provider, model type, version, license, hosting, approved regions, and data retention policy. **Hugging Face integration** pulls live metadata (parameters, context window, downloads, architecture, benchmarks, model card markdown, file listing) from the Hugging Face Hub API. An AI-powered governance analysis runs the LLM against the model's metadata and linked use cases to produce a structured 11-section audit. Models can be exported as professional governance-grade PDF model cards.

### Exception and Waiver Management

Formally-tracked deviations from policy with six reason categories (business critical, regulatory uncertainty, technical infeasibility, temporary workaround, inherited risk, other). Every exception requires a named approver with role, business justification, compensating controls, and an explicit expiry date. The **Exception Register** page shows active, expired, and revoked exceptions with expiry countdowns. Expired exceptions are automatically swept on page load.

### ServiceNow Integration

A mock integration layer structured for production replacement. The client exposes `createRecord`, `updateRecord`, `getRecord`, and `queryRecords` methods against the ServiceNow Table API. Field mapping between the platform's data model and ServiceNow's `u_ai_use_case` table is config-driven.

### Professional Report Export

A **14-section audit report** exportable as Microsoft Word (.docx) from any case detail page. Report structure follows SSAE 18 SOC 2 Type II quality standards: cover page, executive summary, system description, risk classification, regulatory scope, pre-production assessment, residual risk with mitigation breakdown, compliance control status, evidence record, exceptions, human oversight design, periodic review schedule, governance timeline, intake questionnaire (Appendix A), and regulatory citations (Appendix B). PDF export is planned.

### Review Workflows

**Lightweight review** provides a single-reviewer checklist: verify intake accuracy, confirm basic controls, capture escalation contact, and make a 4-option decision (approve, changes requested, escalate, reject). **Decision review** (post-assessment) provides inline approve/reject/escalate buttons on the case detail page with required decision notes. All decisions are recorded on the case timeline with actor identity.

### Lifecycle Management

**Decommissioning** supports immediate and scheduled modes with 5 reason categories (operational, regulatory, replaced, retired, other). **Periodic review scheduling** computes cadence from the confirmed risk tier: High → monthly, Medium-High → quarterly, Medium → semi-annual, Medium-Low and Low → annual. The confirmed tier acts as a cadence floor.

### Roadmap and Audit Tracking

The **Roadmap page** visualizes the platform's development across four phases with completion status for each feature. The **Audit page** provides a read-only view of governance decisions and platform changes for compliance officers.

---

## Screenshots

| View | Screenshot |
|---|---|
| Home / Dashboard | ![Home Dashboard](docs/screenshots/home-dashboard.png) |
| AI Use Case Intake — Method Chooser | ![Intake Methods](docs/screenshots/intake-method-chooser.png) |
| Full Guided Wizard with AI Coaching Sidebar | ![Guided Wizard](docs/screenshots/full-guided-wizard.png) |
| AI Use Case Inventory Table | ![Inventory Table](docs/screenshots/inventory-table.png) |
| Inventory Detail — Overview Tab | ![Case Detail](docs/screenshots/inventory-detail-overview.png) |
| Triage Decision Page | ![Triage](docs/screenshots/triage-decision.png) |
| Pre-Production Assessment | ![Assessment](docs/screenshots/pre-production-assessment.png) |
| Compliance Control Checklist | ![Compliance](docs/screenshots/compliance-checklist.png) |
| Evidence Upload and Attestation | ![Evidence](docs/screenshots/evidence-attestation.png) |
| Model Registry | ![Models](docs/screenshots/model-registry.png) |
| Model Card with Governance Analysis | ![Model Card](docs/screenshots/model-card-governance.png) |
| Exception Register | ![Exceptions](docs/screenshots/exception-register.png) |
| Risk Assessment Report Export Modal | ![Export](docs/screenshots/report-export-modal.png) |
| AI Governance Workflow Map | ![Process Map](docs/screenshots/process-workflow-map.png) |
| Roadmap | ![Roadmap](docs/screenshots/roadmap.png) |

---

## Regulatory Framework Coverage

| Framework | Scope | Named Controls |
|---|---|---|
| EU AI Act | Articles 9 (Risk Management), 10 (Data Governance), 11 (Technical Documentation), 12 (Record-Keeping), 14 (Human Oversight), 15 (Accuracy/Robustness), 27 (FRIA), 50 (Transparency) | 8 |
| GDPR | Article 22 (Automated Decision-Making), Article 35 (DPIA) | 2 |
| NIST AI RMF 1.0 | GOVERN 1.1, MAP 1.1, MEASURE 2.7, MEASURE 2.11, MANAGE 4.1 | 5 |
| Federal Reserve SR 11-7 | Model Validation, Ongoing Performance Monitoring | 2 |
| ISO/IEC 42001:2023 | Clause 6.1.2 (Risk Assessment), Clause 8.3 (Impact Assessment) | 2 |
| ECOA / Fair Housing Act | Disparate Impact Testing, Adverse Action Notice | 2 |
| SEC / FINRA | Suitability and Best Interest, Books and Records | 2 |
| Reg E / EFTA | Error Resolution Procedures, Unauthorized Transfer Liability | 2 |
| FTC Act Section 5 | Deceptive Practices, Unfairness Prevention | 2 |
| CFPB / OCC | Model Risk, Fair Lending, Proxy Variable Testing, Adverse Action Explainability | 4 |

**Total: 31 named controls across 10 frameworks**

---

## Integration Overview

| Integration | Purpose | Status |
|---|---|---|
| Ollama (local LLM) | AI coaching during intake, governance analysis for models | Active |
| Hugging Face Hub | Model card import, metadata sync, benchmark data | Active |
| ServiceNow | Use case sync and workflow integration | Mock (production-ready interface) |
| Word (.docx) Export | 14-section audit report generation | Active |
| PDF Export | Report generation | Planned (returns 501) |

---

## Architecture

Built on **Next.js 16.2** (App Router with Turbopack), **TypeScript** in strict mode, **Zustand** for client-side state with localStorage persistence, **Zod** for schema validation, **Biome** for linting and formatting, and **Vitest** for testing. Pure functions are used for all classification logic, risk scoring, and compliance evaluation. The `docx` library generates Word reports server-side. `@react-pdf/renderer` generates model card PDFs client-side.

```
src/
├── app/                # Next.js App Router pages and API routes
├── components/         # React components organized by domain
│   ├── case/           # Comment thread
│   ├── export/         # Report export modal
│   ├── governance/     # Evidence, compliance, exceptions, residual risk UI
│   ├── inventory/      # Inventory table
│   ├── layout/         # App shell, sidebar, session gate
│   ├── models/         # Model cards, PDF export, HuggingFace markdown
│   ├── ui/             # Shared primitives (Button, Input, Select, ProgressBar)
│   └── wizard/         # Intake wizard components (cards, quick register, full form)
├── config/             # Question registry (101 questions) and seed model data
├── lib/
│   ├── ai/             # Ollama client (qwen3:14b) and coaching prompts
│   ├── assessment/     # Section visibility rules and intake-to-assessment derivation
│   ├── classification/ # Intake router (14 rules), 7-dim scorer, EU AI Act determination
│   ├── export/         # Report data assembly and Word document generator
│   ├── governance/     # Residual risk, control library, evidence completeness, exceptions
│   ├── governance-analysis/ # LLM-powered model governance audit (11 sections)
│   ├── hooks/          # useActor session identity hook
│   ├── integrations/   # Hugging Face Hub client and parser
│   ├── inventory/      # Display formatting utilities
│   ├── lifecycle/      # Decommission logic (immediate + scheduled)
│   ├── questions/      # Intake and assessment Zod schemas and branching rules
│   ├── risk/           # 7-dimension inherent risk engine, rules, patterns, frameworks
│   ├── servicenow/     # ServiceNow Table API client and field mapping
│   ├── store/          # 6 Zustand stores (inventory, assessment, wizard, models, session, AI)
│   ├── triage/         # Triage actions, lightweight review, override analytics
│   └── wizard/         # Card deck builder and Layer 1 field mapper
└── types/              # TypeScript type definitions
```

---

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

For AI coaching features, Ollama must be running locally with the qwen3:14b model:

```bash
ollama pull qwen3:14b
ollama serve
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | No | Ollama API endpoint (defaults to `http://localhost:11434`) |
| `OLLAMA_MODEL` | No | LLM model for AI coaching (defaults to `qwen3:14b`) |
| `HUGGINGFACE_HUB_TOKEN` | No | Hugging Face API token for accessing gated models |

---

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm test` | Run Vitest test suite |
| `npm run check` | Lint (Biome) + type-check (tsc) + test (Vitest) |
| `npm run lint` | Run Biome linter |
| `npm run format` | Format with Biome |

---

## Test Coverage

25 test files across 14 test directories:

| Directory | Coverage |
|---|---|
| `tests/classification/` | Intake router, EU AI Act assessment, intake classifier, 7-dimension scoring |
| `tests/risk/` | Inherent risk end-to-end with fixtures (retirement chatbot, shadow IT, fraud detection) |
| `tests/governance/` | Residual risk, review schedule, evidence completeness, exceptions, controls library |
| `tests/governance-analysis/` | Governance analysis parser and fallback handling |
| `tests/triage/` | Triage actions, lightweight review, override analytics |
| `tests/wizard/` | Branching rules, consistency warnings, card deck builder |
| `tests/assessment/` | Section visibility and intake-to-assessment derivation |
| `tests/export/` | Report data assembly with fallback handling |
| `tests/inventory/` | Owner name parsing and display formatting |
| `tests/integrations/` | Hugging Face parser |
| `tests/lifecycle/` | Decommission logic |
| `tests/intake/` | Unified submit pipeline |

---

## Contributing

### Adding an intake question

1. Add the question definition to `src/config/questions.ts` with a unique ID, field name, label, help text, and options (if applicable). Set `form: 'intake'` and assign it to the correct stage.
2. Add the field to the Zod schema in `src/lib/questions/intake-schema.ts` with appropriate validation.
3. If the question should only appear conditionally, add a branching rule in `src/lib/questions/branching-rules.ts`.

### Adding a compliance control

1. Open `src/lib/governance/controls.ts` and add a new control object to the appropriate framework array. Each control requires: `id`, `framework`, `citation`, `title`, `requirement`, `acceptableEvidence`, `responsibleRole`, `refreshFrequency`, and `severity`.
2. If the control belongs to a new framework, create a new array and add it to `CONTROLS_LIBRARY`.

### Adding a risk pattern

1. Open `src/lib/risk/patterns.ts` and define a new pattern function that takes `InherentRiskInput` and returns a `FiredPattern` or `null`.
2. Add the function to the `ALL_PATTERNS` array at the bottom of the file.
3. Add a test case in `tests/risk/inherent-risk.test.ts`.

---

## Roadmap

| Completed | In Progress | Planned |
|---|---|---|
| 4-method adaptive intake wizard | Persistent database (Postgres) | Executive portfolio dashboards |
| 7-dimension inherent risk scoring | Authentication and RBAC | Vendor risk management registry |
| 14-rule four-lane review routing | Multi-stage approval workflow | Bias and fairness testing integration |
| EU AI Act auto-classification | Server-persisted audit trail | Production monitoring connectors |
| Pre-production assessment (67 questions) | | MLOps pipeline integration |
| Residual risk with 7 mitigations | | Data catalog integration |
| 31-control compliance library | | Incident management workflow |
| Evidence collection and attestation | | PDF report export |
| Model registry with HuggingFace sync | | |
| AI coaching (Ollama) | | |
| ServiceNow mock integration | | |
| Word report export (14 sections) | | |
| Exception and waiver management | | |
| Periodic review scheduling | | |
| Lifecycle decommissioning | | |
| Session-based persona system | | |

---

## License

Private — internal use only.
