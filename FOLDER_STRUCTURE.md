# QuizNex — Folder Structure Documentation

## Root

```
QuizNex/
├── .env.local              # Local environment variables (gitignored)
├── .env.example            # Template for environment variables
├── .gitignore
├── drizzle.config.ts       # Drizzle Kit config (schema path, DB dialect, output dir)
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS configuration
├── eslint.config.mjs       # ESLint configuration
├── package.json
├── drizzle/                # Auto-generated SQL migration files (drizzle-kit output)
├── public/                 # Static assets (favicon, images)
├── Project Brief.txt       # Original project brief
├── SRS.md                  # Software Requirements Specification
└── src/                    # All application source code
```

---

## `src/` — Application Source

```
src/
├── app/                    # Next.js App Router (pages + API routes)
├── components/             # Reusable React components
├── config/                 # App-level constants and configuration
├── hooks/                  # Custom React hooks
├── lib/                    # Core libraries (DB, auth, AI, validations)
├── store/                  # Zustand global state stores
├── types/                  # TypeScript type definitions
└── middleware.ts            # Next.js middleware (route protection by role)
```

---

## `src/app/` — Next.js App Router

```
app/
├── layout.tsx              # Root layout (fonts, global providers)
├── page.tsx                # Landing page (marketing / redirect)
├── globals.css             # Global Tailwind styles
│
├── (auth)/                 # Auth route group — no dashboard layout
│   ├── layout.tsx          # Centered card layout for auth pages
│   ├── login/
│   │   └── page.tsx        # Login form
│   ├── register/
│   │   └── page.tsx        # Registration form (role selector)
│   ├── forgot-password/
│   │   └── page.tsx        # Request password reset
│   └── reset-password/
│       └── page.tsx        # New password form (token from email)
│
├── (dashboard)/            # Protected dashboard route group
│   ├── layout.tsx          # Shared dashboard shell (sidebar + topbar)
│   │
│   ├── student/            # Student dashboard pages
│   │   ├── page.tsx        # Student home — enrolled classrooms + active quizzes
│   │   ├── classrooms/
│   │   │   ├── page.tsx    # All classrooms list
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Single classroom view (quizzes list)
│   │   ├── quiz/
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Quiz detail / start quiz CTA
│   │   └── results/
│   │       └── [attemptId]/
│   │           └── page.tsx  # Post-quiz result and answer review
│   │
│   ├── teacher/            # Teacher dashboard pages
│   │   ├── page.tsx        # Teacher home — classroom cards + stats
│   │   ├── classrooms/
│   │   │   ├── page.tsx    # All classrooms list + create button
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Classroom detail (students + quizzes)
│   │   │       └── analytics/
│   │   │           └── page.tsx    # Classroom-level analytics
│   │   ├── quiz/
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create quiz (with AI agent panel)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Quiz detail (questions list, publish/start)
│   │   │       ├── edit/
│   │   │       │   └── page.tsx    # Edit quiz metadata
│   │   │       └── analytics/
│   │   │           └── page.tsx    # Quiz-level analytics + student heatmap
│   │   └── analytics/
│   │       └── page.tsx    # Teacher-wide analytics overview
│   │
│   └── organization/       # Organization dashboard pages
│       ├── page.tsx        # Org home — summary stats
│       ├── teachers/
│       │   ├── page.tsx    # All teachers list + invite button
│       │   └── [id]/
│       │       └── page.tsx  # Individual teacher details
│       └── analytics/
│           └── page.tsx    # Org-wide aggregate analytics
│
├── quiz-session/           # Fullscreen quiz session (no dashboard layout!)
│   └── [attemptId]/
│       └── page.tsx        # Active quiz UI (fullscreen, proctored)
│
└── api/                    # Next.js API Route Handlers
    ├── auth/
    │   ├── [...nextauth]/
    │   │   └── route.ts    # NextAuth v5 handler
    │   ├── register/
    │   │   └── route.ts    # POST /api/auth/register
    │   ├── verify-email/
    │   │   └── route.ts    # GET /api/auth/verify-email?token=
    │   ├── forgot-password/
    │   │   └── route.ts    # POST /api/auth/forgot-password
    │   └── reset-password/
    │       └── route.ts    # POST /api/auth/reset-password
    │
    ├── classrooms/
    │   ├── route.ts                        # GET (list), POST (create)
    │   ├── join/
    │   │   └── route.ts                    # POST /api/classrooms/join (by key)
    │   └── [id]/
    │       ├── route.ts                    # GET, PATCH, DELETE
    │       ├── students/
    │       │   └── route.ts                # GET (list), POST (add manually)
    │       ├── students/[studentId]/
    │       │   └── route.ts                # DELETE (remove student)
    │       └── regenerate-key/
    │           └── route.ts                # POST (regenerate join key)
    │
    ├── invitations/
    │   ├── route.ts                        # POST (send invites)
    │   └── [token]/
    │       └── route.ts                    # GET (accept invitation)
    │
    ├── quizzes/
    │   ├── route.ts                        # POST (create quiz)
    │   └── [id]/
    │       ├── route.ts                    # GET, PATCH, DELETE
    │       ├── publish/
    │       │   └── route.ts                # POST (publish quiz)
    │       ├── start/
    │       │   └── route.ts                # POST (teacher starts quiz)
    │       ├── stop/
    │       │   └── route.ts                # POST (teacher force-stops quiz)
    │       └── questions/
    │           └── route.ts                # GET (list), POST (add question)
    │
    ├── questions/
    │   └── [id]/
    │       └── route.ts                    # PATCH (edit), DELETE
    │
    ├── attempts/
    │   ├── route.ts                        # POST (start attempt)
    │   └── [id]/
    │       ├── route.ts                    # GET (attempt state)
    │       ├── answers/
    │       │   └── route.ts                # POST (save answer / auto-save)
    │       ├── submit/
    │       │   └── route.ts                # POST (final submit)
    │       └── proctoring/
    │           └── route.ts                # POST (log proctoring event)
    │
    ├── analytics/
    │   ├── quiz/[id]/
    │   │   └── route.ts                    # GET quiz-level analytics
    │   ├── classroom/[id]/
    │   │   └── route.ts                    # GET classroom-level analytics
    │   └── organization/
    │       └── route.ts                    # GET org-wide analytics
    │
    ├── ai/
    │   ├── generate-questions/
    │   │   └── route.ts                    # POST (topic-based generation)
    │   └── generate-from-document/
    │       └── route.ts                    # POST (upload + doc-based generation)
    │
    └── organizations/
        ├── route.ts                        # GET (own org), POST (create org profile)
        ├── teachers/
        │   └── route.ts                    # GET (list teachers), POST (invite teacher)
        └── teachers/[id]/
            └── route.ts                    # DELETE (remove teacher from org)
```

---

## `src/components/` — Reusable Components

```
components/
├── ui/                     # Generic, design-system primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── badge.tsx
│   ├── toast.tsx
│   ├── spinner.tsx
│   ├── table.tsx
│   └── ...
│
├── layout/                 # Structural layout components
│   ├── sidebar.tsx         # Role-aware navigation sidebar
│   ├── topbar.tsx          # Top header with user menu
│   └── page-header.tsx     # Page title + breadcrumb
│
├── auth/                   # Authentication forms
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── forgot-password-form.tsx
│   └── reset-password-form.tsx
│
├── classroom/              # Classroom-related components
│   ├── classroom-card.tsx
│   ├── classroom-form.tsx
│   ├── join-key-display.tsx
│   ├── invite-students-form.tsx
│   └── students-table.tsx
│
├── quiz/                   # Quiz management components
│   ├── quiz-card.tsx
│   ├── quiz-form.tsx
│   ├── question-form.tsx
│   ├── question-list.tsx
│   ├── mcq-options-editor.tsx
│   └── quiz-status-badge.tsx
│
├── quiz-session/           # Active quiz session UI (fullscreen)
│   ├── quiz-session-shell.tsx   # Outer shell (fullscreen enforcer)
│   ├── question-display.tsx     # Shows current question
│   ├── mcq-answer.tsx           # MCQ option selector
│   ├── qa-answer.tsx            # Text answer input
│   ├── timer-display.tsx        # Countdown timer
│   ├── question-navigator.tsx   # Question list sidebar
│   ├── camera-preview.tsx       # Corner webcam feed
│   ├── fullscreen-warning.tsx   # Modal on fullscreen exit
│   └── proctor-engine.tsx       # TF.js eye-tracking controller
│
├── analytics/              # Charts and analytics displays
│   ├── score-distribution-chart.tsx
│   ├── quiz-stats-card.tsx
│   ├── student-time-heatmap.tsx
│   ├── student-score-chart.tsx
│   └── classroom-ranking-table.tsx
│
└── ai-agent/               # AI quiz generation UI
    ├── ai-agent-panel.tsx       # Sidebar panel shown in quiz editor
    ├── topic-input-form.tsx     # Topic + options input
    ├── document-upload-form.tsx # File upload for doc-based generation
    └── generated-questions-review.tsx  # Review, add, reject AI questions
```

---

## `src/lib/` — Core Libraries

```
lib/
├── db/
│   ├── schema.ts           # Drizzle schema — all tables, enums, relations
│   └── index.ts            # Drizzle client (Neon serverless connection)
│
├── auth/
│   ├── config.ts           # NextAuth v5 configuration (providers, callbacks)
│   └── utils.ts            # hashPassword, verifyPassword, generateToken
│
├── validations/
│   ├── auth.ts             # Zod schemas for register, login, password reset
│   ├── classroom.ts        # Zod schemas for classroom create, invite, join
│   └── quiz.ts             # Zod schemas for quiz, question, answer submit
│
├── ai/
│   ├── gemini.ts           # ChatGoogleGenerativeAI instance setup
│   ├── quiz-generator.ts   # LangGraph graph for topic-based question gen
│   └── document-processor.ts  # Text extraction + LangChain pipeline for docs
│
├── proctoring/
│   └── eye-tracker.ts      # TF.js Face Landmarks Detection wrapper
│                           # (client-only, gaze detection logic)
│
├── email/
│   └── index.ts            # Nodemailer/SendGrid — sendInvite, sendVerify, etc.
│
└── cloudinary/
    └── index.ts            # Cloudinary SDK init + uploadDocument helper
```

---

## `src/store/` — Zustand State Stores

```
store/
├── auth.store.ts           # Current user session (client-side cache)
└── quiz-session.store.ts   # Active quiz state (answers, timer, violations)
```

---

## `src/hooks/` — Custom React Hooks

```
hooks/
├── use-fullscreen.ts       # Manages document.fullscreenElement + events
├── use-camera.ts           # getUserMedia wrapper with permission handling
├── use-timer.ts            # Countdown/countup timer with pause/resume
├── use-proctoring.ts       # Orchestrates eye-tracker + violation logic
└── use-auto-save.ts        # Periodic answer auto-save with debounce
```

---

## `src/types/` — TypeScript Types

```
types/
├── index.ts                # Re-exports all domain types
├── auth.ts                 # Role, SessionUser
├── classroom.ts            # Classroom, EnrolledStudent, ClassroomWithStats
├── quiz.ts                 # Quiz, Question, Option, QuizAttempt, Answer,
│                           # ProctoringEvent, ActiveQuizState
└── analytics.ts            # QuizLevelAnalytics, QuestionAnalytics,
                            # StudentTimeHeatmapRow, ClassroomAnalytics
```

---

## `src/config/` — App Configuration

```
config/
└── index.ts                # APP_CONFIG — proctoring thresholds, upload limits,
                            # invitation expiry, join key format, etc.
```

---

## `drizzle/` — Database Migrations

```
drizzle/
└── *.sql                   # Auto-generated migration files (drizzle-kit generate)
```

---

## Key Architectural Decisions

| Decision | Detail |
|---|---|
| Route Groups | `(auth)` and `(dashboard)` use Next.js route groups for separate layouts without affecting URLs |
| `quiz-session` outside `(dashboard)` | The quiz session has its own fullscreen layout — no sidebar/topbar |
| API Routes | All data mutations go through `/api/` route handlers for consistent validation and auth checks |
| Shared Zod schemas | `src/lib/validations/` schemas are used on both client (React Hook Form) and server (API validation) |
| Client-only proctoring | `src/lib/proctoring/eye-tracker.ts` and all `quiz-session` components run TF.js in-browser only |
| Drizzle relations | Explicit `relations()` definitions in `schema.ts` power Drizzle's relational query API |
| Zustand for quiz state | Quiz session state (timer, answers, violations) is in Zustand for fast client-side updates; synced to server via auto-save API calls |
