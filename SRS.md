# Software Requirements Specification (SRS)

# QuizNex — AI-Powered Proctored Quiz Platform

**Version:** 1.0
**Date:** 2026-03-15
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Roles &amp; Personas](#3-user-roles--personas)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 Authentication & Authorization
   - 4.2 Organization Module
   - 4.3 Teacher Module
   - 4.4 Classroom Management
   - 4.5 Quiz Management
   - 4.6 Quiz Session & Proctoring
   - 4.7 Student Module
   - 4.8 AI Agent Module
   - 4.9 Analytics Module
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [External Interface Requirements](#6-external-interface-requirements)
7. [System Constraints](#7-system-constraints)
8. [Data Models (Conceptual)](#8-data-models-conceptual)
9. [Tech Stack Mapping](#9-tech-stack-mapping)
10. [Appendix — Glossary](#10-appendix--glossary)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for **QuizNex**, an AI-powered, browser-based quiz and assessment platform that supports three distinct user roles — Student, Teacher, and Organization. The document is intended for developers, designers, QA engineers, and stakeholders involved in building the product.

### 1.2 Scope

QuizNex enables teachers to create and manage classrooms and quizzes, proctors students during live quiz sessions using camera-based eye-tracking (TensorFlow.js), and offers AI-assisted quiz generation from topics or uploaded documents. Organizations can onboard and manage multiple teachers and gain aggregate analytics across their institution.

### 1.3 Definitions & Acronyms

| Term            | Definition                                                           |
| --------------- | -------------------------------------------------------------------- |
| SRS             | Software Requirements Specification                                  |
| MCQ             | Multiple Choice Question                                             |
| Q&A             | Short/Long Answer Question                                           |
| AI Agent        | LLM-powered assistant (Gemini via LangChain/LangGraph)               |
| Classroom       | A virtual room created by a teacher, containing students and quizzes |
| Unique Key      | A classroom-specific join code shared with students                  |
| Proctoring      | Automated monitoring of students during quiz sessions                |
| Eye-tracking    | TensorFlow.js-powered gaze detection via webcam                      |
| Fullscreen Lock | Enforced browser fullscreen that triggers penalties if exited        |
| Neon DB         | Serverless PostgreSQL database                                       |

### 1.4 References

- Project Brief (QuizNex, March 2026)
- Next.js 14+ Documentation
- TensorFlow.js — Face Landmarks Detection
- LangChain / LangGraph Documentation
- Cloudinary API Documentation
- Neon DB (PostgreSQL) Documentation

---

## 2. Overall Description

### 2.1 Product Perspective

QuizNex is a standalone web application built on Next.js with a serverless PostgreSQL backend (Neon DB). It operates in three tiers:

- **Frontend:** Next.js (React) + Zustand for state management
- **Backend:** Next.js API Routes / Server Actions
- **AI Layer:** LangChain/LangGraph orchestrating Gemini models
- **Storage:** Cloudinary (documents, PDFs, PPTs)
- **Proctoring:** TensorFlow.js (in-browser, client-side)

### 2.2 Product Functions (High-Level)

1. Role-based user authentication and onboarding
2. Classroom creation and student enrollment
3. Multi-type quiz creation (MCQ, Q&A)
4. Timed, fullscreen-enforced quiz sessions
5. Real-time camera-based proctoring with eye-tracking violations
6. AI-powered quiz question generation (topic or document-based)
7. Post-quiz analytics for teachers and organizations

### 2.3 User Classes and Characteristics

| User Class         | Technical Level | Primary Goal                                        |
| ------------------ | --------------- | --------------------------------------------------- |
| Student            | Low–Medium     | Attempt quizzes fairly; view results                |
| Teacher            | Medium          | Create content, manage students, review performance |
| Organization Admin | Medium          | Manage teachers; view institutional analytics       |

### 2.4 Assumptions and Dependencies

- Students use modern Chromium-based or Firefox browsers that support the Fullscreen API and WebRTC (camera access).
- Camera access is required for students during quiz sessions; quiz cannot begin without it.
- All AI generation requires a valid Gemini API key configured server-side.
- Cloudinary is used only for uploaded documents (PPT, PDF, DOCX, TXT); it does not store quiz media.
- Neon DB is the sole persistent data store.

---

## 3. User Roles & Personas

### 3.1 Student

A learner enrolled in one or more classrooms. Students:

- Join classrooms using a unique key or email invitation
- Attempt quizzes within assigned classrooms
- Are subject to proctoring (fullscreen lock + eye-tracking)
- Can view their own results and performance history

### 3.2 Teacher

An educator who creates and manages content. Teachers:

- Create classrooms and invite/add students
- Design quizzes (manually or via AI agent)
- Monitor and analyze student performance per quiz
- View per-student, per-question analytics

### 3.3 Organization

An institutional entity (school, coaching center, company). Organizations:

- Register on the platform and onboard teachers
- Have an admin dashboard showing all teachers under the org
- View aggregate analytics across classrooms, teachers, and students
- Cannot directly create quizzes or classrooms (delegated to teachers)

---

## 4. Functional Requirements

---

### 4.1 Authentication & Authorization

#### FR-AUTH-01: User Registration

- Any new user can register by providing name, email, password, and role (Student / Teacher / Organization).
- Email verification is required before account activation.
- Passwords must be hashed (bcrypt/argon2) before storage.

#### FR-AUTH-02: User Login

- Users log in with email + password.
- JWT or session-based authentication with secure cookie storage.
- Role is encoded in the session/token to enforce route-level access control.

#### FR-AUTH-03: Role-Based Access Control (RBAC)

- Each route and API endpoint is protected by the user's role.
- Students cannot access teacher or organization dashboards.
- Teachers cannot access organization-level management routes.
- Organizations cannot directly access quiz-creation flows.

#### FR-AUTH-04: Password Reset

- Users can request a password reset via email link.
- Reset links expire after 1 hour.

---

### 4.2 Organization Module

#### FR-ORG-01: Organization Profile

- Organization can create and update their profile (name, logo, description, contact info).

#### FR-ORG-02: Teacher Onboarding

- Organization admin can invite teachers by email.
- Invited teacher receives an email with a registration/accept link tied to the organization.
- Teacher can accept or reject the invitation.

#### FR-ORG-03: Teacher Management

- Organization can view all teachers under their account.
- Organization can remove a teacher from their organization.
- Removing a teacher does not delete the teacher's account; only the org-teacher association is removed.
- Organization can view each teacher's classrooms, quizzes, and student counts.

#### FR-ORG-04: Student Visibility

- Organization can view all students enrolled in classrooms created by their teachers.
- Organization cannot directly enroll or remove students.

#### FR-ORG-05: Organization Analytics Dashboard

- Organization can see aggregate analytics:
  - Total teachers, classrooms, students, quizzes
  - Average quiz scores across the organization
  - Top-performing and low-performing students
  - Teacher-wise performance summaries
  - Quiz completion rates
  - (See Section 4.9 for full analytics specs)

---

### 4.3 Teacher Module

#### FR-TCH-01: Teacher Dashboard

- After login, teacher lands on a dashboard showing:
  - All classrooms they manage
  - Upcoming/ongoing/completed quizzes
  - Quick-access to analytics

#### FR-TCH-02: Organization Association

- A teacher may belong to one organization or be independent.
- When affiliated with an org, their data is visible to that org's admin.

---

### 4.4 Classroom Management

#### FR-CLS-01: Create Classroom

- Teacher can create a classroom by providing:
  - Classroom name
  - Description (optional)
  - Subject/Topic (optional)
- On creation, a **unique alphanumeric join key** (e.g., `AX7-K29`) is automatically generated.
- The join key is unique platform-wide.

#### FR-CLS-02: Classroom Join Key

- The unique key is displayed in the classroom settings.
- Teacher can regenerate the key (old key becomes invalid immediately).
- Teacher can share the key with students directly.

#### FR-CLS-03: Add Students Manually

- Teacher can add students to a classroom by entering their registered email addresses.
- If the email matches a registered student account, they are added directly.
- If the email does not exist, an invitation email is sent (see FR-CLS-04).

#### FR-CLS-04: Invite Students via Email

- Teacher can send email invitations to one or multiple students.
- Invitation email contains:
  - Classroom name and description
  - A unique invitation link valid for 7 days
  - The classroom join key
- Student can create an account and join, or if already registered, accept the invite to join.

#### FR-CLS-05: Student Self-Join via Key

- A logged-in student can join a classroom by entering the unique join key on their dashboard.
- The key must be active (not regenerated/expired).

#### FR-CLS-06: View Classroom Members

- Teacher can view all enrolled students with:
  - Name, email
  - Date joined
  - Number of quizzes attempted
  - Overall average score

#### FR-CLS-07: Remove Student from Classroom

- Teacher can remove a student from a classroom.
- Removed student's past quiz records within the classroom are retained for historical reporting.

#### FR-CLS-08: Archive / Delete Classroom

- Teacher can archive a classroom (no new activity but history is preserved).
- Teacher can delete a classroom (all associated quizzes and results are permanently deleted — confirmation required).

---

### 4.5 Quiz Management

#### FR-QZ-01: Create Quiz

- Within a classroom, teacher can create a quiz by providing:
  - Quiz title
  - Description (optional)
  - Quiz type: **MCQ**, **Q&A (Short/Long Answer)**, or **Mixed**
  - Total marks
  - Time limit (in minutes, mandatory)
  - Scheduled start date/time (optional; can also be started manually)
  - Number of attempts allowed (default: 1)
  - Shuffle questions (yes/no)
  - Shuffle MCQ options (yes/no)

#### FR-QZ-02: Add Questions Manually

- Teacher can add questions one by one:
  - **MCQ:** Question text, 2–6 options, mark correct answer(s), assign marks, optional image attachment.
  - **Q&A:** Question text, model answer (for teacher reference), assign marks, optional image.
- Questions can be reordered via drag-and-drop.

#### FR-QZ-03: Edit / Delete Questions

- Teacher can edit or delete any question before the quiz is published.
- Once a quiz is **active or completed**, questions cannot be edited (only the quiz can be closed/archived).

#### FR-QZ-04: Publish / Unpublish Quiz

- Teacher explicitly publishes a quiz to make it visible to students.
- Unpublished quizzes are drafts invisible to students.

#### FR-QZ-05: Start / Stop Quiz

- Teacher can manually start a quiz (overriding scheduled time).
- Starting the quiz broadcasts an "active" state to enrolled students.
- Teacher can forcefully stop a quiz; all in-progress student sessions are terminated and auto-submitted.

#### FR-QZ-06: Multiple Quizzes Per Classroom

- A classroom can contain unlimited quizzes.
- Quizzes are listed chronologically; teacher can reorder their display.

---

### 4.6 Quiz Session & Proctoring

This section covers all behaviors during an active student quiz attempt.

#### FR-SES-01: Quiz Availability

- A student can only see and start a quiz if:
  1. The quiz is published.
  2. The quiz is in "active" state (teacher started it or scheduled time is reached).
  3. The student has not exhausted allowed attempts.

#### FR-SES-02: Pre-Quiz Camera Permission

- Before the quiz begins, the platform requests camera access.
- If the student denies camera access, the quiz **cannot start** and an error message is shown: *"Camera access is required to attempt this quiz."*
- Camera feed is displayed in a small corner window throughout the session for student awareness.

#### FR-SES-03: Fullscreen Enforcement

- On quiz start:
  1. The browser is programmatically forced into fullscreen mode (Fullscreen API).
  2. A countdown (3–2–1) is shown before the quiz timer starts.
  3. The student's screen is fully occupied by the quiz interface.

#### FR-SES-04: Restricted Keys

- During a quiz session, the following key inputs are intercepted and blocked:
  - All function keys: `F1` – `F12`
  - `Escape`
  - `Alt + Tab` (where browser APIs permit)
  - `Ctrl + W`, `Ctrl + T`, `Ctrl + N` (tab/window close/new)
  - `Windows` key / `Meta` key
  - Right-click context menu is disabled
  - Browser developer tools shortcuts (`F12`, `Ctrl+Shift+I`)
- Blocked key presses are silently ignored (no system action taken).

#### FR-SES-05: Fullscreen Exit — Quiz Termination

- If the student exits fullscreen by any means (browser back button, manually exiting, OS gesture):
  1. The quiz is **immediately paused** — the timer freezes at the current elapsed time.
  2. A warning modal appears: *"You exited fullscreen. Your quiz has been paused. Re-enter fullscreen to continue."*
  3. The student's current answers up to that point are auto-saved.
  4. A **violation event** is logged with a timestamp.

#### FR-SES-06: Quiz Resume After Fullscreen Violation

- The student can re-enter fullscreen to resume:
  1. Student clicks "Resume Quiz" on the warning modal.
  2. Fullscreen is re-engaged.
  3. The timer **resumes from exactly where it was paused** (not restarted).
  4. Previously answered questions retain their answers.
- This is intentional: time lost during the violation is not compensated.

#### FR-SES-07: Timer

- A visible countdown timer is shown at the top of the quiz.
- When the timer reaches zero, the quiz is **auto-submitted** with all current answers.
- Timer state is stored server-side (or in a secure, tamper-resistant client state synced to the server) to prevent manipulation.

#### FR-SES-08: Auto-Save Answers

- Student answers are auto-saved every 30 seconds and on every answer change.
- On connection loss, local storage is used as fallback; answers are synced on reconnect.

#### FR-SES-09: Eye-Tracking Proctoring (TensorFlow.js)

- Once the quiz starts, TensorFlow.js Face Landmarks Detection runs in-browser on the webcam feed.
- The system tracks gaze direction and detects when the student's eyes move away from the screen.
- **Violation threshold:** If eye-away events are detected ≥ **10 times within any rolling 60-second window**, the system triggers a violation.
- On violation:
  1. The quiz is **immediately terminated and submitted** with current answers.
  2. The student's result is marked as **"FLAGGED — AUTO-FAILED"**.
  3. A notification is sent to the teacher.
  4. The violation log (timestamps of each gaze-away event) is stored and visible to the teacher in analytics.
- Each individual gaze-away event (below the threshold) is logged but does not trigger termination.

#### FR-SES-10: Manual Quiz Submission

- Student can submit the quiz manually before time expires.
- A confirmation dialog asks: *"Are you sure you want to submit? You have [X] unanswered questions."*

#### FR-SES-11: Post-Submission Result

- After submission, student sees:
  - Total score and percentage
  - Correct/incorrect answers (if teacher enabled result visibility)
  - Time taken
  - Whether they were flagged

---

### 4.7 Student Module

#### FR-STU-01: Student Dashboard

- After login, student sees:
  - All classrooms they are enrolled in
  - Upcoming and active quizzes
  - Past quiz results

#### FR-STU-02: Join Classroom

- Student can join a classroom by entering a valid unique join key.
- Student can accept email invitations to join.

#### FR-STU-03: View Quiz History

- Student can view all past quiz attempts within a classroom:
  - Score, percentage, time taken, status (Pass/Fail/Flagged)
  - Detailed answer review (if teacher enables it)

#### FR-STU-04: Profile Management

- Student can update their name, profile picture, and password.

---

### 4.8 AI Agent Module

The AI agent is powered by LangChain/LangGraph orchestrating Google's Gemini model. It assists teachers in question generation.

#### FR-AI-01: Topic-Based Question Generation

- When creating or editing a quiz, teacher can access the AI Agent panel.
- Teacher enters a **topic** (e.g., "Newton's Laws of Motion", "World War II causes").
- Teacher selects:
  - Question type: MCQ, Q&A, or Mixed
  - Number of questions to generate (e.g., 5, 10, 20)
  - Difficulty level: Easy, Medium, Hard
- The AI agent generates questions with:
  - **MCQ:** Question text, 4 options, correct answer marked, suggested marks
  - **Q&A:** Question text, model answer, suggested marks
- Generated questions are shown in a review panel — teacher can:
  - **Add** individual questions to the quiz
  - **Add All** questions at once
  - **Reject/Skip** any question
  - **Regenerate** a specific question
  - **Edit** a question before adding it

#### FR-AI-02: Document-Based Question Generation

- Teacher can upload documents for AI-based question extraction.
- **Supported formats:** PDF, DOCX, TXT, PPT/PPTX
- **Storage:** Files are uploaded to Cloudinary; the URL/text content is passed to the LangChain pipeline.
- Processing flow:
  1. File is uploaded to Cloudinary.
  2. Text is extracted from the document (PDF parsing, PPTX text extraction, etc.).
  3. Extracted text is chunked and sent to the LangChain/LangGraph pipeline with Gemini.
  4. AI generates questions based on the document content.
- Teacher selects question type and count (same as FR-AI-01).
- Generated questions follow the same review-and-add flow as FR-AI-01.

#### FR-AI-03: AI Agent State Management

- The AI agent session is stateful (LangGraph manages context).
- Teacher can ask the agent to refine questions: *"Make these questions harder"*, *"Focus more on chapter 3"*.
- Conversation history within a quiz-creation session is preserved until the teacher closes the panel or saves the quiz.

#### FR-AI-04: AI Error Handling

- If the AI service is unavailable, a user-friendly message is shown: *"AI generation is temporarily unavailable. Please try again later."*
- Partial results (if the API returns some but not all questions) are still shown to the teacher.

---

### 4.9 Analytics Module

#### FR-AN-01: Teacher — Quiz-Level Analytics

Per quiz, teacher can see:

- Total students who attempted vs. enrolled
- Average score, highest score, lowest score, median score
- Score distribution chart (histogram)
- Pass/fail ratio
- Average time taken to complete the quiz

#### FR-AN-02: Teacher — Question-Level Analytics

Per question within a quiz:

- Percentage of students who answered correctly
- For MCQ: distribution of which option was chosen
- **Time-per-question:** Average time each student spent on each question
- **Slowest question:** Which question took the most time across all students
- **Per-student time heatmap:** A table showing each student vs. each question with time spent

#### FR-AN-03: Teacher — Student-Level Analytics

For each student within a classroom:

- All quiz scores over time (line chart)
- Per-quiz: score, time taken, number of violations, flagged status
- Detailed answer sheet: each question, the student's answer, correct answer, marks awarded
- Proctoring log: all fullscreen violations and eye-tracking violation events with timestamps

#### FR-AN-04: Teacher — Classroom-Level Analytics

- Overall classroom performance trends over time
- Student ranking within the classroom
- Quiz difficulty assessment (based on average score per quiz)
- Engagement metrics (quiz attempt rates)

#### FR-AN-05: Organization — Aggregate Analytics

- All metrics from FR-AN-01 through FR-AN-04, aggregated across all teachers' classrooms under the organization
- Teacher comparison: performance of students in Teacher A's classrooms vs. Teacher B's
- Organization-wide leaderboards
- Export analytics data as CSV/PDF reports

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement                           | Target                               |
| ------------------------------------- | ------------------------------------ |
| Page load (initial)                   | < 2 seconds on a 10 Mbps connection  |
| Quiz start (fullscreen + camera init) | < 3 seconds                          |
| AI question generation (10 questions) | < 15 seconds                         |
| Answer auto-save latency              | < 500ms                              |
| Analytics dashboard load              | < 3 seconds                          |
| TensorFlow.js model initialization    | < 5 seconds (run once at quiz start) |

### 5.2 Scalability

- The platform must support **500 concurrent quiz sessions** in a classroom without degradation.
- Neon DB connection pooling must be configured for serverless cold-start environments.
- AI agent calls must be rate-limited and queued to prevent Gemini API quota exhaustion.

### 5.3 Security

- All API routes validate user session and role before processing.
- Zod is used for all input validation on both client and server.
- File uploads are validated server-side for MIME type and file size (max 20 MB per upload).
- Quiz session state (timer, answers) must be validated server-side; client state is not trusted for scoring.
- Eye-tracking data (gaze events) stays client-side (TensorFlow.js); only aggregated violation counts are sent to the server.
- Camera feed is **never transmitted** to the server — all proctoring is in-browser only.

### 5.4 Reliability

- Quiz sessions must tolerate brief network disconnections (< 30 seconds) without data loss (local answer buffering).
- Neon DB connections should use retry logic with exponential backoff.
- Cloudinary uploads should have a 3-retry policy on failure.

### 5.5 Usability

- The quiz interface must be fully responsive and usable on a 13-inch laptop screen minimum.
- Fullscreen mode must work on Chrome, Firefox, and Edge (latest 2 major versions).
- Eye-tracking must work under normal indoor lighting conditions (not requiring specialized hardware).
- All error messages must be user-friendly and actionable.

### 5.6 Accessibility

- The platform must meet WCAG 2.1 Level AA for all non-proctored pages (dashboard, quiz management, analytics).
- Quiz session pages are exempted from fullscreen/key-restriction accessibility requirements by design, but alternative accommodation flows can be added in a future version.

### 5.7 Maintainability

- Code must follow a consistent file and folder convention (Next.js App Router structure).
- Zod schemas must be shared between client and server (single source of truth).
- LangChain/LangGraph chains must be modular and independently testable.

---

## 6. External Interface Requirements

### 6.1 User Interface

- Built in Next.js using React components.
- Global state managed by Zustand (auth state, active quiz state, classroom state).
- Responsive design; optimized for 1280×800 and above.

### 6.2 Hardware Interfaces

- **Webcam:** Required for quiz proctoring. Any standard USB or integrated webcam is sufficient.
- **Keyboard:** Standard keyboard; special keys are blocked via JavaScript event listeners.
- **Display:** Minimum 1024×768 resolution for fullscreen quiz mode.

### 6.3 Software Interfaces

| System                        | Purpose                    | Integration Method                              |
| ----------------------------- | -------------------------- | ----------------------------------------------- |
| Neon DB (PostgreSQL)          | Persistent data storage    | Prisma ORM or `@neondatabase/serverless`      |
| Cloudinary                    | Document/file storage      | Cloudinary Node.js SDK / REST API               |
| Google Gemini (via LangChain) | AI question generation     | LangChain `ChatGoogleGenerativeAI`            |
| TensorFlow.js                 | In-browser eye tracking    | `@tensorflow-models/face-landmarks-detection` |
| Email Service (SMTP/SendGrid) | Invitations, notifications | Nodemailer or SendGrid API                      |

### 6.4 Communication Interfaces

- HTTPS for all client-server communication.
- WebSockets or Server-Sent Events (SSE) for real-time quiz state broadcasts (quiz start/stop, timer sync).

---

## 7. System Constraints

1. **Browser-Only Proctoring:** Eye-tracking and key blocking are browser-enforced; they can be bypassed on mobile or by a technically sophisticated user using a second device. This is a known constraint.
2. **Camera Privacy:** The camera feed is processed entirely in the browser. No video is recorded or transmitted. This is both a privacy safeguard and a technical constraint (no server-side video analysis).
3. **AI Dependency:** AI question generation depends on Google Gemini API availability. The platform must degrade gracefully when the AI service is down.
4. **Cloudinary Free Tier Limits:** Large organizations may need a paid Cloudinary plan for high-volume document uploads.
5. **Neon DB Serverless Cold Start:** Free-tier Neon DB instances may have cold-start latency; production deployments should use paid plans or connection poolers (PgBouncer).
6. **Fullscreen API Limitations:** Some browsers require a user gesture to enter fullscreen. The quiz-start button serves as this gesture. Programmatic fullscreen without a user gesture will be blocked.

---

## 8. Data Models (Conceptual)

### 8.1 User

```
User {
  id            UUID PK
  name          String
  email         String UNIQUE
  passwordHash  String
  role          Enum(STUDENT, TEACHER, ORGANIZATION)
  createdAt     DateTime
  updatedAt     DateTime
}
```

### 8.2 Organization

```
Organization {
  id          UUID PK
  userId      UUID FK → User
  name        String
  logoUrl     String?
  description String?
}
```

### 8.3 OrgTeacher (Association)

```
OrgTeacher {
  id             UUID PK
  orgId          UUID FK → Organization
  teacherId      UUID FK → User
  status         Enum(PENDING, ACTIVE, REMOVED)
  invitedAt      DateTime
  acceptedAt     DateTime?
}
```

### 8.4 Classroom

```
Classroom {
  id          UUID PK
  teacherId   UUID FK → User
  name        String
  description String?
  subject     String?
  joinKey     String UNIQUE
  isArchived  Boolean
  createdAt   DateTime
}
```

### 8.5 ClassroomStudent (Enrollment)

```
ClassroomStudent {
  id           UUID PK
  classroomId  UUID FK → Classroom
  studentId    UUID FK → User
  joinedAt     DateTime
  status       Enum(ACTIVE, REMOVED)
}
```

### 8.6 Quiz

```
Quiz {
  id              UUID PK
  classroomId     UUID FK → Classroom
  title           String
  description     String?
  type            Enum(MCQ, QA, MIXED)
  totalMarks      Int
  timeLimitMins   Int
  scheduledAt     DateTime?
  status          Enum(DRAFT, PUBLISHED, ACTIVE, COMPLETED, ARCHIVED)
  shuffleQ        Boolean
  shuffleOptions  Boolean
  maxAttempts     Int default(1)
  showResults     Boolean
  createdAt       DateTime
}
```

### 8.7 Question

```
Question {
  id            UUID PK
  quizId        UUID FK → Quiz
  text          String
  type          Enum(MCQ, QA)
  imageUrl      String?
  marks         Int
  order         Int
  modelAnswer   String?   // for Q&A
}
```

### 8.8 Option (MCQ only)

```
Option {
  id         UUID PK
  questionId UUID FK → Question
  text       String
  isCorrect  Boolean
}
```

### 8.9 QuizAttempt

```
QuizAttempt {
  id               UUID PK
  quizId           UUID FK → Quiz
  studentId        UUID FK → User
  startedAt        DateTime
  submittedAt      DateTime?
  timerElapsedSecs Int
  status           Enum(IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, FLAGGED)
  totalScore       Float?
  isFlagged        Boolean default(false)
  flagReason       String?
}
```

### 8.10 Answer

```
Answer {
  id            UUID PK
  attemptId     UUID FK → QuizAttempt
  questionId    UUID FK → Question
  selectedOpt   UUID? FK → Option   // for MCQ
  textAnswer    String?              // for Q&A
  timeTakenSecs Int
  marksAwarded  Float?
}
```

### 8.11 ProctoringEvent

```
ProctoringEvent {
  id          UUID PK
  attemptId   UUID FK → QuizAttempt
  type        Enum(FULLSCREEN_EXIT, GAZE_AWAY, KEY_BLOCKED)
  occurredAt  DateTime
  metadata    JSON?
}
```

### 8.12 AIDocument (Uploaded files for AI generation)

```
AIDocument {
  id            UUID PK
  teacherId     UUID FK → User
  fileName      String
  fileType      Enum(PDF, DOCX, TXT, PPT)
  cloudinaryUrl String
  uploadedAt    DateTime
}
```

### 8.13 Invitation

```
Invitation {
  id           UUID PK
  classroomId  UUID FK → Classroom
  email        String
  token        String UNIQUE
  expiresAt    DateTime
  acceptedAt   DateTime?
  status       Enum(PENDING, ACCEPTED, EXPIRED)
}
```

---

## 9. Tech Stack Mapping

| Requirement        | Technology                               | Rationale                                                            |
| ------------------ | ---------------------------------------- | -------------------------------------------------------------------- |
| Frontend Framework | Next.js 14+ (App Router)                 | SSR/SSG, API routes, file-based routing                              |
| Global State       | Zustand                                  | Lightweight, boilerplate-free; ideal for quiz session state          |
| Validation         | Zod                                      | Shared schemas across client/server; integrates with React Hook Form |
| Database           | Neon DB (PostgreSQL)                     | Serverless, scalable, compatible with Prisma                         |
| ORM                | Prisma                                   | Type-safe DB access, migration management                            |
| AI Orchestration   | LangChain / LangGraph                    | Chain and agent management for multi-step AI workflows               |
| LLM                | Google Gemini (via LangChain)            | High-quality generation;`ChatGoogleGenerativeAI` adapter           |
| File Storage       | Cloudinary                               | Document storage for PPT/PDF/DOCX/TXT                                |
| In-Browser ML      | TensorFlow.js + Face Landmarks Detection | Client-side gaze tracking; no server processing                      |
| Email              | Nodemailer / SendGrid                    | Invitation and notification emails                                   |
| Real-Time          | SSE / WebSocket                          | Quiz start/stop broadcasts                                           |
| Styling            | Tailwind CSS                             | Utility-first, rapid UI development                                  |

---

## 10. Appendix — Glossary

| Term                | Definition                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Join Key            | A short alphanumeric code (e.g.,`AX7-K29`) that uniquely identifies a classroom for student enrollment |
| Fullscreen Lock     | Programmatic enforcement of browser fullscreen mode during a quiz session                                |
| Eye-Away Event      | A single detected instance where the student's gaze moves off-screen, as detected by TensorFlow.js       |
| Violation Threshold | 10 eye-away events within a 60-second rolling window, after which the quiz is auto-terminated            |
| Proctoring Log      | A timestamped record of all violation events (fullscreen exits, gaze events) for a quiz attempt          |
| AI Agent Panel      | A sidebar/modal in the quiz editor where teachers interact with the AI for question generation           |
| LangGraph           | A graph-based orchestration library built on LangChain for multi-step, stateful AI workflows             |
| Auto-Submit         | Automatic quiz submission triggered by timer expiry, fullscreen violation, or eye-tracking violation     |
| FLAGGED             | A quiz attempt status indicating the student was auto-failed due to proctoring violations                |
| Mixed Quiz          | A quiz containing both MCQ and Q&A type questions                                                        |

---

*End of SRS Document — QuizNex v1.0*
