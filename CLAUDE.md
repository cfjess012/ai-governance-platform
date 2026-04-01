# AI Governance Platform POC

Next.js 14 App Router + TypeScript. Local-first POC for AI use case intake and risk assessment. Will integrate with ServiceNow IRM and AWS.

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run check` — lint (biome) + type-check (tsc) + test (vitest)
- `npm test` — vitest run
- `npm run lint` — biome check
- `npm run format` — biome format

## Code Conventions

- TypeScript strict mode. No `any` — use `unknown` and narrow.
- Server components by default; `'use client'` only for forms, state, event handlers.
- Zod schemas are the single source of truth for validation. Infer types: `z.infer<typeof schema>`.
- API routes return `{ data: T } | { error: string }`.
- Classification logic is pure functions, no side effects — independently testable.
- Question definitions live in `src/config/questions.ts` as a typed registry.
- Zustand for client-side wizard state; no prop drilling through wizard steps.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.
- Feature branches off `main`. No direct commits to `main`.

## Key Paths

- Domain knowledge: `.claude/skills/ai-governance-domain/references/`
- Question schemas: `src/lib/questions/`
- Classification engines: `src/lib/classification/`
- Architecture decisions: `docs/ARCHITECTURE.md`
- Question registry: `src/config/questions.ts`
- Scoring weights: `src/config/scoring-weights.ts`

## Testing

- Every classification rule needs a test. Every branching rule needs a test.
- Vitest + `@testing-library/react` for component tests.
- Classification logic = pure unit tests, no mocking needed.
- Run `npm run check` before committing.

## Architecture Notes

- Intake wizard: ~17 questions, adaptive based on Solution Type.
- Pre-prod assessment: ~59 questions across 6 sections, conditional display.
- Auto-classification: EU AI Act risk tiers + internal Agent Tier framework.
- Risk scoring: transparent, with score explanations.
- ServiceNow integration: mock layer for POC, config-driven field mapping.
