# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both folders scaffolded, and login working end to end: a student signs up on Android with phone OTP and lands on Home; an admin logs in to the admin panel; a student account is refused by the panel.

**Architecture:** React Native CLI app and React (Vite) admin panel both log in with Supabase Auth, then call a Fastify API with the Supabase access token. The API verifies the token against the Supabase JWKS, creates or loads the caller's `profiles` row (Drizzle + Supabase Postgres), and enforces role and status.

**Tech Stack:** React Native 0.88 CLI, Fastify 5, Zod 4, Drizzle ORM, postgres.js, jose, Supabase Auth, React + Vite, Tailwind + shadcn/ui, TanStack Query, Zustand, Vitest, Jest.

**Spec:** `docs/superpowers/specs/2026-10-24-flp-course-app-design.md`

**Later phases** (Sell courses, Live classes, Launch) each get their own plan, written when this phase is done.

## Global Constraints

- Mobile is React Native **CLI** 0.88 — no Expo packages or Expo modules.
- Android package / application ID: `com.flpworldwide.courseapp`.
- Node ≥ 22 for every app; TypeScript `strict` everywhere.
- API routes live under `/v1` (except `/health`); every error response is `{ "error": { "code": string, "message": string } }`.
- Clients use Supabase only for auth; all data goes through the API. Every public table has RLS enabled with no policies.
- The API connects through the Supabase pooler with `prepare: false`.
- Timestamps stored as `timestamptz` UTC; displayed in Asia/Kolkata.
- Secrets only in `.env` files (git-ignored); each app commits a `.env.example`.
- Never log tokens, OTPs, or signatures.
- Repo: one git repository at the `FLP Course App/` root (`git init` once there before the first commit step).
- Tests that touch the database use `TEST_DATABASE_URL` (local Postgres 17 via Homebrew; Docker is not installed on the dev Mac). Development runs against a hosted Supabase project in `ap-south-1`.

## Review Focus

- **Expired, malformed, or wrong-issuer token, or JWKS endpoint unreachable** → `401 UNAUTHENTICATED`, never a 500. Test in Task 4.
- **Two first requests from a new user arrive at the same time** → exactly one `profiles` row, both requests succeed. Test in Task 3.
- **Phone typed as `098765 43210`, `+91 98765 43210`, `9876543210`, `12345`, `5876543210`** → first three normalize to `+919876543210`; last two are rejected with "Enter a valid 10-digit mobile number". Test in Task 6.
- **Valid Supabase login with role `student` used on the admin panel** → "Not authorized" shown, session signed out, no admin data requested. Test in Task 5.
- **Blocked user with a valid token** → `GET /v1/me` still works (so the app can show the Blocked screen), every other route returns `403 ACCOUNT_BLOCKED`; the app renders the Blocked screen. Tests in Tasks 4 and 6.

---

### Task 1: Mobile app scaffold

**Files:**
- Create: `flp-mobile-app/` (React Native CLI template, project name `FLPCourseApp`)
- Create: `flp-mobile-app/src/App.tsx` (moved from root `App.tsx`)
- Modify: `flp-mobile-app/index.js`, `flp-mobile-app/__tests__/App.test.tsx`, `flp-mobile-app/package.json` (`name: "flp-mobile-app"`)

**Interfaces:**
- Produces: `src/App.tsx` default export `App` — the root component later tasks wrap with providers.

- [x] **Step 1:** `npx @react-native-community/cli@20.2.0 init FLPCourseApp --directory flp-mobile-app --package-name com.flpworldwide.courseapp --install-pods false --skip-git-init --pm npm`
- [x] **Step 2:** Move `App.tsx` to `src/App.tsx`; update the imports in `index.js` and `__tests__/App.test.tsx`.
- [x] **Step 3:** Run `npm test` and `npx tsc --noEmit` in `flp-mobile-app/`. Expected: 1 test passes, no type errors.
- [x] **Step 4:** Run `./gradlew assembleDebug` in `flp-mobile-app/android/`. Expected: `BUILD SUCCESSFUL`.
- [x] **Step 5: Commit** — `git add flp-mobile-app && git commit -m "chore(mobile): scaffold React Native CLI app"`

### Task 2: API + admin workspace scaffold

**Files:**
- Create: `flp-api-admin/package.json` (npm workspaces `["api", "admin"]`), `.gitignore`, `README.md`
- Create: `flp-api-admin/api/package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- Create: `flp-api-admin/api/src/config/env.ts`, `src/app.ts`, `src/server.ts`, `src/routes/health.ts`
- Test: `flp-api-admin/api/test/health.test.ts`, `flp-api-admin/api/test/env.test.ts`
- Create: `flp-api-admin/admin/` (Vite `react-ts` template), `admin/.env.example`

**Interfaces:**
- Produces: `buildApp(opts?: BuildAppOptions)` in `api/src/app.ts`, returning the Zod-typed Fastify instance (exported as `type App`) — every API test builds the app through this and calls `app.inject()`. `BuildAppOptions` starts as `{ logger?: FastifyServerOptions['logger']; corsOrigins?: string[] }`; later tasks add fields.
- Produces: `loadEnv(source?: NodeJS.ProcessEnv): Env` in `api/src/config/env.ts` (Zod-validated; `PORT` default `4000`, `HOST` default `0.0.0.0`).

- [x] **Step 1: Write the failing test** — `test/health.test.ts`: `GET /health` returns status 200 and body `{ status: "ok" }`.
- [x] **Step 2:** Run `npm test -w api`. Expected: FAIL (module `../src/app` not found).
- [x] **Step 3:** Implement `buildApp` with Fastify 5 + `fastify-type-provider-zod`, registering `@fastify/cors`, `@fastify/helmet`, and `routes/health.ts`; `server.ts` calls `loadEnv()` and `listen`.
- [x] **Step 4:** Run `npm test -w api` and `npm run typecheck -w api`. Expected: PASS, no type errors.
- [x] **Step 5:** Scaffold `admin/` with `create-vite` (`react-ts`), add `.env.example` (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Run `npm run build -w admin`. Expected: build succeeds.
- [x] **Step 6: Commit** — `git add flp-api-admin && git commit -m "chore(api,admin): scaffold Fastify API and Vite admin workspace"`

### Task 3: Database — `profiles` table and migrations

**Prerequisite:** `brew install postgresql@17 && brew services start postgresql@17 && createdb flp_test`; set `TEST_DATABASE_URL=postgresql://localhost:5432/flp_test` in `api/.env.test`.

**Files:**
- Create: `api/drizzle.config.ts`, `api/src/db/client.ts`, `api/src/db/schema/profiles.ts`, `api/src/db/schema/index.ts`
- Create: `api/src/modules/profiles/profiles.repo.ts`
- Create: `api/drizzle/` (generated migrations), `api/test/setup/db.ts` (creates stub `auth.users(id uuid primary key)` if missing, runs migrations, truncates between tests)
- Test: `api/test/profiles.repo.test.ts`

**Interfaces:**
- Produces: `createDb(url: string): Db` in `db/client.ts` (postgres.js with `prepare: false`, Drizzle instance).
- Produces: `profiles` table — `id uuid pk references auth.users(id) on delete cascade`, `role profile_role ('student'|'admin') default 'student'`, `full_name text null`, `phone text unique null`, `email text null`, `status profile_status ('active'|'blocked') default 'active'`, `created_at`, `updated_at`; `.enableRLS()`.
- Produces: `type Profile` (inferred select type) and in `profiles.repo.ts`:
  - `ensureProfile(db: Db, input: { id: string; phone: string | null; email: string | null }): Promise<Profile>` — `INSERT … ON CONFLICT (id) DO NOTHING`, then select.
  - `updateProfile(db: Db, id: string, patch: { fullName?: string; email?: string | null }): Promise<Profile>`
  - `setProfileRole(db: Db, id: string, role: 'student' | 'admin'): Promise<Profile>`

- [ ] **Step 1: Write the failing tests** — `ensureProfile` creates a row with role `student` and status `active`; calling it twice returns the same row; `Promise.all` of two concurrent calls for the same id returns two equal profiles and `select count(*)` is 1; `updateProfile` trims nothing (validation is the route's job) and bumps `updated_at`.
- [ ] **Step 2:** Run `npm test -w api -- profiles`. Expected: FAIL (module not found).
- [ ] **Step 3:** Write the schema, `createDb`, and the repo functions; generate the migration with `npx drizzle-kit generate`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Add scripts `db:generate` and `db:migrate` to `api/package.json`; run `db:migrate` against the hosted dev project once `DATABASE_URL` is set.
- [ ] **Step 6: Commit** — `git commit -m "feat(api): profiles table, migrations, repo"`

### Task 4: API auth — token verification, `/v1/me`, admin guard, seed admin

**Files:**
- Create: `api/src/lib/errors.ts`, `api/src/lib/token-verifier.ts`, `api/src/plugins/auth.ts`, `api/src/modules/me/me.routes.ts`, `api/scripts/seed-admin.ts`
- Modify: `api/src/app.ts` (register error handler, auth plugin, `/v1` routes), `api/src/config/env.ts` (add `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Test: `api/test/helpers/tokens.ts`, `api/test/auth.test.ts`, `api/test/me.test.ts`

**Interfaces:**
- Consumes: `createDb`, `ensureProfile`, `updateProfile`, `setProfileRole` (Task 3).
- Produces: `class AppError extends Error { constructor(statusCode: number, code: string, message: string) }` and the error handler that renders `{ error: { code, message } }` (Zod validation errors → `400 VALIDATION_ERROR`).
- Produces: `type TokenClaims = { sub: string; phone: string | null; email: string | null }`; `type TokenVerifier = (token: string) => Promise<TokenClaims>`; `createTokenVerifier(opts: { issuer: string; jwks: JWTVerifyGetKey }): TokenVerifier` — checks `iss = {SUPABASE_URL}/auth/v1` and `aud = "authenticated"`; any failure throws `AppError(401, "UNAUTHENTICATED", "Please log in again")`.
- Produces: `BuildAppOptions` gains `{ db: Db; verifyToken: TokenVerifier }`. Fastify decorations: `request.profile: Profile`; `app.authenticate` (preHandler: verifies bearer token, calls `ensureProfile`, rejects `blocked` with `403 ACCOUNT_BLOCKED` unless `routeOptions.config.allowBlocked`), `app.requireAdmin` (preHandler after `authenticate`: role must be `admin`, else `403 FORBIDDEN`).
- Produces: `GET /v1/me` (allowBlocked) and `PATCH /v1/me` (body `{ fullName?: string (trimmed, 2–80) ; email?: string (email) | null }`) returning `ProfileDto = { id, role, fullName, phone, email, status }`. `GET /v1/admin/ping` → `{ ok: true }` behind `requireAdmin` (placeholder used by the admin panel guard test).
- Produces: `npm run seed:admin -w api -- --email <email> --password <password>` — creates the Supabase user with the service-role client (`email_confirm: true`), then `ensureProfile` + `setProfileRole(..., 'admin')`.

- [ ] **Step 1: Write the failing tests** — `test/helpers/tokens.ts` generates an ES256 key pair with `jose`, exposes `createLocalJWKSet` and `signToken({ sub, phone?, email?, iss?, aud?, expiresIn? })`. Cases: no header → 401 `UNAUTHENTICATED`; expired token → 401; wrong `iss` → 401; token signed by another key → 401; verifier whose JWKS getter throws → 401; valid token → 200 and profile created; blocked user → `GET /v1/me` 200 with `status: "blocked"`, `PATCH /v1/me` 403 `ACCOUNT_BLOCKED`; `PATCH /v1/me` with `fullName: " A "` → 400 `VALIDATION_ERROR`; student on `/v1/admin/ping` → 403 `FORBIDDEN`; admin → 200.
- [ ] **Step 2:** Run `npm test -w api`. Expected: new tests FAIL.
- [ ] **Step 3:** Implement errors, verifier, auth plugin, `/v1/me`, `/v1/admin/ping`; in `server.ts` build the real verifier with `createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Implement `scripts/seed-admin.ts`; run it once against the dev project and confirm the profile has role `admin`.
- [ ] **Step 6: Commit** — `git commit -m "feat(api): Supabase token auth, /v1/me, admin guard, seed script"`

### Task 5: Admin panel login and layout

**Files:**
- Modify: `admin/package.json` (add `@supabase/supabase-js`, `@tanstack/react-query`, `react-router`, `tailwindcss`, `@tailwindcss/vite`, `react-hook-form`, `zod`; dev: `vitest`, `@testing-library/react`, `jsdom`), `admin/vite.config.ts`, `admin/src/main.tsx`
- Create: `admin/src/lib/supabase.ts`, `admin/src/lib/api.ts`, `admin/src/auth/AuthProvider.tsx`, `admin/src/pages/LoginPage.tsx`, `admin/src/components/AppLayout.tsx`, `admin/src/routes.tsx`, placeholder pages `Dashboard`, `Courses`, `LiveClasses`, `Students`, `Orders`
- Test: `admin/src/auth/AuthProvider.test.tsx`, `admin/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/me` → `ProfileDto` (Task 4).
- Produces: `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` — adds `Authorization: Bearer <access token>`, throws `ApiError { status, code, message }` on non-2xx.
- Produces: `useAuth(): { status: 'loading' | 'signedOut' | 'admin' | 'notAuthorized'; profile: ProfileDto | null; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void> }`.

- [x] **Step 1:** Set up Tailwind (Vite plugin) and initialise shadcn/ui (`npx shadcn@latest init`), adding `button`, `input`, `label`, `card`.
- [x] **Step 2: Write the failing tests** — with Supabase client and `apiFetch` mocked: session + profile role `admin` → status `admin`; role `student` → status `notAuthorized` and `supabase.auth.signOut` called once; no session → `signedOut`. LoginPage: wrong password (Supabase returns `Invalid login credentials`) shows "Wrong email or password"; empty fields show "Email is required" / "Password is required".
- [x] **Step 3:** Run `npm test -w admin`. Expected: FAIL.
- [x] **Step 4:** Implement `supabase.ts`, `api.ts`, `AuthProvider`, `LoginPage`, protected routes (`/login` public; everything else inside `AppLayout` with sidebar links Dashboard, Courses, Live classes, Students, Orders, and a Log out button).
- [ ] **Step 5:** Run tests. Expected: PASS. Manually log in with the seeded admin against `npm run dev -w api` and `npm run dev -w admin`; then log in with a student account and see "Not authorized".
- [x] **Step 6: Commit** — `git commit -m "feat(admin): Supabase login, auth guard, layout shell"`

### Task 6: Mobile phone OTP login, profile setup, tab shell

**Files:**
- Modify: `flp-mobile-app/package.json` (add `@supabase/supabase-js`, `react-native-url-polyfill`, `react-native-mmkv`, `react-native-config`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`, `@tanstack/react-query`, `zustand`; dev: `@testing-library/react-native`), `android/app/build.gradle` (apply `react-native-config` dotenv.gradle), `src/App.tsx`
- Create: `.env.example` (`API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`), `src/config/env.ts`, `src/lib/phone.ts`, `src/lib/supabase.ts`, `src/lib/api.ts`, `src/state/session.ts`, `src/navigation/RootNavigator.tsx`, `src/navigation/MainTabs.tsx`
- Create screens: `src/screens/auth/PhoneScreen.tsx`, `src/screens/auth/OtpScreen.tsx`, `src/screens/auth/ProfileSetupScreen.tsx`, `src/screens/BlockedScreen.tsx`, `src/screens/home/HomeScreen.tsx`, `src/screens/learning/MyLearningScreen.tsx`, `src/screens/live/LiveClassesScreen.tsx`, `src/screens/profile/ProfileScreen.tsx` (placeholders except auth + Profile log out)
- Test: `__tests__/phone.test.ts`, `__tests__/RootNavigator.test.tsx`, `__tests__/OtpScreen.test.tsx`

**Interfaces:**
- Consumes: `GET /v1/me`, `PATCH /v1/me` (Task 4).
- Produces: `normalizeIndianPhone(input: string): string | null` — strips spaces, dashes, a leading `+91`/`91` (when 12 digits) or `0` (when 11 digits); returns `+91XXXXXXXXXX` only for 10 digits starting 6–9.
- Produces: `useSession` (Zustand): `{ status: 'loading' | 'signedOut' | 'needsProfile' | 'blocked' | 'ready'; profile: ProfileDto | null; refreshProfile(): Promise<void>; signOut(): Promise<void> }`. `RootNavigator` renders Auth stack (`Phone` → `Otp`) for `signedOut`, `ProfileSetup` for `needsProfile` (no `fullName`), `Blocked` for `blocked`, `MainTabs` (Home, My Learning, Live, Profile) for `ready`.

- [ ] **Step 1: Write the failing tests** — `normalizeIndianPhone` table from Review Focus; `RootNavigator` renders the right first screen for each of the five session statuses; `OtpScreen` disables "Resend OTP" for 30 s (Jest fake timers) and enables it after.
- [ ] **Step 2:** Run `npm test` in `flp-mobile-app/`. Expected: FAIL.
- [ ] **Step 3:** Install dependencies; wire `react-native-config`; implement `phone.ts`, `supabase.ts` (MMKV storage adapter, `detectSessionInUrl: false`), `api.ts` (same contract as admin `apiFetch`), `session.ts`, navigators, and screens. Phone screen calls `supabase.auth.signInWithOtp({ phone })`; OTP screen calls `verifyOtp({ phone, token, type: 'sms' })` then `refreshProfile()`.
- [ ] **Step 4:** Run tests and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5:** Run on the Android emulator (`npm run android`) against the dev Supabase project using a Supabase test phone number (Auth → Phone → test OTP); confirm sign-up → profile setup → Home, and log out returns to the Phone screen.
- [ ] **Step 6: Commit** — `git commit -m "feat(mobile): phone OTP login, profile setup, tab shell"`
