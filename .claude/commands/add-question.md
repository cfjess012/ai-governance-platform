---
name: add-question
description: Add a new question to the intake or pre-prod wizard
argument-hint: "[intake|preprod] [question-description]"
---

Add a new question to the wizard:

1. Determine which form (intake or pre-prod) and section
2. Add question definition to `src/config/questions.ts`
3. Add Zod schema field to `src/lib/questions/intake-schema.ts` or `preprod-schema.ts`
4. Add branching rules to `src/lib/questions/branching-rules.ts` if conditional
5. Add ServiceNow field mapping to `src/lib/servicenow/field-mapping.ts`
6. Update reference doc in `.claude/skills/ai-governance-domain/references/`
7. Add test for new branching logic in `tests/wizard/branching-rules.test.ts`
8. Run `npm run check`

Question to add: $ARGUMENTS
