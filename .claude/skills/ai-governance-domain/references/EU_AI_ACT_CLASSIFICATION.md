# EU AI Act Risk Tier Classification

See `src/lib/classification/eu-ai-act.ts` for implementation.

## Tiers: Prohibited > High > Limited > Minimal

### Prohibited Triggers
- Biometric + HR + automated decisions in EU
- Unrestricted autonomous agents in EU

### High Risk Triggers
- High-risk activities (underwriting, claims, fraud, HR) + decisions about individuals in EU
- Sensitive data (PII, PHI, biometric, financial) + automated decisions in EU
- Compliance + automated decisions in EU

### Limited Risk Triggers
- External-facing AI systems in EU

### Minimal
- Everything else (including non-EU, which is informational only)
