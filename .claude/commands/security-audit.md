# Security Audit

Perform a repeatable security audit of this Next.js AI governance platform. Do not fix anything — produce a prioritized findings report only.

## Scope

Read these files before starting:

- src/app/api/ai/analyze/route.ts
- src/app/api/assessment/submit/route.ts
- src/app/api/export/report/route.ts
- src/app/api/intake/save-draft/route.ts
- src/app/api/intake/submit/route.ts
- src/app/api/integrations/huggingface/[...slug]/route.ts
- src/app/api/models/[id]/governance-analysis/route.ts
- src/app/api/models/[id]/route.ts
- src/app/api/models/route.ts
- src/app/api/servicenow/sync/route.ts
- src/lib/ai/ollama-client.ts
- src/lib/db/client.ts
- src/lib/servicenow/client.ts
- src/lib/integrations/huggingface/client.ts
- src/lib/store/inventory-store.ts
- src/lib/store/session-store.ts
- src/lib/store/wizard-store.ts
- src/components/layout/SessionGate.tsx
- src/app/login/page.tsx
- src/lib/hooks/use-actor.ts
- package.json

## Audit Categories

**1. Authentication and Authorization**
- Is there real authentication or just a session gate that can be bypassed?
- Are API routes protected against unauthenticated requests?
- Is there role-based access control?
- Can a user access or modify another user's data by manipulating IDs in the URL?

**2. API Route Security**
- Are any API routes missing input validation?
- Are there unvalidated query parameters or body fields reaching business logic?
- Is the HuggingFace proxy route open to arbitrary requests?
- Are error messages leaking stack traces or implementation details to the client?
- Are there routes with no rate limiting that could be abused?

**3. Data Storage and Exposure**
- What sensitive data is stored in localStorage without encryption?
- Is any PII or case data exposed in client-side bundles or API responses?
- Are there hardcoded credentials, API keys, or secrets anywhere in the code?
- Are environment variables handled correctly — server-only vars never exposed to the client?

**4. Input Validation and Injection**
- Are user inputs validated and sanitized before use?
- Is there any risk of prompt injection through user-supplied content reaching the Ollama or governance analysis prompts?
- Are there any unvalidated inputs reaching the ServiceNow or HuggingFace clients?

**5. Dependency Vulnerabilities**
- Run `npm audit --audit-level=high` and report all high and critical findings.
- Run `npx snyk test --severity-threshold=high` and report any CVEs found with CVE ID, affected package, severity, and whether a fix is available.
- For any CVE found, note whether it is exploitable given this platform's specific usage of the affected package.

**6. Data Privacy**
- Is PII handled correctly given the platform processes financial services customer data?
- Is any case data, intake answers, or assessment responses logged in a way that could expose sensitive information?
- Is the conversation/comment thread storing data that should be protected?

## Output Format

Produce a findings report in this format:

### Finding [N] — [Title]
- **Severity:** Critical | High | Medium | Low
- **Category:** [from audit categories above]
- **File(s):** [specific file and line if applicable]
- **Description:** What the vulnerability is and why it matters
- **Risk:** What an attacker or unauthorized user could do
- **Recommended Fix:** What needs to change

End with a summary table:

| # | Title | Severity | Category | Status |
|---|---|---|---|---|
| 1 | ... | Critical | Auth | Open |

And a one-paragraph overall security posture assessment appropriate for a financial services AI governance platform.