# Piccos

Business management for grooming & beauty businesses. V1 starts with barber shops:
help an owner know exactly what is happening in their business.

## Stack

- **Frontend:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Hosting:** Vercel
- **AI (M12+):** Claude API, via a server-side retrieval layer — the model never gets
  direct database access.

## Project structure

```
app/                  Routes (App Router)
lib/supabase/
  client.ts           Browser Supabase client
  server.ts           Server Component / Route Handler Supabase client
  middleware.ts        Session-refresh helper used by root middleware.ts
middleware.ts          Refreshes the Supabase session on every request
types/database.ts      Supabase-generated DB types (stub until schema exists, M2)
```

## Local setup

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's
   URL and anon key (Project Settings → API in the Supabase dashboard).
2. `npm install`
3. `npm run dev` — runs at http://localhost:3000

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It is server-only,
never referenced from client components, and only needed once server-side
admin operations exist.

## Security principles

- Every business-owned table is isolated by PostgreSQL RLS — never trust a
  client-supplied business ID for authorization.
- Role checks (Owner / Secretary / Barber) live on the server/database path,
  not just in the UI.
- Financial records are never silently overwritten — corrections preserve the
  original event plus who/when/what/why.

## Roadmap

This repo builds V1 only (auth, shop setup, staff, stations, services,
transactions, expenses, materials, dashboard, reports, permissions, audit
trail, Ask Piccos). Operations, Academy, Talent, Find, and Market are later
versions — not implemented here.
