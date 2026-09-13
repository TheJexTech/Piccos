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

## Deployment (Vercel)

1. Push this repo to a GitHub repository (not done automatically — this repo
   currently has no remote configured).
2. Import the repo into a new Vercel project.
3. In the Vercel project's Environment Variables, set: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (the production
   domain, e.g. `https://piccos.app`), `ANTHROPIC_API_KEY`. Leave
   `SUPABASE_SERVICE_ROLE_KEY` unset unless a server-only admin operation
   that must bypass RLS is added later — nothing in the app currently reads it.
4. In the Supabase dashboard (Authentication → URL Configuration), set **Site
   URL** to the production domain and add it to **Redirect URLs** — email
   confirmation and password reset links are built from this and will silently
   point at `localhost` otherwise.
5. **Before real users sign up:** re-enable "Confirm email" in Supabase
   Authentication settings and configure a custom SMTP provider. Both were
   disabled during development (M1) because of free-tier email rate limits —
   this is a deliberate, tracked gap, not an oversight, but it must be closed
   before launch or anyone can sign up with an email they don't own.

## Monitoring

V1 deliberately doesn't add a dedicated error-tracking dependency (keeping
dependencies lean). Instead:

- **Application errors** are caught by `app/error.tsx` / `app/global-error.tsx`,
  logged via `console.error`, and land in Vercel's function logs.
- **Database/auth activity** (slow queries, failed logins, RLS denials) is
  visible in the Supabase dashboard's Logs section.
- **Business-level audit trail** (voids, corrections) is already tracked in
  `audit_logs` and viewable in-app by the owner (M11).

If usage grows enough that log-diving becomes impractical, revisit adding a
dedicated error-tracking tool at that point — not before.

## Known limitations to revisit post-launch

- **Ask Piccos has no rate limiting.** Any authenticated member can call it
  as often as they want, and each call is a real Claude API cost. Fine for a
  small pilot; add a per-user/per-business cap before wider rollout.
- **No UI yet links a `staff` row to a real login account.** A barber who
  signs up currently sees zero of their own transactions until an owner (or
  a future admin tool) sets `staff.profile_id` to their user id — the RLS
  policies already support it, but there's no in-app flow to do it.

## Roadmap

This repo builds V1 only (auth, shop setup, staff, stations, services,
transactions, expenses, materials, dashboard, reports, permissions, audit
trail, Ask Piccos). Operations, Academy, Talent, Find, and Market are later
versions — not implemented here.
