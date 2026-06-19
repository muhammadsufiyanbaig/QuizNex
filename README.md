# QuizNex

AI-powered proctored quiz platform for educational institutions. Teachers create quizzes, students take them under real-time proctoring, organizations manage their teachers and view analytics.

---

## Features

### Roles
- **Student** — join classrooms, take quizzes, view results and history
- **Teacher** — create classrooms, build quizzes, grade Q&A, view analytics
- **Organization** — manage teachers, view org-wide analytics, export reports

### Authentication
- Email + password with OTP email verification
- Google OAuth
- TOTP-based 2FA (mandatory after registration)
- Passkeys (WebAuthn)
- Password reset via email

### Quiz Engine
- Question types: MCQ, Q&A, Mixed
- Per-question marks, image attachments (AWS S3)
- Drag-and-drop question reorder
- Shuffle questions and options per attempt
- Time limit with live countdown
- Scheduled activation (`scheduledAt`) — auto-activates when time arrives
- Manual start/stop by teacher
- Answer auto-save every 30 seconds + localStorage fallback (survives network drops)

### Proctoring
- Mandatory fullscreen — exit triggers violation event
- Keyboard blocking (DevTools, Ctrl+W, context menu)
- Tab/window visibility detection
- Real iris gaze tracking via MediaPipe FaceMesh (478 landmarks, iris indices 468 + 473)
  - Gaze ratio outside 0.30–0.70 of eye width = gaze-away event
  - ≥10 gaze-away events in 60 seconds → auto-flag and submit
- All violations logged as proctoring events in DB

### Real-time
- SSE streams at `/api/classrooms/[id]/stream` and `/api/quizzes/[quizId]/stream`
- Students see quiz activate live without refresh
- Teacher stopping quiz auto-submits all active sessions

### AI
- Generate questions from a topic prompt (Gemini via LangChain)
- Generate questions from uploaded document (PDF, DOCX, PPTX, TXT) — stored in S3
- Refine/iterate generated questions in a conversation

### Analytics
- Per-quiz: attempt count, avg score, difficulty label, flagged count
- Per-student: quiz history, score timeline, proctoring events
- Classroom: student rankings, quiz performance trend chart, per-question time heatmap
- Organization: cross-classroom analytics
- Export: CSV (server) + PDF (client-side, jspdf)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Database | Neon DB (PostgreSQL, serverless) |
| ORM | Drizzle ORM |
| Auth | NextAuth v5 (JWT sessions) |
| AI | Google Gemini + LangChain + LangGraph |
| File Storage | AWS S3 |
| Eye Tracking | TensorFlow.js + MediaPipe FaceMesh |
| Deployment | AWS Amplify |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Forms | React Hook Form + Zod |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, verify-email, 2FA setup, passkeys
│   ├── (dashboard)/
│   │   ├── student/     # Classrooms, quiz session, results, quiz history
│   │   ├── teacher/     # Classrooms, quiz editor, grading, analytics
│   │   ├── organization/ # Teacher management, org analytics
│   │   └── settings/    # Security: 2FA, passkeys
│   └── api/             # REST API routes
├── components/
│   ├── analytics/       # Export buttons (CSV + PDF)
│   ├── dashboard/       # Sidebar, notification bell
│   ├── profile/         # Shared profile page component
│   └── quiz/            # ClassroomQuizWatcher (SSE client)
├── lib/
│   ├── ai/              # Gemini client, quiz generator
│   ├── auth/            # Passkey, TOTP, session, utils
│   ├── db/              # Drizzle client + schema
│   ├── email/           # Nodemailer (Gmail)
│   ├── s3.ts            # AWS S3 upload/delete helpers
│   ├── quiz-utils.ts    # autoActivateIfScheduled
│   └── notifications.ts # Notification insert helper
├── store/
│   └── quiz-session.store.ts  # Zustand store for active quiz state
└── types/               # Domain types (auth, quiz, classroom, analytics)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Database (Neon)
DATABASE_URL=

# Auth
AUTH_SECRET=           # generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google Gemini (AI)
GOOGLE_API_KEY=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=quiznex-uploads
AWS_CLOUDFRONT_URL=    # optional

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email (Gmail App Password)
EMAIL_APP_PASSWORD=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> If `EMAIL_APP_PASSWORD` / `EMAIL_FROM` are not set, OTPs print to the server console for development.

---

## Setup

```bash
# Install
npm install --legacy-peer-deps

# Push schema to DB
npx drizzle-kit push

# Dev server
npm run dev
```

### AWS S3 Bucket
1. Create bucket (e.g. `quiznex-uploads`), same region as Amplify
2. Block public access: **OFF**
3. Add bucket policy allowing `s3:GetObject` on `/*`
4. IAM → create user → attach `AmazonS3FullAccess` → create access key → copy to `.env.local`

---

## Database

Schema is in `src/lib/db/schema.ts`. Always use:

```bash
npx drizzle-kit push      # apply changes
npx drizzle-kit studio    # browse data
```

Never use `drizzle-kit migrate` — this project uses push-based schema management.

---

## Deployment (AWS Amplify)

1. Push to GitHub
2. Amplify Console → New App → connect repo
3. Build settings — framework: Next.js (SSR)
4. Add all env vars from `.env.local`
5. Deploy

SSE routes use `export const runtime = "nodejs"` and work natively on Amplify. No WebSocket/API Gateway needed.
