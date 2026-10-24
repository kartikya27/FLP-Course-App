# Phase 1 — execution decisions

Every ruling made while implementing `2026-10-24-phase-1-foundation.md`, plus the final review outcome and deferred findings. Each ruling says what it costs if it was wrong.

```text
# SDD ledger — plan: docs/superpowers/plans/2026-10-24-phase-1-foundation.md
Spec: docs/superpowers/specs/2026-10-24-flp-course-app-design.md
Task 1: complete (scaffold, pre-execution; commit cddbc13 on main; npm test 1/1, tsc clean, gradlew assembleDebug BUILD SUCCESSFUL)
Task 2: complete (scaffold, pre-execution; commit 9990076 on main; npm test -w api 3/3, typecheck, build, admin build+lint)
Setup: Ruling: work on branch phase-1-foundation in the fresh repo instead of a worktree — repo created this session, nothing else in flight — cost if wrong: none, a worktree can still be cut from the branch
Setup: Ruling: Tasks 1–2 scaffold committed to main as the baseline (the plan's own commit steps); Tasks 3–6 go on the branch — cost if wrong: one rebase if the user wanted main empty
Setup: Ruling: installed postgresql@17 via Homebrew per Task 3 prerequisite in the approved plan — cost if wrong: an unwanted local service; brew services stop + brew uninstall undoes it
Setup: Ruling: no Supabase credentials exist in any .env, so steps that need the hosted project (T3 s5 migrate, T4 s5 seed run, T5 s5 manual login, T6 s5 emulator login) are reported NOT VERIFIED; code and automated tests are still done — cost if wrong: integration issues surface when credentials arrive
Pre-flight T2→T4: T2 buildApp(opts?) with {logger, corsOrigins}; T4 adds required {db, verifyToken}. Conflict: health.test calls buildApp() with no args. Ruling: db/verifyToken required (spec: every request authenticates); tests build through test/helpers/app.ts — cost if wrong: one helper
Pre-flight T2→T4: T2 env test asserts loadEnv({}) succeeds; T4 adds DATABASE_URL/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY. Ruling: those are required (server cannot run without them); env test passes them — cost if wrong: none
Pre-flight T3→T4: createDb/ensureProfile/updateProfile/setProfileRole/Profile — names and signatures match. Clean.
Pre-flight T4→T5: GET /v1/me → ProfileDto {id, role, fullName, phone, email, status} — matches T5 consumer. Clean.
Pre-flight T4→T6: GET/PATCH /v1/me, ProfileDto.fullName/status drive needsProfile/blocked — matches. Clean.
Task 3: Ruling: Postgres install still downloading on an Intel Mac — run Task 5 (admin, no DB) and Task 6 (mobile, no DB) before finishing Tasks 3–4; tasks touch disjoint folders and are committed by path — cost if wrong: ledger commit ranges are out of plan order
Task 5: Ruling: added @hookform/resolvers@^5 (plan lists RHF + zod but no resolver; v6 has an unresolvable peer conflict) — cost if wrong: swap to RHF built-in rules
Task 5: Ruling: tsconfig.app.json gets "strict": true (Global Constraints; Vite template omits it) and no baseUrl (TS 6 rejects it; paths work without) — cost if wrong: none
Task 5: Ruling: ESLint react-refresh rule off for src/components/ui (shadcn exports variants next to components) — cost if wrong: slower HMR in those files only
Task 5: Ruling: added tests beyond the brief — apiFetch (bearer header, ApiError mapping), routes (signed-out redirect, admin layout links), invalid email, blocked admin, /v1/me failure — cost if wrong: none
Task 5: Ruling: shared package-lock.json in this commit also carries Task 3's drizzle/postgres entries (one lockfile for the workspace) — cost if wrong: none
Task 5: Ruling: Step 5 manual login NOT VERIFIED (no Supabase project yet); verified instead in the browser with placeholder env that / redirects to /login and empty submit shows both required messages — cost if wrong: Supabase-specific login issues surface later
Task 5: complete (commits 9990076..1efd330, tests: npm test --prefix flp-api-admin/admin →    Duration  8.42s (environment 72%, import 10%, tests 9%, setup 7%, transform 2%, worker 1%))
Task 3: Ruling: Homebrew postgresql@17 was still building from source after 40 min (Intel Mac) — tests now start Postgres 17.10 via embedded-postgres in Vitest globalSetup (port 54329, temp dir); plan Global Constraints and Task 3 text updated to match; the brew install was left running — cost if wrong: one devDependency; CI on Linux must also approve @embedded-postgres/linux-x64's postinstall
Task 3: Ruling: approved @embedded-postgres/darwin-x64 postinstall (npm 11 allowScripts) after reading it: it only recreates relative symlinks inside its own native/ dir — cost if wrong: none
Task 3: Ruling: added setProfileRole test and "patch leaves other fields unchanged" test beyond the brief — cost if wrong: none
Task 3: Ruling: drizzle.config.ts loads api/.env via process.loadEnvFile (drizzle-kit does not) — cost if wrong: none
Task 3: Ruling: Step 5 db:migrate against the hosted dev project NOT VERIFIED (no DATABASE_URL yet); migration verified against embedded Postgres 17 — cost if wrong: Supabase-specific migration issue surfaces on first migrate
Task 3: complete (commits 9990076..35fda03, tests: npm test --prefix flp-api-admin/api →              at least ~2.67s faster with isolate: false — reuses workers across files instead of one per file)
Task 4: Ruling: authenticate/requireAdmin run as onRequest hooks, not preHandler — Fastify validates the body before preHandler, so an unauthenticated or blocked caller would get 400 instead of 401/403 — cost if wrong: none (test "checks the token before validating the body")
Task 4: Ruling: token phone claim normalized to +E.164 and "" → null (Supabase omits the "+" and uses "" for missing claims) so profiles.phone matches the mobile app's +91 format — cost if wrong: phone stored in a different format than admin-created students later
Task 4: Ruling: a valid token whose auth.users row is gone (FK violation 23503 on ensureProfile) → 401 UNAUTHENTICATED instead of 500 — cost if wrong: none
Task 4: Ruling: SUPABASE_SERVICE_ROLE_KEY is optional in loadEnv (only the seed script needs it now; it asserts it); DATABASE_URL and SUPABASE_URL required — amends the pre-flight ruling — cost if wrong: Phase 2 admin user creation must assert it too
Task 4: Ruling: seed logic extracted to seedAdmin(db, createUser, input) so it is tested against Postgres; scripts/seed-admin.ts only wires Supabase — cost if wrong: none
Task 4: Ruling: added 404 NOT_FOUND handler in the standard error shape (Global Constraints: every error uses it) and tests beyond the brief: wrong audience, non-bearer header, deleted user, auth-before-validation, 404 shape, name > 80, invalid email, email null, role/status escalation ignored, concurrent first requests over HTTP — cost if wrong: none
Task 4: Ruling: Step 5 seed run against the dev project NOT VERIFIED (no Supabase credentials); seedAdmin tested against Postgres; built server smoke-tested (health 200; missing/garbage token 401 with unreachable JWKS) — cost if wrong: Supabase admin API issue surfaces on first seed
Task 4: complete (commits 35fda03..1e9e46c, tests: npm test --prefix flp-api-admin/api →              at least ~11.24s faster with isolate: false — reuses workers across files instead of one per file)
Task 6: Ruling: @testing-library/react-native v14 made render/fireEvent/act async — tests await them (assertions unchanged); added its test-renderer peer — cost if wrong: none
Task 6: Ruling: useSession gains setProfile(profile) so ProfileSetup uses the PATCH response instead of a second GET /v1/me — cost if wrong: one extra field on the store
Task 6: Ruling: startSessionListener handles only INITIAL_SESSION and SIGNED_OUT (OTP screen loads the profile after verifyOtp, so SIGNED_IN would double-fetch); a failed /v1/me on app start falls back to signedOut — cost if wrong: an offline student sees the phone screen until they reopen the app online
Task 6: Ruling: small UI kit (src/ui Button, TextField, Screen, theme) and src/navigation/types.ts added beyond the brief's file list to avoid repeating styles in every screen; tabs are label-only until an icon library is chosen — cost if wrong: none
Task 6: Ruling: removed the template-only @react-native/new-app-screen; deleted a react-native-config type file that replaced (not augmented) the library types — cost if wrong: none
Task 6: Ruling: extra tests beyond the brief — PhoneScreen (invalid, success, send failure), ProfileSetupScreen (short name, bad email, save), session store + listener, App smoke — cost if wrong: none
Task 6: Ruling: Step 5 PARTIALLY verified — gradlew assembleDebug BUILD SUCCESSFUL with MMKV/Nitro/screens/config; app launched on emulator Medium_Phone_API_36 (Fabric) with a placeholder .env, phone screen rendered, "12345" showed "Enter a valid 10-digit mobile number"; the real OTP → profile → Home → log out flow NOT VERIFIED (no Supabase project) — cost if wrong: Supabase OTP/session issues surface on first real login
Task 6: complete (commits 1efd330..5c10e1f, tests: npm test --prefix flp-mobile-app → Ran all test suites.)
Final review: dispatched on opus (fable was requested as most capable but returned 429 "requires usage credits"). Verdict: with fixes. Critical: none. Important: 2. Minor: 13.
Final: fixed admin treats any /v1/me failure as logout + refetch on tab focus + stale answers — AuthProvider "is unavailable…", "signs out when the API rejects the session", "does not refetch…same admin", "ignores a slow /v1/me answer…", LoginPage "offers a retry…" RED→GREEN, admin suite 19/19 (ee8ab4e)
Final: fixed mobile strands a student with a valid session on transient /v1/me failure (start-up and after OTP) — session "is unavailable, without throwing…", "signs out when the API rejects the session", "keeps the session and shows unavailable…", "retries when the app comes back to the foreground…", RootNavigator "shows a retry screen…", api "gives up after 15 seconds…" RED→GREEN, mobile suite 44/44 (44ae8da)
Final: Ruling: overturns the Task 6 ruling "failed /v1/me on app start falls back to signedOut" — the reviewer is right that it costs students a paid SMS on patchy networks — cost if wrong: none
Final: Ruling: admin AuthStatus gains 'unavailable' and useAuth gains retry(); mobile SessionStatus gains 'unavailable' and refreshProfile no longer throws — interface additions beyond the plan, required by the fixes — cost if wrong: none
Final: minor (deferred): @fastify/cors defaults to GET,HEAD,POST — admin-panel PATCH/PUT/DELETE will fail preflight; set methods before the first admin write in Phase 2
Final: minor (deferred): unique-phone clash (23505) on profile insert returns 500 forever; settle the phone-uniqueness rule before Phase 2's "admin adds student by phone"
Final: minor (deferred): Review Focus tests missing for "Bearer not-a-jwt" and "blocked admin on /v1/admin/ping" (code already correct)
Final: minor (deferred): Fastify client-error codes (FST_ERR_CTP_*) reach clients; map to BAD_REQUEST/VALIDATION_ERROR
Final: minor (deferred): DrizzleQueryError messages include query params (phone/email) in 500 logs
Final: minor (deferred): ensureProfile does INSERT…ON CONFLICT + SELECT on every request; select-first would make the common path one read
Final: minor (deferred): allowScripts approves only @embedded-postgres/darwin-x64; Apple Silicon and Linux CI need their platform package approved
Final: minor (deferred): api/.env.example still mentions TEST_DATABASE_URL for local Postgres; vitest sets an env var nothing reads
Final: minor (deferred): admin login has no busy state between Supabase sign-in and /v1/me; "Not authorized" banner can sit next to a later "Wrong email or password"
Final: minor (deferred): mobile BlockedScreen has no refresh; ProfileSetupScreen hides server validation messages, its email check is looser than the API's, and it has no log out
Final: minor (deferred): 30 s OTP resend may be below the Supabase project's SMS minimum interval (believed 60 s, unconfirmed); show Supabase's message on failure
Final: minor (deferred): seed script fails instead of promoting an existing auth user; password passes through shell history
Final: Ruling: rate limiting (spec §9) — no OTP-adjacent or order endpoints exist in Phase 1 (OTP goes app→Supabase) — stands — cost if wrong: none now; add with Phase 2 orders
Final: Ruling: FLAG_SECURE (FR-L5) — belongs with the Phase 2 player — stands — cost if wrong: screenshots possible until Phase 2, but no paid content exists yet
Final: Ruling: FR-A4 "edit name and email later" — not in the Phase 1 plan; the Profile tab is a placeholder — schedule in Phase 2 — cost if wrong: students can't fix a typo in their name until Phase 2
Final: Ruling: FR-A5 admins creating admins — Phase 2 admin endpoints — stands — cost if wrong: extra admins need the seed script until then
Final: Ruling: 10 s timeouts / 502 UPSTREAM_ERROR — no Razorpay/Zoom/Bunny calls yet; JWKS keeps jose's 5 s default and maps to 401 per plan — stands — cost if wrong: none
Final: Ruling: p95 latency — needs hosted infra — stands — cost if wrong: measured at Phase 4
Final: Ruling: real OTP/admin login, db:migrate and seed against Supabase — environment limit (no credentials) — stands — cost if wrong: integration issues surface on first real run
Final: Ruling: MMKV session not encrypted — Android app storage is private and the spec names MMKV — stands — cost if wrong: tokens readable on rooted devices
Final: Ruling: server.ts picks pino-pretty (a devDependency) when NODE_ENV is unset because it defaults to development — a production deploy without NODE_ENV=production would crash — stands for Phase 1, add to the Phase 4 deploy checklist — cost if wrong: failed deploy
Final: Ruling: .claude/launch.json committed, unused QueryClient, label-only tabs — tooling and scaffolding — stands — cost if wrong: none
Final: Ruling: profile email not synced to the auth email — spec silent, no flow depends on it — stands — cost if wrong: two emails can drift
```
