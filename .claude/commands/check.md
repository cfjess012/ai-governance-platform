---
name: check
description: Run lint, type-check, and tests
disable-model-invocation: true
---

npx biome check ./src && npx tsc --noEmit && npx vitest run
