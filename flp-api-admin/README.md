# FLP API + Admin Panel

npm workspaces with two apps:

| Folder | What | Stack |
|---|---|---|
| `api/` | REST API for the mobile app and admin panel | Fastify 5, Zod, (Drizzle + Supabase Postgres from Phase 1 Task 3) |
| `admin/` | Web admin panel | React + Vite + TypeScript |

## Setup

```bash
npm install
cp api/.env.example api/.env       # fill in Supabase, etc.
cp admin/.env.example admin/.env
```

## Run

```bash
npm run dev:api      # http://localhost:4000  (GET /health)
npm run dev:admin    # http://localhost:5173
```

## Check

```bash
npm test             # all workspaces
npm run typecheck
npm run build
```

Design and plans live in `../docs/superpowers/`.
