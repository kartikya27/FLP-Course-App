# FLP Course App — Design Spec

- **Date:** 2026-10-24
- **Status:** Design approved in chat; this written spec awaits review
- **Scope:** Android app for students, API, and web admin panel for selling recorded courses and live classes

## 1. Purpose

FLP sells recorded courses and live classes to students through a mobile app. Students sign up themselves, pay with Razorpay, and immediately get access. The FLP team runs everything from a web admin panel: building courses, uploading videos, scheduling Zoom live classes, managing students, and handling orders and refunds.

Success for v1: a student installs the Android app, signs up with their phone, buys a course or live class with Razorpay, watches the videos, and joins the live class inside the app. Non-buyers cannot reach paid content or class links.

## 2. Decisions

| Area | Decision | Source |
|---|---|---|
| Mobile | React Native **CLI** 0.88 + TypeScript. No Expo. | User |
| Platforms | **Android first.** iOS project is kept in the repo but not released in v1. | User |
| API | Fastify 5 (Node, TypeScript) — chosen for fast response times | User asked for a fast API stack; Fastify is the pick |
| Database | PostgreSQL hosted on **Supabase** (Mumbai region `ap-south-1`) | User |
| Admin panel | **React + Vite** + TypeScript | User |
| Media | **Bunny Stream** for videos, **Bunny Storage** + pull zone for PDFs and images | User |
| Payments | **Razorpay**, INR only | User |
| Live classes | **Zoom Meeting SDK** inside the app; meetings created by the API through Zoom's Server-to-Server OAuth | User |
| Who can buy | Open self sign-up; payment is the only gate, no admin approval | User |
| Manual access | Admin can add students and assign or revoke courses and live classes | User |
| Auth | Supabase Auth: phone OTP for students, email + password for admins | Assumption (fits Supabase choice) |
| ORM | Drizzle ORM + `postgres` (postgres.js) driver | Assumption (lightweight, fast, typed) |
| Roles | Two roles: `student`, `admin`. No teacher accounts in v1; the instructor is a name on the course or class, and teachers host from the FLP Zoom account. | Assumption |

## 3. Repository layout

```
FLP Course App/
├── flp-mobile-app/        React Native CLI app (Android package com.flpworldwide.courseapp)
├── flp-api-admin/         npm workspaces
│   ├── api/               Fastify API
│   └── admin/             React + Vite admin panel
└── docs/superpowers/      specs and plans
```

One git repository at the `FLP Course App/` root. Each app keeps its own `package.json` and `.env`.

## 4. Architecture

```
 Android app ──┐                       ┌──► Supabase Postgres
               ├── HTTPS /v1 ──► API ──┼──► Bunny Stream / Storage (signed URLs, uploads)
 Admin panel ──┘   (Fastify)           ├──► Razorpay API (orders, refunds)  ◄── Razorpay webhook
                                       └──► Zoom API (create/update meetings)

 Direct from clients:
   app   ──► Supabase Auth (OTP login)   ──► Razorpay Checkout   ──► Zoom Meeting SDK   ──► Bunny HLS playback
   admin ──► Supabase Auth (email login) ──► Bunny Stream TUS upload (videos only)
```

Rules:
- Clients use Supabase only to log in. All data goes through the API. Every public table has Row Level Security turned on with **no policies**, so the Supabase anon key cannot read or write data.
- The API connects to Postgres through the Supabase connection pooler (transaction mode, port 6543, `prepare: false`).
- The API verifies the Supabase access token on every request using the project's JWKS (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) and loads the caller's `profiles` row for role and status.
- Prices, access checks, and enrollment decisions happen only in the API. Nothing the client sends about price or access is trusted.

## 5. Functional requirements

### 5.1 Sign-up, login, profile

- **FR-A1** A student signs up and logs in with an Indian mobile number and a 6-digit SMS OTP. The app accepts the number with or without `+91`, `0`, or spaces, normalizes it to `+91XXXXXXXXXX`, and rejects anything that isn't 10 digits starting with 6–9.
- **FR-A2** OTP resend is allowed after 30 seconds.
- **FR-A3** On the first authenticated request, the API creates the student's `profiles` row (role `student`, status `active`). Repeated or concurrent first requests must not create duplicates.
- **FR-A4** After first login the app asks for full name (required, 2–80 characters) and email (optional). The student can edit both later.
- **FR-A5** Admins log in to the admin panel with email + password. There is no public admin sign-up. The first admin is created with a seed script, and admins can create other admins.
- **FR-A6** A user with status `blocked` gets `403 ACCOUNT_BLOCKED` on every endpoint except `GET /v1/me`. The app shows a "Your account is blocked, contact support" screen.
- **FR-A7** A valid Supabase login whose role is `student` cannot use the admin panel. The panel shows "Not authorized" and signs them out.

### 5.2 Catalog

- **FR-C1** Courses have a title, slug, category, short and long description, thumbnail, instructor name, price in paise, optional validity in days, and status (`draft`, `published`, `archived`). Only `published` courses appear in the app.
- **FR-C2** A course contains ordered sections, and sections contain ordered lessons. A lesson is a `video` (Bunny Stream), a `pdf` (Bunny Storage), or `text`.
- **FR-C3** Lessons can be marked as **free preview**. Anyone logged in can open them without buying.
- **FR-C4** The app lists courses with category filter and text search on title, 20 per page.
- **FR-C5** Course detail shows the curriculum (titles and durations visible to everyone), price, whether the student is enrolled, and a Buy button. A course priced at 0 shows **Enroll for free** and enrolls without payment.

### 5.3 Purchase (Razorpay, Android)

- **FR-P1** A student can buy a course or a standalone live class. The sellable item is identified by `courseId` or `liveClassId`.
- **FR-P2** `POST /v1/orders` reads the price from the database, creates a Razorpay order, and stores an `orders` row with status `created`. If the student already has active access, it returns `409 ALREADY_ENROLLED`.
- **FR-P3** The app opens Razorpay Checkout with the returned order. On success, the app sends `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `POST /v1/payments/razorpay/verify`. The API checks the HMAC-SHA256 signature using the key secret, then marks the order `paid` and creates the enrollment.
- **FR-P4** The Razorpay webhook (`payment.captured`, `payment.failed`, `refund.processed`) is the source of truth. It verifies `X-Razorpay-Signature` against the raw body with the webhook secret. Processing is idempotent (unique `razorpay_payment_id`), so verify-then-webhook or webhook-then-verify both result in exactly one paid order and one enrollment.
- **FR-P5** If the app is closed mid-payment, the webhook still grants access. On reopening, the course shows as enrolled.
- **FR-P6** Enrollment expiry: if the course has `validity_days`, `expires_at = paid_at + validity_days`. Otherwise access never expires.
- **FR-P7** Purchase history lists the student's orders with item, amount, status, and date.
- **FR-P8** All amounts are integer paise, currency `INR`.

### 5.4 Learning

- **FR-L1** "My Learning" lists the student's active enrollments with progress (completed lessons ÷ total lessons).
- **FR-L2** Opening a video lesson calls `GET /v1/lessons/:id/playback`. The API checks access (free preview or active enrollment) and returns a Bunny token-authenticated HLS URL valid for 3 hours. If playback fails with an expired token, the player requests a new URL and resumes from the last position.
- **FR-L3** PDF lessons get a signed Bunny pull-zone URL valid for 1 hour and open in an in-app viewer. No download button.
- **FR-L4** The app saves video position every 15 seconds and on pause or exit (`PUT /v1/lessons/:id/progress`). A lesson counts as completed at 90% watched; PDF and text lessons count as completed when opened.
- **FR-L5** Screenshots and screen recording are blocked app-wide on Android (`FLAG_SECURE` in `MainActivity`).
- **FR-L6** Offline downloads are out of scope for v1.

### 5.5 Live classes (Zoom)

- **FR-Z1** An admin schedules a live class with title, description, instructor name, start time (entered and displayed in Asia/Kolkata, stored UTC), and duration in minutes. A class either belongs to a course (included with it) or is standalone with its own price.
- **FR-Z2** Creating a class creates a scheduled Zoom meeting through the Zoom API: join before host off, mute on entry on, waiting room off, cloud recording on if the account allows it. Editing the time updates the meeting. Cancelling deletes the meeting and marks the class `cancelled`.
- **FR-Z3** A student has access to a class if they have an active enrollment for that class or for its parent course.
- **FR-Z4** The **Join** button is enabled from 10 minutes before the start until 30 minutes after the scheduled end, unless the class is `cancelled`.
- **FR-Z5** `POST /v1/live-classes/:id/join` checks access and the join window, then returns the meeting number, passcode, a Meeting SDK JWT signature (role attendee, valid 2 hours), and the student's display name. The app passes these straight into the Zoom SDK. The passcode is never displayed in the UI.
- **FR-Z6** The admin panel shows a **Start class** button that fetches a fresh Zoom host start URL for the teacher.
- **FR-Z7** Push reminders (Firebase Cloud Messaging) go to students with access 60 minutes and 10 minutes before the start.

### 5.6 Admin panel

- **FR-M1** Dashboard: revenue today, this week, and this month; new students this week; upcoming live classes.
- **FR-M2** Courses: create, edit, publish, archive; build sections and lessons with drag-to-reorder; upload thumbnails.
- **FR-M3** Video upload: the API creates the video in Bunny Stream and returns a TUS upload signature. The browser uploads directly to Bunny with progress, so large files never pass through the API. PDFs and images (max 50 MB) upload through the API, because Bunny Storage keys must stay server-side.
- **FR-M4** Live classes: schedule, edit, cancel, start.
- **FR-M5** Students: list and search by name or phone; view a student's enrollments and orders; add a student by phone and name (creates the Supabase user, who then logs in with OTP); block and unblock.
- **FR-M6** Assign access: grant a course or live class to a student with an optional expiry date (`source = admin_assigned`). Revoke any enrollment (status `revoked`).
- **FR-M7** Orders: list and filter by status and date; issue a **full refund** through Razorpay, which revokes the related enrollment when the refund is processed. Partial refunds are out of scope for v1.
- **FR-M8** Every admin write is recorded in `admin_audit_log` (who, what, which record, when).

## 6. Data model

All tables use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` in UTC, and `created_at` / `updated_at` where useful.

| Table | Key columns |
|---|---|
| `profiles` | `id` (= `auth.users.id`), `role` (`student`/`admin`), `full_name`, `phone` (unique, nullable), `email` (nullable), `status` (`active`/`blocked`) |
| `categories` | `name`, `slug` (unique), `sort_order` |
| `courses` | `category_id`, `title`, `slug` (unique), `short_description`, `description`, `thumbnail_url`, `instructor_name`, `price_paise` (≥ 0), `validity_days` (nullable), `status` (`draft`/`published`/`archived`), `published_at` |
| `course_sections` | `course_id` (cascade), `title`, `sort_order` |
| `lessons` | `section_id` (cascade), `title`, `type` (`video`/`pdf`/`text`), `bunny_video_id`, `file_path`, `body`, `duration_seconds`, `is_free_preview`, `sort_order` |
| `live_classes` | `course_id` (nullable), `title`, `description`, `instructor_name`, `starts_at`, `duration_minutes`, `price_paise` (required when `course_id` is null), `zoom_meeting_id`, `zoom_passcode`, `status` (`scheduled`/`live`/`ended`/`cancelled`) |
| `orders` | `user_id`, `course_id` / `live_class_id` (exactly one set), `amount_paise`, `currency`, `status` (`created`/`paid`/`failed`/`refunded`), `razorpay_order_id` (unique), `paid_at` |
| `payments` | `order_id`, `razorpay_payment_id` (unique), `status` (`captured`/`failed`/`refunded`), `method`, `raw` (jsonb) |
| `enrollments` | `user_id`, `course_id` / `live_class_id` (exactly one set), `source` (`purchase`/`admin_assigned`), `order_id`, `granted_by`, `status` (`active`/`revoked`), `starts_at`, `expires_at`. Partial unique indexes on (`user_id`, `course_id`) and (`user_id`, `live_class_id`) where `status = 'active'`. |
| `lesson_progress` | PK (`user_id`, `lesson_id`), `position_seconds`, `completed_at` |
| `device_tokens` | `user_id`, `fcm_token` (unique), `platform` (`android`/`ios`), `last_seen_at` |
| `admin_audit_log` | `admin_id`, `action`, `entity_type`, `entity_id`, `details` (jsonb) |

"Active access" means `status = 'active'` and (`expires_at` is null or in the future).

## 7. API surface

All routes are under `/v1` except `/health`. Errors use one shape: `{ "error": { "code": "ALREADY_ENROLLED", "message": "..." } }`.

**Student (authenticated)**
- `GET /v1/me`, `PATCH /v1/me`
- `GET /v1/categories`
- `GET /v1/courses?category=&search=&page=`, `GET /v1/courses/:slug`
- `GET /v1/lessons/:id/playback`, `PUT /v1/lessons/:id/progress`
- `GET /v1/my/courses`, `GET /v1/my/live-classes`, `GET /v1/my/orders`
- `GET /v1/live-classes?upcoming=true`, `GET /v1/live-classes/:id`, `POST /v1/live-classes/:id/join`
- `POST /v1/orders`, `POST /v1/payments/razorpay/verify`
- `POST /v1/devices`

**Webhooks (signature-verified, no login)**
- `POST /v1/webhooks/razorpay`

**Admin (role `admin`)** under `/v1/admin`
- `GET /dashboard`
- `courses`, `courses/:id/sections`, `sections/:id/lessons`: CRUD + reorder
- `POST /media/videos` (Bunny video + TUS signature), `POST /media/files` (multipart, max 50 MB)
- `live-classes`: CRUD, `GET /live-classes/:id/start-url`
- `students`: list/search, create, get, block/unblock; `POST /students/:id/enrollments`; `DELETE /enrollments/:id`
- `orders`: list/filter; `POST /orders/:id/refund`
- `admins`: create

## 8. Tech stack per app

- **Mobile:** React Native 0.88 CLI, TypeScript strict, React Navigation (native stack + bottom tabs), TanStack Query, Zustand (session state), `@supabase/supabase-js` (auth only) with MMKV storage, `react-native-config`, `react-native-video` (HLS), `react-native-pdf`, `react-native-razorpay`, `@zoom/meetingsdk-react-native`, `@react-native-firebase/messaging` + Notifee. Tests: Jest + React Native Testing Library.
- **API:** Node ≥ 22, Fastify 5, `fastify-type-provider-zod` + Zod, Drizzle ORM + `postgres`, `drizzle-kit` migrations, `jose` (JWKS verification), `razorpay` SDK, `@supabase/supabase-js` (admin user creation with the service role key, server only), Pino logs. Tests: Vitest with `app.inject()` against a separate test database (`TEST_DATABASE_URL`).
- **Admin:** React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS + shadcn/ui, React Hook Form + Zod, `tus-js-client`, `@supabase/supabase-js` (auth only). Tests: Vitest + Testing Library.

## 9. Non-functional requirements

- **Security:** secrets live only in `.env` files (git-ignored) and server config. The Supabase service role key, Razorpay key secret, Bunny keys, and Zoom secrets never ship in the app or admin bundle. Rate limit OTP-adjacent and order endpoints (`@fastify/rate-limit`, 30 requests/minute per user on `POST /v1/orders`).
- **Performance:** p95 API latency under 300 ms for catalog and access-check endpoints, measured from India against the Mumbai database.
- **Reliability:** payment processing is idempotent (FR-P4). External calls (Razorpay, Zoom, Bunny) have a 10-second timeout and return `502 UPSTREAM_ERROR` instead of hanging.
- **Logging:** structured Pino logs with request IDs. Never log tokens, OTPs, signatures, or Zoom passcodes.
- **Time:** stored in UTC, shown in Asia/Kolkata.
- **Hosting:** decided at launch (Phase 4). The API must be deployed in an India region close to Supabase `ap-south-1`.

## 10. Store and policy compliance

- **Google Play:** Play's Payments policy requires Google Play Billing for digital goods. India has an alternative-billing program that requires Play Console enrollment and may require offering Play Billing next to Razorpay. **Before the Play Store submission (Phase 4), confirm the current India rules for courses on Google's Play Console help pages and adjust the payment flow.** The API's payment code sits behind a provider interface so Play Billing can be added without changing enrollments.
- **Apple App Store:** Apple requires In-App Purchase for digital courses and group live classes. The iOS release, with IAP, is a later phase.
- **SMS OTP:** Indian SMS requires DLT registration of the sender ID and template with the SMS provider configured in Supabase Auth.

## 11. Accounts the client must set up

1. Supabase project in `ap-south-1` (Mumbai), with the phone provider turned on
2. SMS provider with DLT registration (MSG91, Twilio, or similar), connected to Supabase Auth
3. Bunny account: one Stream library (token authentication on) and one Storage zone with a pull zone (token authentication on)
4. Razorpay account with KYC done; test keys for development, a webhook secret
5. Zoom: a paid account, a Server-to-Server OAuth app (meeting create/update/delete scopes), and a Meeting SDK app
6. Firebase project for push notifications (Android app `com.flpworldwide.courseapp`)
7. Google Play developer account

## 12. Build phases

| Phase | Delivers | Done when |
|---|---|---|
| **1. Foundation** | Both folders scaffolded; `profiles` table; API auth (JWKS verification, `/v1/me`, admin guard, seed admin script); admin panel login and layout; mobile phone OTP login, profile setup, tab shell | A student signs up on the Android emulator and lands on Home; an admin logs in to the panel; a student account is refused by the panel |
| **2. Sell courses** | Catalog tables and API; admin course builder with Bunny uploads; mobile catalog, course detail, video/PDF player, progress; Razorpay orders, verify, webhook; My Learning; purchase history; admin students, assign/revoke, orders, refunds, dashboard | A Razorpay test-mode purchase on Android unlocks the course; a refund revokes it |
| **3. Live classes** | Zoom meeting management; admin scheduling and Start class; mobile live class list and in-app join; FCM reminders | A student who bought a class joins inside the app; a student who didn't cannot get a signature |
| **4. Launch and later** | Google Play billing compliance; hosting and deploy; Play Store release; then coupons, GST invoices, class recordings as lessons, iOS release with Apple IAP | App live on Play Store |

Each phase gets its own detailed implementation plan before work starts.

## 13. Out of scope for v1

Offline downloads, partial refunds, coupons, GST invoices, teacher accounts, single-device login limits, quizzes and certificates, chat or Q&A, iOS release, web app for students.
