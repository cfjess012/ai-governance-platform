---
name: form-wizard
description: "Multi-step form wizard patterns using React Hook Form, Zod validation, and Zustand state management. Use when building wizard steps, form components, validation schemas, or conditional field logic."
---

# Form Wizard Patterns

## Architecture
1. **Question Registry** (`src/config/questions.ts`) — Single source of truth
2. **Zod Schemas** (`src/lib/questions/`) — Validation from question definitions
3. **Wizard State** (`src/lib/store/wizard-store.ts`) — Zustand store for cross-step persistence

## Key Patterns
- Per-step validation with React Hook Form + Zod
- Branching rules engine: `(allAnswers) => Set<visibleQuestionIds>`
- Auto-save debounced at 2s, immediate on step navigation
- Progress = answered visible questions / total visible questions

## Component Hierarchy
WizardShell > ProgressBar + WizardStep > QuestionRenderer > ConditionalField

## Adding a Question
1. Add to `src/config/questions.ts`
2. Add Zod field to schema
3. Add branching rule if conditional
4. Update ServiceNow field mapping
5. Test branching logic
