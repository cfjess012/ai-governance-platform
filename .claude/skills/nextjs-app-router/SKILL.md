---
name: nextjs-app-router
description: "Next.js 14+ App Router conventions for server/client components, route handlers, layouts, loading states, and error boundaries. Use when creating pages, layouts, API routes, or deciding between server and client components."
---

# Next.js App Router Patterns

## Server vs Client
- **Server** (default): data fetching, backend resources, static content
- **Client** (`'use client'`): hooks, event handlers, browser APIs, forms, Zustand

## Route Handlers
`src/app/api/*/route.ts` — export async POST/GET functions. Always return `{ data: T } | { error: string }`.

## File Conventions
- `page.tsx` — Route UI
- `layout.tsx` — Shared layout
- `loading.tsx` — Suspense boundary
- `error.tsx` — Error boundary (client component)
- `route.ts` — API route handler

## Dynamic Routes
`[step]/page.tsx` — access via `params.step`
