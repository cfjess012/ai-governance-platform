# AI Governance Platform

Adaptive wizard for AI use case intake and pre-production risk assessment. Auto-classifies against EU AI Act risk tiers and an internal Agent Tier framework. Generates transparent risk scores with explanations.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture documentation.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run check` | Lint + type-check + test |
| `npm test` | Run tests |
| `npm run lint` | Run Biome linter |
| `npm run format` | Format with Biome |

## Adding a New Question

Use the Claude Code command: `/add-question [intake|preprod] [description]`

This walks through all required changes: question definition, Zod schema, branching rules, ServiceNow mapping, docs, and tests.

## Project Structure

- `src/config/questions.ts` — Question registry (single source of truth)
- `src/lib/classification/` — EU AI Act and Agent Tier classifiers
- `src/lib/questions/` — Zod schemas and branching rules
- `src/lib/servicenow/` — ServiceNow client and field mapping
- `src/components/wizard/` — Wizard UI components
- `.claude/skills/ai-governance-domain/references/` — Domain reference docs
