# Intake Questions (Q1–Q17)

See `src/config/questions.ts` for the authoritative question definitions.

## Core Questions (All Solution Types): Q1-Q12, Q15, Q17
## Conditional: Q6 (hidden for Research), Q13-Q14 (Vendor only), Q16 (Agent only)

| ID | Field | Type | Required | Section | Condition |
|----|-------|------|----------|---------|-----------|
| Q1 | useCaseName | text | Yes | Basic Info | — |
| Q2 | useCaseDescription | textarea | Yes | Basic Info | — |
| Q3 | solutionType | select | Yes | Basic Info | — |
| Q4 | businessUnit | select | Yes | Ownership | — |
| Q5 | useCaseOwner | text | Yes | Ownership | — |
| Q6 | technicalLead | text | Yes | Ownership | solutionType !== 'research' |
| Q7 | primaryBusinessActivity | select | Yes | Context | — |
| Q8 | dataTypes | multiselect | Yes | Data | — |
| Q9 | geographicScope | multiselect | Yes | Data | — |
| Q10 | decisionsAboutIndividuals | select | Yes | Impact | — |
| Q11 | expectedUserBase | select | Yes | Impact | — |
| Q12 | targetProductionDate | date | Yes | Timeline | — |
| Q13 | vendorName | text | Yes | Vendor | solutionType in [external, embedded] |
| Q14 | vendorContact | text | Yes | Vendor | solutionType in [external, embedded] |
| Q15 | hasAgentCapabilities | boolean | Yes | Agent | — |
| Q16 | agentAutonomyLevel | select | Yes | Agent | hasAgentCapabilities === true |
| Q17 | additionalContext | textarea | No | Additional | — |
