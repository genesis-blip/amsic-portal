# Barangay Amsic Portal

A full-stack web application for the barangay hall of Amsic, Angeles City, Pampanga.
It has two portals with their own log in:

- **Resident portal** (`/login`, `/register`): residents request documents and track
  them, report incidents, send an SOS, read the bulletin board and show a digital ID.
- **Staff portal** (`/staff/login`): barangay staff process requests from start to
  release, schedule pickups, issue official receipts, and keep records of residents,
  health visits, incidents, blotter cases, SOS calls and announcements. Each of the
  six roles (super admin, captain, secretary, treasurer, health worker, tanod) sees
  only the pages and buttons it is allowed to use; the API enforces the same rules.

**Stack:** React (Vite) + TypeScript + Tailwind CSS · Express · MongoDB Atlas + Mongoose

## Group members

| Member | GitHub | Main contribution |
|---|---|---|
| Shaine Bondoc | genesis-blip | Project setup, server core (Express, auth, roles, accounts), React layout, log in screens, residents module |
| Angela Fantastico | _username_ | Document types, document requests, pickup schedule and holidays, printed PDF documents, QR verification |
| Sean deGuzman | _username_ | Payments and official receipts, PayMongo QR Ph, Semaphore SMS, dashboard and reports |
| Ariane Mandani | _username_ | Resident portal (requests, incidents, SOS, digital ID), hotlines, Firebase data import |
| Aaliyah Austria | _username_ | Incidents, blotter, SOS alerts, bulletins and health records |

## Concept and what the app processes

The barangay hall issues clearances, residency and indigency certificates and other
documents, settles disputes, and responds to emergencies. The app does more than store
these records; it computes and enforces the rules the office follows:

| Data processing | Where |
|---|---|
| **Fees** — unit fee × copies, 20% senior citizen discount (age 60+), Certificate of Indigency free | `server/services/feeService.js` |
| **Pickup capacity** — 4 one-hour slots per weekday, 3 residents per slot, no weekends, holidays or same-day pickups, up to 60 days ahead; full slots cannot be double-booked | `server/services/scheduleService.js` |
| **Status rules** — received → processing → ready → released; a document cannot be released while unpaid; rejecting needs a reason; released/rejected/cancelled are final | `server/services/statusRules.js` |
| **Payments** — the amount must equal the request total, one payment per request, voiding reverts the request to unpaid, released requests cannot be voided | `server/controllers/paymentController.js` |
| **Date logic** — days until pickup, behind-schedule and unclaimed (7+ days) requests, blotter 15-day settlement deadline, vaccination and check-up follow-ups due or overdue | controllers + `services/dates.js` |
| **Statistics** — dashboard totals, requests by status, average turnaround, 6-month trend, collection summary by method/category/day, population demographics, SOS response times | `statsController`, `paymentController`, `residentController`, `sosAlertController` |
| **Scoring** — incident priority = urgency × 10 + days open, with "waiting too long" flags per urgency | `incidentController.js` |
| **Search, filter and sort** — residents by name/purok/sex/age group; requests by reference/name/purpose/status/document/payment/date | list endpoints |
| **Health** — BMI and category, blood pressure category | `models/HealthRecord.js` virtuals |
| **Access control** — bcrypt passwords, JWT sessions, 6 staff roles mapped to 22 capabilities, residents limited to their own records, lockout after 5 wrong passwords | `services/permissions.js`, `middleware/auth.js`, `controllers/authController.js` |

## Screenshots

Saved in `docs/screenshots/`.

| Screen | Image |
|---|---|
| Landing page | ![Landing page](docs/screenshots/landing.png) |
| Log in (resident and staff) | ![Log in](docs/screenshots/login.png) |
| Staff dashboard | ![Dashboard](docs/screenshots/dashboard.png) |
| New document request (fee preview and pickup slots) | ![New request](docs/screenshots/request-new.png) |
| Request detail (status, payment, PDF) | ![Request detail](docs/screenshots/request-detail.png) |
| Pickup schedule | ![Schedule](docs/screenshots/schedule.png) |
| Payments and collection summary | ![Payments](docs/screenshots/payments.png) |
| Resident portal | ![Resident portal](docs/screenshots/portal.png) |
| Printed PDF document | ![PDF](docs/screenshots/pdf.png) |
| Mobile view (375px) | ![Mobile](docs/screenshots/mobile.png) |

## Project structure

```
amsic-portal/
├── server/                 Express REST API
│   ├── app.js              configuration and route mounting only
│   ├── server.js           connects to MongoDB, then starts the server
│   ├── config/db.js
│   ├── models/             12 Mongoose schemas (incl. User)
│   ├── routes/             one express.Router() per resource
│   ├── controllers/        request handlers
│   ├── services/           business rules (fees, schedule, status, numbers, dates)
│   ├── middleware/         auth (requireAuth, can), requestLogger, validateObjectId, notFound, errorHandler
│   ├── utils/              asyncHandler, ApiError, query helpers
│   └── seed/               seed.js (sample data) and import-firebase.js (old portal data)
└── client/                 React + TypeScript + Tailwind
    └── src/
        ├── lib/http.ts     the single axios instance (axios.create + baseURL + login token)
        ├── auth/           AuthProvider, useAuth, RequireAuth (route guard by role)
        ├── api/            one module per resource
        ├── schemas/        Zod schemas (outside components) + z.infer types
        ├── hooks/          useApi, useDebounce, useToast, applyServerErrors
        ├── components/     layout and shared UI (Stamp, Modal, ConfirmDialog, States…)
        └── pages/          staff pages, portal/ (resident), auth/ (log in, register)
```

## Setup

Requirements: Node.js 18+ and a free MongoDB Atlas cluster. Commands below are for
**Windows Command Prompt**; on Mac/Linux use `cp` instead of `copy`.

### 1. Server

```cmd
cd server
npm install
copy .env.example .env
notepad .env
npm run seed
npm run dev
```

In `.env` set `MONGO_URI` (your Atlas connection string, ending in `/amsic_mern?...`)
and `JWT_SECRET` (any long random text). `npm run seed` loads sample data and the demo
accounts below (it deletes existing data). The API runs on http://localhost:5050.

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5050` | Port of the API |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/amsic_mern` | Atlas connection string, including the database name |
| `CLIENT_URL` | `http://localhost:5173` | Allowed origin(s) for CORS, comma-separated |
| `JWT_SECRET` | 64 random hex characters | Signs login tokens; keep it secret |
| `JWT_EXPIRES_IN` | `3650d` | How long a log in lasts (`3650d` = practically never expires) |
| `FIREBASE_HASH_*` | from the Firebase console | Only to let old Firebase accounts use their old password |
| `SEMAPHORE_API_KEY` | from semaphore.co → Account → API | SMS; empty = no SMS |
| `SEMAPHORE_SENDER_NAME` | `BRGYAMSIC` | Approved sender name; empty = Semaphore default |
| `LOGIN_OTP` | `on` / `off` | 6-digit SMS code after the password |
| `SMS_STATUS_UPDATES` | `on` / `off` | Text residents when their request status changes |
| `BARANGAY_CAPTAIN` | `Hon. Juan Dela Cruz` | Name signed on the PDFs (default: the active Captain account) |
| `PUBLIC_URL` | `https://amsic.example.com` | Address printed in the PDF QR code (default: `CLIENT_URL`) |
| `PAYMONGO_SECRET_KEY` | `sk_test_...` or `sk_live_...` | "Pay online" with QR Ph; empty = pay at the hall only |
| `OLD_MONGO_URI` | `mongodb+srv://.../amsic_portal` | Only for `npm run import:firebase -- --from-old-mongo` |

Client (`client/.env`):

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5050/api` | Base URL of the Express API used by the axios instance |

Atlas: create a database user, then **Network Access → Allow access from anywhere**
(or add your IP), then copy the driver connection string.

### 2. Client (second Command Prompt window)

```cmd
cd client
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173.

### Demo accounts (after `npm run seed`)

Password for all: `Amsic2026!`

| Portal | Username | Role |
|---|---|---|
| Staff (`/staff/login`) | `admin` | Super admin: everything, including staff accounts |
| Staff | `captain` | Captain: oversight, reports, bulletins |
| Staff | `secretary` | Secretary: residents, document requests, blotter |
| Staff | `treasurer` | Treasurer: payments and receipts |
| Staff | `health` | Health worker: health records, health bulletins |
| Staff | `tanod` | Tanod: SOS, incidents, blotter (view) |
| Resident (`/login`) | `resident` | A resident with request history |

### Optional: import the data and accounts of the old Firebase portal

Copies the real records of the old Firebase version (residents, accounts, document
requests, payments, incidents, blotter, SOS, bulletins, health records) into this
app's MongoDB, using this app's schema.

1. Copy `firebase_project\migration\serviceAccountKey.json` into `server\seed\`.
2. For old passwords to keep working, export the Firebase login accounts
   (needs the Firebase CLI, `npm install -g firebase-tools`, then `firebase login`):
   ```cmd
   firebase auth:export seed\auth-users.json --format=json --project YOUR_PROJECT_ID
   ```
   and copy the four values from Firebase console → Authentication → Users → ⋮ →
   **Password hash parameters** into `.env` (`FIREBASE_HASH_KEY`,
   `FIREBASE_HASH_SALT_SEPARATOR`, `FIREBASE_HASH_ROUNDS`, `FIREBASE_HASH_MEM_COST`).
3. Run (from `server`):
   ```cmd
   npm run import:firebase -- --wipe
   ```

- Usernames stay the same. With step 2, people log in with their old password; on that
  first log in it is saved again with bcrypt. Without step 2, each account gets a
  temporary password, listed in `server\seed\temporary-passwords.csv`, that must be
  changed on first log in. Delete that file after handing the passwords out.
- Firebase is only read; nothing there is changed.
- Records that need fixing (no purok, invalid phone, unknown pickup time) are fixed
  automatically; records that cannot be imported are skipped. Both are listed in
  `server\seed\import-report.txt`.
- If the old backend was already moved to MongoDB (old `MONGODB_SETUP.md`), set
  `OLD_MONGO_URI` in `.env` and run `npm run import:firebase -- --from-old-mongo --wipe`.
  `MONGO_URI` must use a **different** database name (e.g. `amsic_mern`).
- Philippine holidays (this year and next) are added to the pickup calendar
  automatically when the server starts, after `npm run seed` and after the import.
  Run `npm run seed:holidays` to add them by hand; Eid and Chinese New Year change
  every year, so close those days on the Pickup schedule page.
- `serviceAccountKey.json`, `auth-users.json` and `.env` are secrets: they are in
  `.gitignore`; never commit or share them.

## API documentation

Base URL: `http://localhost:5050/api`. All bodies are JSON. Every error has the shape
`{ "message": "...", "errors": { "field": "..." } }` (`errors` only for field problems).

Status codes: **200** OK · **201** created · **400** validation error, invalid ID or a
broken business rule · **401** not logged in or session expired · **403** your role or
account type may not do this · **404** record or route not found · **429** too many
wrong passwords · **500** server error.

Log in first, then send the token on every request:
`Authorization: Bearer <token>`. Public without a token: log in, register, the list of
document types, bulletins and pickup availability (used by the landing page).

### Log in and accounts

| Method | Path | Who | Purpose | Sample request | Sample response |
|---|---|---|---|---|---|
| POST | `/auth/login` | anyone | Log in to a portal | `{ username: "secretary", password: "Amsic2026!", portal: "staff" }` | `200 { token, user: { role, permissions: [...] } }` · `401 Invalid username or password` · `403` wrong portal |
| POST | `/auth/register` | anyone | Resident creates an account | `{ username, password, firstName, lastName, birthdate, sex, purok, address, contactNumber }` | `201 { token, user }` · `400 { errors: { username: "This username is already taken" } }` |
| GET | `/auth/me` | logged in | Current account | — | `200 { name, accountType, roleLabel, permissions }` |
| POST | `/auth/change-password` | logged in | Change password | `{ currentPassword, newPassword }` | `200` · `400 { errors: { currentPassword } }` |
| POST | `/auth/verify-otp` | anyone | Finish log in with the SMS code (when login returned `otpRequired`) | `{ otpToken, code: "482913" }` | `200 { token, user }` · `400 { errors: { code: "Wrong code. 4 tries left" } }` |
| POST | `/auth/forgot-password` | anyone | Text a 6-digit reset code to the mobile number on the account (same answer whether or not the account exists) | `{ username: "resident" }` | `200 { message, resetToken, expiresInMinutes: 10 }` · `503` SMS not set up |
| POST | `/auth/reset-password` | anyone | Set a new password with the texted code | `{ resetToken, code: "482913", newPassword: "NewPass123" }` | `200 { message, username }` · `400 { errors: { code: "Wrong code. 4 tries left" } }` |
| POST | `/auth/resend-otp` | anyone | New SMS code (once a minute) | `{ otpToken }` | `200` · `429` |
| PATCH | `/auth/me` | staff | My mobile number for log in codes | `{ mobile: "09171234567" }` | `200` |
| GET | `/accounts` | super admin / secretary | Staff or resident accounts | `?type=staff&search=` | `200 { items, total }` |
| POST | `/accounts` | super admin | New staff account | `{ firstName, lastName, username, role: "tanod" }` | `201 { account, temporaryPassword }` |
| PATCH | `/accounts/:id` | super admin / secretary | Role, activate, deactivate | `{ isActive: false }` | `200` |
| POST | `/accounts/:id/reset-password` | super admin / secretary | Temporary password | — | `200 { temporaryPassword }` |

### Resident portal (`/me`, resident accounts only)

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/me` | Profile and digital ID | — | `200 { name, accountType: "resident", resident: { residentNo, purok, address } }` |
| PATCH | `/me` | Update contact details | `{ contactNumber: "09171234567" }` | `200 {...}` · `400 { errors: { contactNumber } }` |
| GET | `/me/requests` | My document requests | `?status=pending&page=1` | `200 { items: [...], total: 4 }` |
| POST | `/me/requests` | File a request (resident is always me) | `{ documentType, purpose: "Employment", copies: 1, pickupDate: "2026-10-20", pickupSlot: "09:00-10:00" }` | `201 { referenceNumber: "BRG-2026-00062", status: "pending" }` · `400` slot full |
| POST | `/me/requests/quote` | Fee preview with my senior discount | `{ documentType, copies: 2 }` | `200 { subtotal: 80, discount: 16, total: 64 }` |
| GET | `/me/requests/:id` | One of my requests | — | `200 {...}` · `404` if it is someone else's |
| PATCH | `/me/requests/:id/cancel` | Cancel while still pending | — | `200 { status: "cancelled" }` · `400` |
| GET | `/me/incidents` | My incident reports | — | `200 { items: [...] }` |
| POST | `/me/incidents` | Report an incident | `{ type: "noise", description, location, occurredAt, urgency: "low" }` | `201 { status: "open" }` |
| GET | `/me/sos` | My SOS alerts | — | `200 { items: [...] }` |
| POST | `/me/sos` | Send an SOS | `{ emergencyType: "medical", message: "Help po", location: "Purok 2" }` | `201 { status: "active" }` · `400` one open alert only |
| GET | `/me/payments` | My official receipts | — | `200 { items: [{ orNumber, amount, method }] }` |
| GET | `/me/health-records` | My health center visits | — | `200 { items: [...] }` |
| GET | `/me/requests/:id/certificate` | Official PDF of my document (ready or released, and paid or free); add `?preview=1` for a watermarked preview at any stage | `?preview=1` | `200 application/pdf` · `400` not ready or unpaid (without `preview`) |
| GET | `/me/payment-options` | Whether online payment is on | — | `200 { online: true, testMode: true }` |
| POST | `/me/requests/:id/pay` | Make a PayMongo QR Ph code | — | `200 { paid: false, qrImage, amount: 96, expiresAt }` |
| GET | `/me/requests/:id/pay` | Check if it was paid | — | `200 { paid: true }` (receipt `OR-…` with method `qrph` is created) · `200 { paid: false, expired }` |
| POST | `/me/requests/:id/pay/simulate` | Test keys only: record a test payment | — | `200 { paid: true }` · `400` live keys |

The staff endpoints below need a staff token with the right role (see
`server/services/permissions.js`).

### Residents

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/residents` | List with search, filters, sort, paging | `?search=santos&purok=Purok 3&ageGroup=senior&sort=lastName&page=1` | `200 { items: [...], total: 6, page: 1, pages: 1 }` |
| GET | `/residents/demographics` | Population breakdown | — | `200 { total: 40, averageAge: 44.2, seniors: 6, voterRate: 83.3, ageBrackets: {...}, byPurok: [...] }` |
| GET | `/residents/:id` | One resident + activity summary | — | `200 { fullName, age, isSenior, summary: { totalRequests, totalPaid }, recentRequests }` · `404` |
| POST | `/residents` | Register a resident | `{ firstName, lastName, birthdate: "1950-03-10", sex: "female", purok: "Purok 2", address }` | `201 { residentNo: "AMS-2026-00041", ... }` · `400 { errors: { contactNumber } }` |
| PUT | `/residents/:id` | Update | `{ occupation: "Retired teacher" }` | `200 {...}` |
| DELETE | `/residents/:id` | Delete (blocked if active requests) | — | `200 { message: "Resident deleted" }` · `400` |

### Document types

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/document-types` | List with times requested | `?active=true` | `200 [{ code: "clearance", name, fee: 40, timesRequested: 17 }]` |
| GET | `/document-types/:id` | One type | — | `200 {...}` · `404` |
| POST | `/document-types` | Create | `{ code: "pwd", name: "PWD Certification", fee: 0, processingDays: 2 }` | `201 {...}` · `400 { errors: { code: "This code is already taken" } }` |
| PUT | `/document-types/:id` | Update | `{ fee: 50, isActive: false }` | `200 {...}` |
| DELETE | `/document-types/:id` | Delete if never requested | — | `200` · `400 "Set it as inactive instead"` |

### Document requests

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/document-requests` | List, search, filter, sort | `?status=pending,processing&paymentStatus=unpaid&sort=pickupDate` | `200 { items: [{ referenceNumber, fees, daysUntilPickup, isBehindSchedule, nextStatuses }], total }` |
| GET | `/document-requests/overdue` | Behind schedule and unclaimed | — | `200 { behindSchedule: [...], unclaimed: [...], total: 3 }` |
| POST | `/document-requests/quote` | Fee preview | `{ resident, documentType, copies: 3 }` | `200 { subtotal: 120, isSenior: true, discount: 24, total: 96 }` |
| GET | `/document-requests/:id` | One request with receipts | — | `200 {..., payments: [...] }` · `404` |
| POST | `/document-requests` | File a request (computes fee, checks slot) | `{ resident, documentType, purpose: "Employment", copies: 1, pickupDate: "2026-10-20", pickupSlot: "13:00-14:00" }` | `201 { referenceNumber: "BRG-2026-00062", fees: {...} }` · `400 "The 13:00-14:00 slot on 2026-10-20 is already full"` |
| PUT | `/document-requests/:id` | Edit while still pending (fee recomputed) | `{ copies: 3, pickupDate: "2026-10-21" }` | `200 {...}` · `400 "Only pending requests can be edited"` |
| PATCH | `/document-requests/:id/status` | Rule-based status change | `{ status: "released" }` | `200 {...}` · `400 "Cannot release: ₱96.00 is still unpaid"` |
| DELETE | `/document-requests/:id` | Delete if unpaid and not released | — | `200` · `400` |

### Payments

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/payments` | List receipts | `?from=2026-10-01&to=2026-10-31&method=gcash&voided=false` | `200 { items: [{ orNumber, amount, method }], total }` |
| GET | `/payments/summary` | Collection report | `?from=2026-10-01&to=2026-10-31` | `200 { totalCollected: 3052, averagePayment: 82.49, byMethod, byCategory, byDay, bestDay }` |
| GET | `/payments/:id` | One receipt | — | `200 {...}` · `404` |
| POST | `/payments` | Record a payment | `{ request: "<id>", amount: 96, method: "cash" }` | `201 { orNumber: "OR-2026-00040" }` · `400 "Amount must be exactly ₱96.00"` |
| PATCH | `/payments/:id/void` | Void a receipt | `{ reason: "Wrong payer" }` | `200 { isVoided: true }` · `400` |

### Schedules

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/schedules/availability` | Slots left on a day | `?date=2026-10-20` | `200 { isOpen: true, slots: [{ slot: "08:00-09:00", remaining: 2 }], totalRemaining: 9, isFull: false }` |
| GET | `/schedules/calendar` | Remaining slots for each day of a month | `?month=2026-10` | `200 { days: [...], openDays: 15, fullDays: 1 }` |
| GET | `/schedules/blocks` | Upcoming closed days | — | `200 [{ date, reason: "Bonifacio Day" }]` |
| POST | `/schedules/blocks` | Close a day | `{ date: "2026-11-30", reason: "Bonifacio Day" }` | `201 {...}` · `400` |
| DELETE | `/schedules/blocks/:id` | Reopen a day | — | `200` · `404` |

### Incidents

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/incidents` | List, sorted by priority | `?status=open,under_review&sort=priority` | `200 { items: [{ priorityScore: 31, isStale: true, daysOpen: 1 }] }` |
| GET | `/incidents/:id` | One report | — | `200` · `404` |
| POST | `/incidents` | Report an incident | `{ reporterName, type: "noise", description, location, occurredAt: "2026-10-08", urgency: "high" }` | `201 {...}` · `400 { errors: { occurredAt } }` |
| PUT | `/incidents/:id` | Edit while open | `{ urgency: "critical" }` | `200` |
| PATCH | `/incidents/:id/status` | Review, resolve, dismiss | `{ status: "resolved", resolutionNotes: "Talked to the owner" }` | `200` · `400` |
| DELETE | `/incidents/:id` | Delete | — | `200` |

### Blotter

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/blotters` | List cases with deadlines | `?status=filed,for_hearing` | `200 { items: [{ caseNumber, daysToDeadline: 9, isPastDeadline: false }] }` |
| GET | `/blotters/:id` | One case with log | — | `200` · `404` |
| POST | `/blotters` | File a complaint | `{ complainantName, respondentName, nature: "Unpaid debt", details, incidentDate }` | `201 { caseNumber: "BLT-2026-0006" }` |
| PUT | `/blotters/:id` | Edit open case | `{ details: "..." }` | `200` |
| PATCH | `/blotters/:id/status` | Hearing, mediation, settle… | `{ status: "for_hearing", hearingDate: "2026-10-15" }` | `200` · `400 "Hearing date must be in the future"` |
| POST | `/blotters/:id/actions` | Add to the case log | `{ action: "Summons served", note: "Received by wife" }` | `201` |
| DELETE | `/blotters/:id` | Delete | — | `200` |

### SOS alerts

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/sos-alerts` | List | `?status=active,acknowledged` | `200 { items: [{ minutesWaiting: 12 }] }` |
| GET | `/sos-alerts/metrics` | Response times | — | `200 { averageResponseMinutes: 4.8, averageResolutionMinutes: 36, active: 1 }` |
| GET | `/sos-alerts/:id` | One alert | — | `200` · `404` |
| POST | `/sos-alerts` | Log an emergency (one open alert per resident) | `{ resident, emergencyType: "medical", message, location }` | `201` · `400` |
| PATCH | `/sos-alerts/:id/status` | Acknowledge / resolve | `{ status: "acknowledged" }` | `200 { responseMinutes: 3.2 }` |
| DELETE | `/sos-alerts/:id` | Delete | — | `200` |

### Bulletins, health records, statistics

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/bulletins` | Pinned first, expired hidden | `?category=event&includeExpired=true` | `200 [{ title, isPinned, isExpired }]` |
| GET | `/bulletins/:id` | One post | — | `200` · `404` |
| POST | `/bulletins` | Post | `{ title, content, category: "event", eventDate: "2026-10-18" }` | `201` · `400 { errors: { expiresAt } }` |
| PUT | `/bulletins/:id` | Edit | `{ isPinned: true }` | `200` |
| DELETE | `/bulletins/:id` | Delete | — | `200` |
| GET | `/health-records` | List visits | `?recordType=vaccination` | `200 { items: [{ bmi: 24.2, bmiCategory: "normal", bloodPressureCategory: "high" }] }` |
| GET | `/health-records/due` | Follow-ups due or overdue | `?days=30` | `200 { overdue: [...], upcoming: [...] }` |
| GET | `/health-records/:id` | One visit | — | `200` · `404` |
| POST | `/health-records` | Record a visit | `{ resident, recordType: "checkup", visitDate, weightKg: 70, heightCm: 170 }` | `201` · `400 { errors: { vaccineName } }` |
| PUT | `/health-records/:id` | Edit | `{ nextDueDate: "2026-11-08" }` | `200` |
| DELETE | `/health-records/:id` | Delete | — | `200` |
| GET | `/stats/overview` | Dashboard numbers | — | `200 { requests: { byStatus, avgTurnaroundDays, unpaidBalance }, collections, trend }` |
| GET | `/health` | Server check | — | `200 { status: "ok" }` |

Also: `GET /document-requests/:id/certificate` (staff, `documents.view`, `?preview=1` for the watermarked preview) returns the same PDF, and the public `GET /verify/:referenceNumber` returns `{ document, issuedTo: "Juan D.", status, valid, issuedAt }`.

**Total: 94 endpoints** (13 log in and account, 17 resident portal; full CRUD on residents, document types, requests, incidents,
blotters, bulletins and health records; 13 processing endpoints).

## Features

- Separate log in for residents and staff; resident sign-up that links to an existing census record
- Forgot password: a 6-digit code is texted (Semaphore) to the mobile number on the account, then the user sets a new password; 10-minute expiry, 5 tries, one code per minute
- Six staff roles; menus, pages and buttons follow the role; super admin manages staff accounts, secretary manages resident accounts (deactivate, temporary passwords)
- Resident portal: request and track documents, cancel, report incidents, SOS with location, digital ID, contact details, receipts, health visits
- Soft copy (PDF) of every requested document, filled in with the requester's name, age, civil status and address (certificate of residency, indigency, good moral character, clearance, business clearance, endorsement, Barangay ID card…). Right after filing, the resident can view a watermarked "Preview only" PDF online; once the request is ready and paid, the official PDF can be viewed online or downloaded, and staff print it from the request page. Each PDF has a QR code that opens the public `/verify/<reference>` page
- Optional SMS through Semaphore: 6-digit log in code, and a text when a request is processing, ready or released
- Optional online payment through PayMongo QR Ph (GCash, Maya, bank apps); the payment becomes an official receipt for the treasurer automatically
- Landing page with live pickup availability, fees and announcements
- Dashboard: today's pickups, collections, unpaid balance, follow-ups, trends
- Document requests with live fee preview, slot picker, status stamps, history and receipts
- Pickup calendar with remaining slots per day and closed days
- Payments with collection summary, void with reason
- Residents with search, filters and activity summary
- Health records with BMI, blood pressure category and due follow-ups
- Incidents sorted by priority, blotter cases with deadlines and a case log, SOS response times
- Bulletin board, document types, printable reports
- Every screen has loading, error (with Try again) and empty states; every create, update and delete shows a toast; every delete asks first
- Responsive down to 375px; tables turn into stacked cards on phones

## Known limitations

- Online payments use **PayMongo test mode** (`sk_test_` key) for this project: the QR Ph codes are real PayMongo test codes but no real money moves, and real GCash or Maya apps cannot pay them. During the demo the "Simulate a successful payment" button (shown only with test keys) marks the payment as paid. Going live only needs a verified PayMongo account and an `sk_live_` key.
- Forgot password works by SMS only; accounts without a mobile number (and the demo accounts, whose `0900…` numbers are never texted) are reset by staff at the barangay hall. There is no email reset.
- The login token is kept in the browser (localStorage with "Remember me", otherwise sessionStorage).
- Online payment checks PayMongo every 5 seconds while the QR is on screen (no webhook, so it also works on localhost).
- SMS needs internet access and Semaphore credits; each text uses one credit.
- No file uploads (IDs, photos of incidents).
- Times are computed in Philippine time (UTC+8).
- The calendar endpoint checks each day separately, which is fine for one month but would need an aggregation for large ranges.
