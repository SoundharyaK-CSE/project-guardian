# Project Guardian

AI-powered requirement impact & drift analysis system.

This is a working scaffold that implements the core loop described in the
spec: requirement understanding → versioning → impact analysis → drift
detection → AI suggestions → human approval → traceability.

It is not a finished product — there's no real static-analysis engine
reading your actual source code (that's a large project on its own). What's
here is genuinely functional: a real database schema, a real Express API,
real Claude-powered analysis (with a deterministic mock fallback if you
don't have an API key yet), and a real React dashboard wired up to all of
it. Treat it as your foundation and keep building on it.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express, REST API
- **AI:** Anthropic Claude API (requirement understanding, impact analysis,
  drift detection, change suggestions) — falls back to a rule-based mock if
  `ANTHROPIC_API_KEY` isn't set, so the app is fully runnable without a key
- **Database:** PostgreSQL
- **Dependency/impact modeling:** relational graph (`traceability_links`
  table) — components and requirements as nodes, links as edges

## What's implemented

1. **Requirement understanding** — `POST /api/requirements` runs the new
   requirement through Claude and stores entities, actions, business rules,
   related modules, security notes, testing notes.
2. **Versioning** — `POST /api/requirements/:id/versions` adds a new version
   and keeps full history.
3. **Traceability** — `traceability_links` connects requirements to
   components with a relationship type, a confidence score, and a reason.
   Matrix view at `/traceability`.
4. **Impact analysis** — `POST /api/analysis/:id/impact` diffs two versions
   and produces directly/indirectly affected components, testing impact,
   database impact, an impact score, and a risk level.
5. **Drift detection** — `POST /api/drift/check` compares a requirement's
   current text against a plain-English description of what's actually
   implemented, and flags missing/partial/contradictory/outdated drift.
6. **AI change suggestions + human approval** — `POST
   /api/analysis/:id/suggestions` generates per-component change proposals
   with before/after diffs; a developer approves or rejects each one via
   `PATCH /api/analysis/suggestions/:id`. Nothing is applied automatically.
7. **Dashboard** — aggregate counts and a computed project health score.

## What's intentionally out of scope (for you to add next)

- Actually parsing a real codebase (AST parsing / static analysis) to
  auto-discover components instead of manually registering them in
  `components`
- Applying an approved suggestion as a real code diff/PR
- Auth/multi-user support
- A real interactive dependency graph visualization (the matrix view here
  is a solid starting point; you could add a graph library like
  react-flow or d3 for the node-link view described in the spec)

## Running it locally

### 1. Database
```bash
createdb project_guardian
psql project_guardian -f backend/src/db/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # then edit DATABASE_URL and (optionally) ANTHROPIC_API_KEY
npm install
npm run seed              # loads the REQ-001 login/OTP + REQ-002 email-verification examples from the spec
npm run dev               # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so just open
the frontend URL.

## API summary

| Method | Route | Purpose |
|---|---|---|
| GET | /api/dashboard | project health + counts |
| GET/POST | /api/requirements | list / create requirement |
| GET | /api/requirements/:id | requirement + version history |
| POST | /api/requirements/:id/versions | add a new version |
| POST | /api/analysis/:id/impact | run impact analysis (latest vs previous, or specify fromVersion/toVersion) |
| GET | /api/analysis/:id/impact | past impact analyses |
| POST | /api/analysis/:id/suggestions | generate AI suggestions from latest impact analysis |
| PATCH | /api/analysis/suggestions/:id | approve/reject a suggestion |
| GET | /api/traceability/matrix | full traceability table |
| GET | /api/traceability/:id/graph | nodes/edges for one requirement |
| POST | /api/traceability | link a component to a requirement |
| POST | /api/drift/check | compare requirement vs described implementation |
| GET | /api/drift | list drift issues |
| PATCH | /api/drift/:id | acknowledge/resolve a drift issue |
| GET/POST | /api/components | list / register components |

## Notes for your resume/demo

The REQ-001 → REQ-002 seed data recreates the exact "login → login + OTP"
and "email verification drift" examples from the spec, so after `npm run
seed` you can demo the whole flow (understanding → impact score → drift
detection → suggestions → approval) with data that matches your pitch.
