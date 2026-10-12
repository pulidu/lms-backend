<div align="center">

# 🎓 Learning Management System — Backend

### Node.js + Express + TypeScript + MongoDB REST API for a Full-Stack MERN LMS

**Developer:** [Pulindu Godage](https://github.com/pulidu)

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-%20Mongoose%208.4-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

</div>

---

## 📖 Introduction

The **Learning Management System (LMS) — Backend** is the server-side API and data layer of a full-stack online university platform. It implements authentication, authorization, academics, assignments, attendance, marks, reports, notices, and an AI academic assistant behind a single RESTful Express application.

The frontend that consumes this API lives in the [LMS Frontend](https://github.com/pulidu/lms-frontend) repository.

**Deployed backend:** `https://lms-backend-cyan-eight.vercel.app`

---

## 🎯 Project Objectives

- Expose a **secure, role-aware REST API** for all LMS operations.
- Provide **JWT-based authentication** with refresh-token rotation and bcrypt password hashing.
- Model a university domain cleanly with **Mongoose**: users, profiles, courses, subjects, batches, enrollments, attendance, exams, marks, assignments, notices, timetables, payments, notifications, and more.
- Generate real value-adding outputs: **PDF** academic/attendance reports, **Excel** marks exports, and a **Gemini-powered AI assistant** grounded in each student's live records.
- Deploy as a scalable serverless backend on **Vercel**.

---

## ✅ Implemented Features

| Module | What is implemented |
| --- | --- |
| 🔐 **Authentication** | Login, email verification (6-digit codes + tokens), resend verification, forgot/reset password, forced password change on first login, refresh tokens |
| 👥 **User management** | Role-based account creation, listing, editing, and status control (active / suspended / disabled) |
| 🎓 **Academics** | Courses, subjects, batches, enrollments (unique per course+batch), attendance, exams, and marks with result publishing |
| 📝 **Assignments** | Create assignments with attachment, student file submissions, grading with feedback, attachment downloads |
| 📊 **Reports & exports** | Academic report (PDF), attendance report (PDF), marks export (Excel) |
| 🤖 **AI assistant** | Gemini chat for students grounded in their academic context, with an offline simulator fallback (English & Sinhala) |
| 📢 **Notices & management** | Announcements, timetables, payments, notifications, user management |
| ⚡ **Real-time** | Socket.IO server with notification & announcement broadcast helpers |
| 📧 **Email** | Nodemailer SMTP transport (with console-log simulation when unconfigured) |

---

## 🛠️ Technology Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| Web framework | Express 4.19 |
| Language | TypeScript 5.4 (dev runner `tsx`, compiler `tsc`) |
| Database/ODM | MongoDB Atlas, Mongoose 8.4 |
| Authentication | `jsonwebtoken` (JWT), bcryptjs |
| File uploads | Multer (memory storage, 10 MB cap, type allow-list) |
| Email | Nodemailer (SMTP) |
| Reports | PDFKit, ExcelJS |
| AI | Google Generative AI (`gemini-1.5-flash`) |
| Real-time | Socket.IO 4.7 |
| Middleware | Helmet, CORS, Morgan, dotenv |

---

## 🏗️ Architecture

```text
                 HTTP + JSON
Client (React) ─────────────► Express app (helmet, cors, morgan, json)
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
   /api/auth                    /api/academic               /api/assignments
   /api/notice                  /api/ai                      /api/reports
        │                            │                            │
        └────────── Router → Controller → Services/Models ────────┘
                                     │
                    ┌────────────────┴───────────────┐
                    ▼                              ▼
              MongoDB (Mongoose)          External: SMTP / Gemini / Socket.IO
```

Request flow: the `protect` middleware verifies the JWT and loads the user; the `authorize(...roles)` middleware then enforces role-based access before the controller runs. The centralized error middleware returns consistent JSON errors.

### Folder Structure

```text
backend/
├── src/
│   ├── config/             # MongoDB connection logic
│   ├── controllers/        # Request handlers (auth, academic, assignment, ai, notice, report)
│   ├── middleware/         # auth (JWT), role (RBAC), upload (Multer), error handler
│   ├── models/             # Mongoose schemas (5 files, ~17 collections)
│   ├── routes/             # REST route definitions
│   ├── seeders/            # Sample university data seeding
│   ├── services/           # AI (Gemini), email, PDF, Excel services
│   ├── socket/             # Socket.IO server + real-time helpers
│   ├── types/              # Shared TypeScript types
│   ├── app.ts              # Express app + route mounting
│   └── server.ts           # Bootstrap: DB connect, seeds, HTTP + Socket.IO
├── .env.example            # Safe example configuration (committed)
├── Dockerfile              # Production container
├── tsconfig.json
└── package.json
```

---

## 🗄️ Database

**MongoDB Atlas** via Mongoose 8.4. The connection is driven by the `MONGODB_URI` environment variable and configured in `src/config/db.ts`.

| Model file | Collections |
| --- | --- |
| `models/User.ts` | `users`, `emailverifications` |
| `models/Profiles.ts` | `studentprofiles`, `staffprofiles` |
| `models/Academics.ts` | `subjects`, `courses`, `batches`, `enrollments`, `attendances`, `exams`, `marks` |
| `models/Assignments.ts` | `assignments`, `assignmentsubmissions` |
| `models/Interactions.ts` | `notices`, `announcements`, `notifications`, `chathistories` |
| `models/Management.ts` | `timetables`, `payments`, `certificates`, `reports`, `activitylogs` |

Notable schema guarantees: unique subject/course codes, a compound unique index preventing duplicate enrollments, `password` fields stored with `select: false`, and role/status enums validated at the schema level.

---

## 🔐 Authentication & Authorization

1. **Login** (`POST /api/auth/login`) validates email + password. Pending-verification accounts trigger the 6-digit code flow.
2. **Access token** (JWT, expires in **1 day**) is sent as `Authorization: Bearer <token>`.
3. **Refresh token** (JWT, expires in **7 days**) is exchanged at `POST /api/auth/refresh-token` for a new pair.
4. Passwords are hashed with **bcrypt** (10 salt rounds) and excluded from query results by default.
5. **RBAC roles:** `admin`, `staff`, `lecturer`, `student` — enforced by the `authorize(...)` middleware on every protected route.
6. **Account states:** `pending`, `active`, `suspended`, `disabled` are enforced at login and on every protected request.

The `protect` middleware lives in `src/middleware/authMiddleware.ts`; role checks in `src/middleware/roleMiddleware.ts`.

---

## 🔌 API Endpoint Documentation

**Base URL:** `https://lms-backend-cyan-eight.vercel.app` · Local: `http://localhost:5003`

Legend: 🔓 public · route-level access column = allowed roles. All non-public routes require `Authorization: Bearer <accessToken>`.

### Server health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | 🔓 | Server health status |

### Auth — `/api/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | 🔓 | Sign in; returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/verify-email` | 🔓 | Verify email with 6-char code or token |
| POST | `/auth/resend-verification` | 🔓 | Resend verification email |
| POST | `/auth/forgot-password` | 🔓 | Request password reset email |
| POST | `/auth/reset-password` | 🔓 | Reset password with token |
| POST | `/auth/refresh-token` | 🔓 | Exchange refresh token for a new JWT pair |
| GET | `/auth/profile-image/:userId` | 🔓 | Serve a user's profile photo |
| POST | `/auth/register` | admin, staff | Register staff / students |
| PUT | `/auth/change-password` | any user | Change password (first-login flow) |
| GET | `/auth/profile` | any user | Get profile (+ role-specific profile) |
| PUT | `/auth/profile` | any user | Update profile — `multipart/form-data` |

### Academics — `/api/academic`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/academic/courses` | admin | Create course |
| GET | `/academic/courses` | any user | List courses |
| GET | `/academic/courses/:id` | any user | Get course by ID |
| PUT | `/academic/courses/:id` | admin | Update course |
| DELETE | `/academic/courses/:id` | admin | Delete course |
| POST | `/academic/courses/:courseId/email` | admin, staff, lecturer | Email students of a course |
| POST | `/academic/subjects` | admin | Create subject |
| GET | `/academic/subjects` | any user | List subjects |
| PUT | `/academic/subjects/:id` | admin | Update subject |
| DELETE | `/academic/subjects/:id` | admin | Delete subject |
| POST | `/academic/batches` | admin, staff | Create batch |
| GET | `/academic/courses/:courseId/batches` | any user | List batches of a course |
| PUT | `/academic/batches/:id` | admin, staff | Update batch |
| POST | `/academic/enrollments` | admin, staff, lecturer, student | Enroll a student |
| GET | `/academic/enrollments/:studentId` | any user | List a student's enrollments |
| GET | `/academic/enrollments/course/:courseId/batch/:batchId` | admin, staff, lecturer | Students in a course/batch |
| DELETE | `/academic/enrollments/:id` | admin, staff | Remove enrollment |
| GET | `/academic/students/subject/:subjectId` | admin, staff, lecturer | Students of a subject |
| POST | `/academic/attendance` | admin, staff, lecturer | Log attendance |
| GET | `/academic/attendance/subject/:subjectId` | admin, staff, lecturer | Attendance for a subject |
| GET | `/academic/attendance/my` | student | Student's own attendance |
| POST | `/academic/exams` | admin, staff, lecturer | Create exam |
| GET | `/academic/exams/subject/:subjectId` | any user | Exams for a subject |
| POST | `/academic/marks/publish` | admin, staff, lecturer | Publish results |
| GET | `/academic/marks/my` | student | Student's own marks/grades |
| GET | `/academic/marks/subject/:subjectId` | admin, staff, lecturer | Marks for a subject |

### Assignments — `/api/assignments`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/assignments/assignments` | admin, staff, lecturer | Create assignment — `multipart/form-data` |
| GET | `/assignments/assignments/subject/:subjectId` | any user | Assignments for a subject |
| GET | `/assignments/assignments/download/:id` | any user | Download assignment attachment |
| POST | `/assignments/submissions` | student | Submit assignment — `multipart/form-data` |
| GET | `/assignments/submissions/assignment/:assignmentId` | admin, staff, lecturer | Submissions for an assignment |
| GET | `/assignments/submissions/download/:id` | admin, staff, lecturer | Download a submission file |
| PUT | `/assignments/submissions/grade/:submissionId` | admin, staff, lecturer | Grade a submission (+ feedback) |

### AI assistant — `/api/ai`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/ai/chat` | student | Chat with the academic AI assistant |

### Reports — `/api/reports`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/reports/academic-pdf` | student | Download academic report (PDF) |
| GET | `/reports/attendance-pdf` | student | Download attendance report (PDF) |
| GET | `/reports/marks-excel/subject/:subjectId` | admin, staff, lecturer | Export marks workbook (Excel) |

### Notices & management — `/api/notice` (also mounted at `/api/notices`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/notice/announcements` | admin, staff, lecturer | Create announcement |
| GET | `/notice/announcements` | any user | List announcements |
| POST | `/notice/timetables` | admin, staff, lecturer | Create timetable slot |
| GET | `/notice/timetables/course/:courseId` | any user | Timetables for a course |
| POST | `/notice/payments` | admin | Create payment record |
| GET | `/notice/payments/student/:studentId` | any user | Payments of a student |
| GET | `/notice/notifications/my` | any user | Own notifications |
| PUT | `/notice/notifications/read/:id` | any user | Mark a notification read |
| GET | `/notice/users/all` | admin, staff, lecturer | List all users |
| PUT | `/notice/users/status/:userId` | admin, staff | Activate/suspend/disable a user |
| PUT | `/notice/users/edit/:userId` | admin, staff | Edit user details |

---

## 📊 Deployment Status (verified Oct 2026)

> Honest status of the live instance at `https://lms-backend-cyan-eight.vercel.app`:

| Check | Result |
| --- | --- |
| `GET /health` | ✅ **Verified working** — `200 {"status":"healthy"}` |
| CORS preflight (`OPTIONS`) | ✅ **Verified working** — `204` with `Access-Control-Allow-Origin: *` |
| `POST /api/auth/login` | ⚠️ **Blocked by database connectivity** — returned `500 Operation "users.findOne()" buffering timed out after 10000ms` |
| All other database-backed endpoints | ⚠️ **Untested on the deployed instance** — same MongoDB dependency means they are affected until the database is reachable |

**Root cause:** the deployed API process is healthy, but it cannot reach MongoDB. Fix in the Vercel **Environment Variables** (set `MONGODB_URI`) and in the Atlas **Network Access** panel (whitelist the deployment region / set `0.0.0.0/0` if acceptable), then redeploy. All endpoints are verified against source code and tested locally; the database dependency is the only thing blocking the deployed instance.

---

## ⚙️ Environment Variables

Safe reference: [`.env.example`](.env.example). Values below are placeholders — never commit real secrets.

| Variable | Required | Purpose | Example (placeholder) |
| --- | --- | --- | --- |
| `PORT` | No | HTTP port | `5003` |
| `NODE_ENV` | No | Environment mode | `development` |
| `MONGODB_URI` | Yes (prod) | MongoDB connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority` |
| `JWT_SECRET` | Recommended | Signs access tokens | `<a long random string>` |
| `JWT_REFRESH_SECRET` | Recommended | Signs refresh tokens | `<a different long random string>` |
| `FRONTEND_URL` | No | Origin for verification/reset email links | `http://localhost:5173` |
| `EMAIL_HOST` | No | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | No | SMTP port | `587` |
| `EMAIL_USER` | No | SMTP username (enables real email) | `your_email_address` |
| `EMAIL_PASS` | No | SMTP app password | `your_smtp_app_password` |
| `GEMINI_API_KEY` | No | Google Generative AI key for the AI assistant | `your_google_ai_api_key` |

> If `EMAIL_USER`/`EMAIL_PASS` are missing, emails are printed to the console (simulation). If `GEMINI_API_KEY` is missing/invalid, the AI assistant uses the built-in simulator.

---

## 🚀 Installation & Local Development

```bash
# 1. Clone
git clone https://github.com/pulidu/lms-backend.git
cd lms-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env   # then fill in MONGODB_URI, JWT secrets, etc.

# 4. Run locally (hot reload)
npm run dev
```

By default the server listens on **http://localhost:5003**.

On boot the server: (1) connects to MongoDB, (2) seeds a default admin account, (3) seeds sample university records when the database is fresh, and (4) starts HTTP + Socket.IO.

**MongoDB Atlas setup:** create a cluster, create a database user, copy the connection string into `MONGODB_URI`, and allow the connecting IP range in **Network Access**.

---

## 📦 Build & Production

```bash
npm run build     # tsc — compiles src/ → dist/
npm start         # node dist/server.js — runs the production build
```

Docker:

```bash
docker build -t lms-backend .
docker run -p 5003:5003 lms-backend
```

---

## ☁️ Vercel Deployment (Backend)

1. Push this repository to GitHub (`pulidu/lms-backend`).
2. Vercel → **Add New → Project** → import the repo.
3. Framework preset: **Node.js** (build `npm run build`; start `npm start` / `node dist/server.js`).
4. Set **Environment Variables** (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`).
5. Ensure the Atlas **Network Access** allows Vercel's IPs, then deploy.
6. Confirm with `curl https://lms-backend-cyan-eight.vercel.app/health`.

> [!WARNING]
> Serverless limitations: **Socket.IO** needs a persistent process (use a VM/container, or Vercel's Fluid/Node runtime) — serverless functions cannot host long-lived WebSockets. In-memory Multer buffering and PDF generation are also better suited to a container runtime.

---

## 🔗 CORS & Frontend Integration

The backend enables CORS for all origins by default (`cors()` with default options), so the deployed frontend can call the API from any origin — verified via a `204` preflight response.

The frontend is pre-configured to talk to this API. Two ways to point the frontend at the backend:

- **Vercel env var (recommended):** set `VITE_API_BASE_URL=https://lms-backend-cyan-eight.vercel.app` on the frontend project.
- **Committed default:** the frontend's `.env.production` already carries the same value.

When restricting CORS in production, add your frontend origin(s) to your own middleware allow-list.

---

## 🔒 Security Best Practices

Currently implemented:
- JWT access + refresh tokens with dedicated secrets; bcrypt hashing (10 rounds).
- RBAc middleware on every protected route; account-state checks (`suspended`/`disabled`) at login and per request.
- Helmet security headers; upload type allow-list with a 10 MB cap; `password` fields excluded from queries by default.

Recommended before production launch:
- Use **strong, unique, rotated** `JWT_SECRET` / `JWT_REFRESH_SECRET` from the platform secret manager.
- Remove hardcoded fallback credentials from source files (`src/config/db.ts`, `src/middleware/authMiddleware.ts`) and rely solely on environment variables.
- Restrict CORS to trusted origins; enforce HTTPS; sanitize/validate all inputs.
- Apply strict IP allow-listing on MongoDB Atlas.

---

## 🧰 Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Operation ... buffering timed out after 10000ms` | MongoDB unreachable — check `MONGODB_URI`, cluster running state, Atlas network rules |
| Server won't boot | Node 20+; `.env` present; `PORT` free |
| Login `401` | Wrong credentials or JWT secrets differ between token creation and verification |
| Emails not sent | Set `EMAIL_USER`/`EMAIL_PASS` (Gmail requires an app password); otherwise emails are logged to console |
| AI replies from the simulator | `GEMINI_API_KEY` missing/invalid — add a valid key to enable Gemini |
| No real-time events | Socket.IO needs a persistent server — not available on default Vercel serverless |
| CORS errors | Backend defaults to open CORS; if restricted, whitelist the frontend origin |

---

## 📚 Related Repositories

| Repository | Link |
| --- | --- |
| Frontend | https://github.com/pulidu/lms-frontend |
| Backend (this repo) | https://github.com/pulidu/lms-backend |

---

## 👨‍💻 Developer

<div align="center">

### Pulindu Godage

Full-Stack Developer (MERN) · Software Engineering

[![GitHub](https://img.shields.io/badge/GitHub-Pulindu-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/pulidu)

</div>

---

<div align="center">
Built with Node.js, Express, TypeScript, MongoDB and Socket.IO.
</div>