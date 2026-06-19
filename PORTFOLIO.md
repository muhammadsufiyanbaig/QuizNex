# QuizNex — Portfolio Case Study

> AI-powered proctored quiz platform for educational institutions with real-time monitoring, iris gaze tracking, and automated analytics.

---

## Overview

QuizNex is a full-stack SaaS web application built for schools, colleges, and training organizations to conduct secure, proctored online quizzes. It replaces manual exam invigilation with an automated, AI-assisted system that detects cheating attempts in real time, auto-grades objective questions, and gives detailed performance analytics to educators.

The platform supports three distinct user roles — Students, Teachers, and Organizations — each with their own dashboard, permissions, and feature set.

---

## Problem Solved

Traditional online quizzes have no proctoring. Students can:
- Switch tabs to look up answers
- Look away from the screen (phone, notes)
- Share screens with others
- Exit the exam window

QuizNex solves this with a multi-layer proctoring system that runs entirely in the browser — no software install required. Every suspicious event is logged, violations accumulate, and the system auto-flags or auto-submits if thresholds are crossed.

---

## Key Features

### Multi-Role System
- **Student** — join classrooms via invite key, take quizzes, view results and quiz history
- **Teacher** — create classrooms and quizzes, manage students, grade open-ended answers, view per-quiz and per-student analytics
- **Organization** — manage a pool of teachers, view cross-classroom analytics, export reports

### Authentication & Security
- Email + password with OTP email verification (10-minute expiry)
- Google OAuth (Sign in with Google)
- Mandatory TOTP-based 2FA for all users (Google Authenticator / Authy)
- Passkeys / WebAuthn (biometric login — fingerprint, Face ID, hardware key)
- Password reset via email link
- JWT sessions via NextAuth v5
- Edge-safe middleware with role-based route protection

### Quiz Engine
- Question types: MCQ, Open-ended Q&A, Mixed
- Per-question marks, optional image attachments
- Drag-and-drop question reorder
- Shuffle questions and answer options per attempt
- Configurable time limit with live countdown
- Scheduled activation — quiz auto-activates at a set date/time without any cron job
- Max attempts per student
- Answer auto-save every 30 seconds
- localStorage fallback — answers survive browser refresh and network drops

### Real-time System (SSE)
- Server-Sent Events stream at two levels: classroom and individual quiz
- When a teacher starts a quiz → all enrolled students see it activate instantly without refreshing
- When a teacher stops a quiz → all active student sessions auto-submit in real time
- No WebSocket server needed — works natively on AWS Amplify

### AI Question Generation
- Generate MCQ/Q&A questions from a **topic prompt** (e.g. "Newton's Laws of Motion — 10 MCQs")
- Generate questions from an **uploaded document** (PDF, DOCX, PPTX, TXT) — file stored in S3, processed by Gemini
- Refine and iterate generated questions in a chat-style conversation
- Powered by Google Gemini Pro + LangChain + LangGraph

### Proctoring System
- **Fullscreen enforcement** — exit triggers a logged violation event
- **Keyboard blocking** — blocks DevTools shortcuts (F12, Ctrl+Shift+I/J/C), tab close (Ctrl+W), new tab (Ctrl+T), refresh (Ctrl+R), right-click context menu
- **Tab/window visibility** — switching away from the tab is detected and logged
- **Real iris gaze tracking** — MediaPipe FaceMesh (478 facial landmarks) detects where the student is actually looking:
  - Iris center positions (landmarks 468, 473) measured relative to eye corners
  - Gaze ratio outside 0.30–0.70 of eye width = looking away from screen
  - No face detected = looking away
  - ≥10 gaze-away events in a rolling 60-second window → auto-flag + force submit
- All violations stored as timestamped proctoring events in the database
- Teachers can review the full violation log per attempt

### Analytics
- **Per-quiz**: attempt count, average score, difficulty classification (Easy/Medium/Hard), flagged attempts
- **Per-student**: quiz history, score trend, total violations
- **Classroom**: student leaderboard ranked by avg score, quiz performance bar chart, completion rate
- **Organization**: cross-classroom view of all teachers and their classroom performance
- **Per-question time heatmap**: color-coded matrix (green→red) showing how long each student spent on each question
- **Export**: CSV (server-generated) and PDF (client-side, landscape, auto-table layout)

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, SSR) |
| Language | TypeScript |
| Database | PostgreSQL via Neon DB (serverless) |
| ORM | Drizzle ORM |
| Auth | NextAuth v5 — JWT, OAuth, Passkeys, TOTP |
| AI | Google Gemini Pro + LangChain + LangGraph |
| Eye Tracking | TensorFlow.js + MediaPipe FaceMesh (478 landmarks) |
| File Storage | AWS S3 |
| Real-time | Server-Sent Events (SSE) |
| Deployment | AWS Amplify (SSR) |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| Email | Nodemailer (Gmail SMTP) |
| PDF Export | jsPDF + jsPDF-AutoTable |

---

## Architecture Highlights

### No Cron Jobs for Scheduled Quizzes
Scheduled quizzes use a "lazy activation" pattern. Instead of a background cron, the app checks `scheduledAt <= now` on every quiz fetch and upgrades the status to `ACTIVE` inline. Zero infrastructure overhead.

### SSE over WebSocket
AWS Amplify supports long-running SSE connections natively through its Node.js runtime. WebSockets would require a separate API Gateway + Lambda setup. SSE delivers the same real-time experience with far less infrastructure.

### Client-side PDF Generation
PDF reports are generated entirely in the browser using jsPDF — no server processing, no storage cost, instant download. The library is dynamically imported on click so it adds zero weight to the initial bundle.

### MediaPipe Iris Tracking in Browser
TensorFlow.js + MediaPipe FaceMesh runs the 478-point facial landmark model locally in the student's browser using WebGL. No video is ever sent to a server. The iris position is computed client-side every 2 seconds and compared against eye corner bounds to detect gaze direction.

### Edge-safe Auth Middleware
The NextAuth middleware (`proxy.ts`) runs on the Vercel/Amplify edge network — no Node.js, instant route protection. The full auth logic (DB queries, passkey verification, TOTP) runs in the Node.js runtime only when needed.

---

## Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | All users — role determines dashboard |
| `classrooms` | Teacher-owned rooms students join |
| `classroomStudents` | Many-to-many enrollment with status |
| `quizzes` | Quiz config — type, timer, status, schedule |
| `questions` | Per-quiz questions with type, marks, order |
| `questionOptions` | MCQ answer choices |
| `quizAttempts` | One per student per quiz — tracks score, status |
| `answers` | Per-question answers with time taken |
| `proctoringEvents` | Timestamped violation log per attempt |
| `notifications` | In-app notification feed |
| `passkeys` | WebAuthn credential storage |
| `totpSecrets` | Encrypted TOTP seeds |
| `emailVerifications` | OTP tokens for email verification |
| `passwordResets` | Single-use password reset tokens |
| `aiDocuments` | Uploaded documents for AI generation (S3 ref) |

---

## API Surface

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register + send OTP |
| POST | `/api/auth/verify-email-otp` | Verify email OTP |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Apply new password |
| GET/POST | `/api/auth/passkey/*` | WebAuthn register + authenticate |
| GET/POST | `/api/auth/2fa/*` | TOTP setup, enable, disable |
| GET/POST | `/api/classrooms` | List / create classrooms |
| PATCH/DELETE | `/api/classrooms/[id]` | Update / delete classroom |
| POST | `/api/classrooms/join` | Student joins via key |
| GET | `/api/classrooms/[id]/stream` | SSE — classroom quiz state |
| GET | `/api/classrooms/[id]/analytics/export` | CSV analytics export |
| GET/POST | `/api/quizzes` | List / create quizzes |
| PATCH | `/api/quizzes/[quizId]/status` | Start / stop / archive quiz |
| GET | `/api/quizzes/[quizId]/stream` | SSE — quiz status stream |
| POST | `/api/attempts` | Start quiz attempt |
| POST | `/api/attempts/[id]/answer` | Save answer |
| POST | `/api/attempts/[id]/submit` | Submit attempt |
| POST | `/api/attempts/[id]/events` | Log proctoring event |
| POST | `/api/upload/image` | Upload question image to S3 |
| POST | `/api/ai/generate-questions` | AI topic-based generation |
| POST | `/api/ai/generate-from-document` | AI document-based generation |
| POST | `/api/ai/refine` | Refine generated questions |
| GET | `/api/notifications` | Fetch notification feed |

---

## Challenges & Solutions

**Challenge:** `@simplewebauthn` v13 conflicts with `next-auth` peer dependency expecting v9.  
**Solution:** Added `.npmrc` with `legacy-peer-deps=true` — resolves automatically for all installs including CI/CD.

**Challenge:** MediaPipe FaceMesh WASM files too large to bundle with Next.js.  
**Solution:** Used CDN-hosted WASM (`cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4`) loaded at runtime. Zero bundle impact, works for online quiz environments.

**Challenge:** AWS Amplify doesn't support WebSockets natively.  
**Solution:** Replaced WebSocket with SSE. Amplify's Node.js runtime handles persistent SSE connections out of the box with `export const runtime = "nodejs"` and a 15-second heartbeat to keep connections alive.

**Challenge:** Student answers lost on network drop during quiz.  
**Solution:** Every answer change writes to `localStorage` keyed by `attemptId`. On remount, cached answers merge with server state (server wins on conflict). Cleared on submit.

---

## Screenshots / Demo

> *(Add screenshots or a Loom/YouTube link here)*

---

## GitHub

[github.com/muhammadsufiyanbaig/QuizNex](https://github.com/muhammadsufiyanbaig/QuizNex)

---

## What I Learned

- Building multi-tenant RBAC from scratch with Next.js App Router and NextAuth v5
- Running ML models (MediaPipe FaceMesh, TensorFlow.js) entirely client-side for privacy-preserving proctoring
- Designing real-time features (SSE) that work within the constraints of serverless/edge deployment
- Drizzle ORM schema design with complex relational data and push-based migrations
- Integrating LangChain + LangGraph for multi-step AI agents (document parsing → question generation → refinement loop)
- AWS S3 bucket policies, IAM roles, and CORS configuration for browser-direct uploads
