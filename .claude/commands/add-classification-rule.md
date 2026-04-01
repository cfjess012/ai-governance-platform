---
name: add-classification-rule
description: Add a new auto-classification rule
argument-hint: "[eu-ai-act|agent-tier] [rule-description]"
---

Add a classification rule (TDD):

1. Add test case FIRST in `tests/classification/`
2. Implement rule in `src/lib/classification/`
3. Update reference doc in `.claude/skills/ai-governance-domain/references/`
4. Run `npm run check`

Rule to add: $ARGUMENTS
