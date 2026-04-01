# Architecture

## Overview

The AI Governance Platform is a Next.js 14 application using the App Router. It provides an adaptive wizard for AI use case intake and pre-production risk assessment, with auto-classification against EU AI Act risk tiers and an internal Agent Tier framework.

## Component Architecture

```
┌──────────────────────────────────────────────┐
│                  Next.js App                   │
├──────────────────────────────────────────────┤
│  Pages (Server Components)                     │
│  ├── Landing / Dashboard                       │
│  ├── Intake Wizard (Client)                    │
│  ├── Assessment Wizard (Client)                │
│  └── Role-Based Dashboards                     │
├──────────────────────────────────────────────┤
│  API Routes                                    │
│  ├── /api/intake/save-draft                    │
│  ├── /api/intake/submit                        │
│  ├── /api/assessment/submit                    │
│  ├── /api/classify                             │
│  └── /api/servicenow/sync                      │
├──────────────────────────────────────────────┤
│  Core Libraries                                │
│  ├── Classification (EU AI Act + Agent Tier)   │
│  ├── Risk Scoring                              │
│  ├── Question Registry + Branching Rules       │
│  └── ServiceNow Client (Mock → Real)           │
├──────────────────────────────────────────────┤
│  Data Layer                                    │
│  ├── Zustand (Client State)                    │
│  └── DynamoDB / In-Memory (Server State)       │
└──────────────────────────────────────────────┘
```

## Data Flow

1. User enters intake wizard
2. Questions adapt based on Solution Type selection
3. Answers flow to Zustand store → auto-saved via API
4. Classification engine runs in real-time on client
5. On submit: server validates, scores, classifies, stores
6. Sync to ServiceNow (mock for POC)
7. Dashboard shows submitted use cases with risk scores

## Key Design Decisions

- **Question Registry Pattern**: All questions defined in a single registry (`src/config/questions.ts`) with metadata. Components render from this registry — no hardcoded questions in components.
- **Pure Classification Functions**: Classification logic is pure functions for testability. No side effects, no API calls — just data in, classification out.
- **Mock-First ServiceNow**: The ServiceNow client is an interface with a mock implementation. Swap to real client by changing the factory function.
- **Config-Driven Field Mapping**: ServiceNow field mapping is configuration, not code. Add a mapping entry to connect a form field to a ServiceNow field.
