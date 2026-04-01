---
name: ai-governance-domain
description: "Provides domain knowledge for the AI Governance Platform including intake questions, pre-production risk assessment questions, EU AI Act classification rules, Agent Tier framework, and risk scoring logic. Use when building or modifying form questions, classification engines, scoring logic, or ServiceNow field mappings."
---

# AI Governance Domain Knowledge

## Two-Phase Process

1. **Intake** — Initial registration (~17 questions). Adapts based on Solution Type.
2. **Pre-Production Assessment** — Deeper risk evaluation (~59 questions, 6 sections). Conditional on intake answers.

## Roles
- **Use Case Owner** — Business owner, submits intake
- **Technical Lead** — Engineering lead, answers technical questions
- **Vendor** — External vendor contact for third-party solutions
- **AI Champion** — Departmental liaison, reviews submissions
- **ERAI Analyst** — Central governance team, reviews classifications

## Solution Types
- Externally Developed (Third-Party/Vendor)
- Internally Developed
- Research/Experimental
- Embedded AI (within existing vendor product)

## Auto-Classification
Two independent systems: EU AI Act Risk Tier (Prohibited/High/Limited/Minimal) and Agent Tier (Low/Medium/High/Prohibited).

## Risk Scoring
Inherent risk score (0–100) from weighted factors. See references/ for full details.

## Reference Files
- `references/INTAKE_QUESTIONS.md` — 17 intake questions with types, options, conditions
- `references/PREPROD_QUESTIONS.md` — 59 pre-prod questions by section
- `references/EU_AI_ACT_CLASSIFICATION.md` — EU AI Act classification rules
- `references/AGENT_TIERS.md` — Agent Tier framework
- `references/SCORING_LOGIC.md` — Scoring weights and thresholds
