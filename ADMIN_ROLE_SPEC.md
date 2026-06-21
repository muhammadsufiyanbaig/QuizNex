# QuizNex — Admin / Management Role Specification

**Document purpose:** Define the complete capability set for a new `ADMIN` role that manages the QuizNex platform.  
**Current roles:** STUDENT · TEACHER · ORGANIZATION  
**New role:** ADMIN (super-admin — sees and controls everything, no ownership restrictions)

---

## Role Definition

An `ADMIN` is a **platform operator** — not an educator, not a student. They never create classrooms or take quizzes. Their job is to ensure the platform runs correctly, users are behaving appropriately, and the business has visibility into every corner of the system.

**Access model:** ADMIN bypasses all ownership/enrollment checks. Any API route that currently checks `classrooms.teacherId === session.user.id` or `classroomStudents.studentId === session.user.id` is fully bypassed for ADMIN. The only things ADMIN cannot do: take quizzes (no attempt creation) and impersonate other users for write operations.

---

## 1. Dashboard — Platform Overview

The admin landing page. Real-time and historical numbers across the whole platform.

### 1.1 KPI Cards
| Metric | Description |
|--------|-------------|
| Total Users | Breakdown: STUDENT / TEACHER / ORGANIZATION / ADMIN |
| Active Today | Unique users who logged in the last 24h |
| New Registrations | Last 7 days, with daily sparkline |
| Total Classrooms | Active vs archived |
| Total Quizzes | By status: DRAFT / PUBLISHED / ACTIVE / COMPLETED / ARCHIVED |
| Total Attempts | All time + last 30 days |
| Flagged Attempts | Unresolved flags requiring review |
| AI Generations | API calls today + estimated Claude token cost |

### 1.2 Charts
- **User growth** — cumulative registrations by role over time (line chart, 30/90/365 day)
- **Quiz activity** — attempts per day (bar chart)
- **Flagging rate** — % of attempts flagged, trending over time
- **AI usage** — generate-questions + refine + generate-from-document calls per day
- **S3 storage** — cumulative uploaded file size (AI documents + quiz images)

### 1.3 Live Feed
- Last 20 quiz attempts started (user → quiz → classroom)
- Last 20 new user registrations
- Last 10 flagged attempts (most recent first, with quick-review link)

---

## 2. User Management

Full visibility and control over every user account.

### 2.1 User List
- Table with: name, email, role, emailVerified, 2FA status, passkey count, createdAt, lastLoginAt (if tracked), status (active / suspended)
- Filters: role, emailVerified, 2FA enabled, account status, registration date range
- Search: by name or email (partial match)
- Sort: by createdAt, name, role, lastLogin
- Pagination + CSV export of filtered results

### 2.2 User Detail Page
Everything about a single user in one place:

**Profile section**
- Name, email, role, image, emailVerified, 2FA enabled, OAuth vs credentials account
- Registration date, last login date (add `lastLoginAt` to `users` table)
- Account status: Active / Suspended

**Security section**
- Password set: yes / no (null `passwordHash` = OAuth-only)
- 2FA: enabled / disabled
- Passkeys: list with device type, name, last used, created — admin can revoke any passkey
- Active sessions: list (if session tracking added) — admin can force logout

**Activity section**
- If TEACHER: list of classrooms owned (name, student count, quiz count, created date)
- If STUDENT: list of enrollments (classroom name, teacher, joined date, status)
- If STUDENT: list of quiz attempts (quiz title, score, status, flagged, submitted at)
- If ORGANIZATION: org name, teacher count, classroom count under org

**AI Usage section** (TEACHER only)
- Total AI generations (all time and last 30 days)
- Documents uploaded: file name, type, size, upload date — admin can delete S3 objects

**Notifications section**
- All notifications sent to this user (type, title, created, read status)
- Admin can send a manual notification to this user

### 2.3 User Actions
| Action | Effect |
|--------|--------|
| **Suspend account** | Sets `users.status = "SUSPENDED"` — user cannot log in, existing sessions invalidated |
| **Unsuspend account** | Restores `status = "ACTIVE"` |
| **Force email verification** | Sets `emailVerified = true` without OTP |
| **Reset 2FA** | Clears `twoFactorEnabled`, `twoFactorSecret` — user must re-enroll |
| **Revoke all passkeys** | Deletes all rows in `passkeys` for this user |
| **Change role** | Updates `users.role` (e.g., promote a TEACHER to ADMIN) |
| **Delete account** | Hard delete — cascades to all owned data (classrooms, quizzes, attempts) — requires confirmation |
| **Send notification** | Insert into `notifications` table for this user |
| **Export user data** | JSON dump of all user-owned data (GDPR right to access) |

---

## 3. Organization Management

### 3.1 Organization List
- Table: org name, owner email, teacher count, classroom count, created date
- Search by name or owner email

### 3.2 Organization Detail
- Org profile: name, logo, description, contact email
- Owner account link
- Teacher list: name, email, status (PENDING / ACTIVE / REMOVED), joined date
  - Admin can remove a teacher from the org
- Classrooms owned by teachers in this org: name, teacher, student count, quiz count
- Analytics: aggregate quiz attempts, average scores, flagged rate across entire org

### 3.3 Organization Actions
| Action | Effect |
|--------|--------|
| **Suspend org** | Suspends the org owner account — all org teachers retain access but org features disabled |
| **Delete org** | Removes org record — teachers become independent (classrooms remain) |

---

## 4. Classroom Management

### 4.1 Classroom List (Global)
- All classrooms across the entire platform — not filtered by teacher
- Columns: name, subject, teacher, org affiliation, student count, quiz count, archived status, created date
- Filters: archived / active, organization, date range
- Search by classroom name or teacher name

### 4.2 Classroom Detail
- Full classroom data: name, description, subject, join key, archived status
- Teacher info with link to teacher's user detail
- Student roster: name, email, joined date, enrollment status
  - Admin can remove any student
- Quiz list: title, type, status, total marks, attempt count
  - Admin can archive / delete any quiz
- Analytics: same data as teacher's export (admin can download CSV)

### 4.3 Classroom Actions
| Action | Effect |
|--------|--------|
| **Archive classroom** | Sets `isArchived = true` |
| **Regenerate join key** | Generates new `joinKey` |
| **Delete classroom** | Hard delete — cascades to quizzes, attempts, answers |

---

## 5. Quiz Management

### 5.1 Quiz List (Global)
- All quizzes across platform
- Columns: title, type, classroom, teacher, status, total marks, attempt count, flagged count, created date
- Filters: status, type (MCQ/QA/MIXED), has flagged attempts, date range
- Search by quiz title or teacher name

### 5.2 Quiz Detail
- Quiz settings: title, description, type, total marks, time limit, shuffle settings, maxAttempts, showResults, scheduledAt
- Questions list: full content including model answers and correct options (admin sees all)
- Attempts summary: total attempts, submitted, auto-submitted, flagged, average score, score distribution

### 5.3 Quiz Actions
| Action | Effect |
|--------|--------|
| **Force status change** | Admin can move quiz to any status (e.g., force COMPLETED if stuck ACTIVE) |
| **Delete quiz** | Hard delete — cascades to questions, attempts, answers |
| **Export quiz** | JSON export of all questions + answer key |

---

## 6. Attempt & Proctoring Review

This is the most sensitive and important admin section — reviewing academic integrity violations.

### 6.1 Flagged Attempts Queue
- List of all `isFlagged = true` attempts, sorted by most recent
- Columns: student name, quiz title, classroom, teacher, submitted at, flag reason, proctoring event count, score
- Filter: unreviewed only, by date range, by classroom, by teacher
- Bulk actions: mark reviewed, export

### 6.2 Attempt Detail
- Student info, quiz info, classroom info
- Attempt timeline: startedAt, submittedAt, timerElapsedSecs
- **Proctoring events**: full list — type (FULLSCREEN_EXIT / GAZE_AWAY / KEY_BLOCKED), occurred at, metadata
- **Answer review**: each question with student's answer, correct answer, marks awarded
- **Score override**: admin can adjust `marksAwarded` on any answer and recalculate `totalScore`
- **Flag management**: set / clear `isFlagged`, update `flagReason`

### 6.3 Platform Proctoring Stats
- Events per type (pie chart)
- Flag rate by classroom / teacher (table — which teachers have highest flag rates)
- Students with multiple flagged attempts (repeat offenders)

---

## 7. AI Usage & Cost Management

Visibility into Claude API usage and uploaded documents.

### 7.1 AI Usage Dashboard
| Metric | Detail |
|--------|--------|
| Total API calls today | Breakdown by endpoint (generate-questions / refine / generate-from-document) |
| Total API calls this month | With day-by-day chart |
| Estimated token cost | Approximate $ based on Claude pricing |
| Top AI users | Teachers ranked by generation count (last 30 days) |
| Failed generations | Count of 503 errors from AI endpoints |

### 7.2 AI Document Library (Global)
- All uploaded documents across all teachers
- Columns: teacher name, file name, file type, size, upload date, S3 key
- Admin can delete any document (removes S3 object + DB record)
- Storage totals: total files, total GB used

### 7.3 AI Limits (Future)
- Set per-teacher daily/monthly generation limits
- Set per-org generation limits
- Requires a new `ai_usage_limits` table and counter tracking

---

## 8. Security & Audit

### 8.1 Security Events Log
Add a new `admin_audit_log` table:
```
id, adminId, action, targetType (user/classroom/quiz/attempt), targetId, metadata (JSON), createdAt
```
Every admin action is logged here. Immutable — admins cannot delete audit logs.

Admin console shows this log with filters by: action type, admin who did it, target type, date range.

### 8.2 Auth Security Overview
- OTP failures in last 24h (count, by email)
- Rate limit hits (counts from in-memory store — approximate)
- Failed login attempts (requires logging to DB — new `login_events` table)
- Passkey usage: registrations and logins per day

### 8.3 Active Sessions
(Requires adding session tracking — not currently in DB)
- List of all active JWT sessions (user, created at, expires at, IP, user agent)
- Admin can invalidate any session

---

## 9. Notifications & Communications

### 9.1 Send Platform Notification
- Admin can send a notification to: all users / all teachers / all students / all orgs / specific user
- Inserts into `notifications` table with type `SYSTEM_ANNOUNCEMENT` (add to enum)
- Fields: title, body, link (optional)

### 9.2 Notification History
- Table of all notifications ever sent by admins (bulk ones)
- Columns: sent by, target audience, title, sent at, delivery count

---

## 10. Platform Configuration (Future)

Settings that control platform-wide behavior. Requires a new `platform_config` table (key-value).

| Setting | Description |
|---------|-------------|
| `ai_enabled` | Toggle AI features platform-wide (emergency kill switch) |
| `registration_enabled` | Toggle new user registrations |
| `google_oauth_enabled` | Toggle Google sign-in |
| `passkey_enabled` | Toggle passkey authentication |
| `max_ai_calls_per_day` | Platform-wide daily AI generation cap |
| `s3_max_file_size_mb` | Override default 20MB document upload limit |
| `otp_expiry_minutes` | OTP validity window (currently 10 min) |
| `smtp_from_name` | Email sender display name |

---

## 11. Admin Account Security Requirements

Because ADMIN has unrestricted access, admin accounts must be held to the highest security standard:

1. **2FA mandatory** — ADMIN cannot log in without TOTP. `twoFactorEnabled` must be `true` before admin dashboard is accessible. Enforce in middleware.
2. **No Google OAuth** — ADMIN accounts must use credentials (password + 2FA). OAuth account linking disabled for ADMIN role.
3. **Passkey strongly recommended** — System should prompt admin to register a passkey.
4. **Session timeout** — Admin sessions should expire after 60 minutes of inactivity (shorter than regular users).
5. **IP allowlist (optional)** — Restrict admin login to specific IP ranges (add to middleware check).
6. **All actions audit-logged** — Every write action by any admin must create an `admin_audit_log` entry. This is non-negotiable.
7. **Admin creation** — ADMIN role cannot be self-assigned at registration. Only an existing ADMIN can promote a user to ADMIN (via the "Change role" action). The first ADMIN is seeded directly in the database.

---

## 12. Database Changes Required

### Add to `roleEnum`:
```typescript
export const roleEnum = pgEnum("role", ["STUDENT", "TEACHER", "ORGANIZATION", "ADMIN"]);
```

### Add `status` to `users` table:
```typescript
status: varchar("status", { length: 20 }).default("ACTIVE").notNull(), // ACTIVE | SUSPENDED
```

### Add `lastLoginAt` to `users` table:
```typescript
lastLoginAt: timestamp("last_login_at"),
```

### New `admin_audit_log` table:
```typescript
export const adminAuditLog = pgTable("admin_audit_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  adminId:    uuid("admin_id").notNull().references(() => users.id),
  action:     varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),  // user | classroom | quiz | attempt | org
  targetId:   uuid("target_id"),
  metadata:   json("metadata"),
  ip:         varchar("ip", { length: 50 }),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});
```

### Add `SYSTEM_ANNOUNCEMENT` to `notificationTypeEnum`:
```typescript
"SYSTEM_ANNOUNCEMENT"
```

### New `platform_config` table (future):
```typescript
export const platformConfig = pgTable("platform_config", {
  key:       varchar("key", { length: 100 }).primaryKey(),
  value:     text("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

## 13. API Routes Required

All new routes under `/api/admin/` — all protected by `session.user.role === "ADMIN"` guard.

```
GET  /api/admin/stats                          — platform KPIs
GET  /api/admin/users                          — paginated user list
GET  /api/admin/users/:id                      — user detail
PATCH /api/admin/users/:id                     — update role / status / force verify
DELETE /api/admin/users/:id                    — delete account

GET  /api/admin/organizations                  — all orgs
GET  /api/admin/organizations/:id              — org detail
PATCH /api/admin/organizations/:id             — suspend/restore
DELETE /api/admin/organizations/:id            — delete org

GET  /api/admin/classrooms                     — all classrooms (global)
GET  /api/admin/classrooms/:id                 — classroom detail
PATCH /api/admin/classrooms/:id                — archive/restore
DELETE /api/admin/classrooms/:id               — delete

GET  /api/admin/quizzes                        — all quizzes (global)
GET  /api/admin/quizzes/:id                    — quiz detail with questions + answer key
PATCH /api/admin/quizzes/:id/status            — force status change
DELETE /api/admin/quizzes/:id                  — delete

GET  /api/admin/attempts                       — all attempts (filterable)
GET  /api/admin/attempts/flagged               — flagged queue
GET  /api/admin/attempts/:id                   — full attempt detail with proctoring
PATCH /api/admin/attempts/:id                  — override score / flag status

GET  /api/admin/ai/usage                       — AI usage stats
GET  /api/admin/ai/documents                   — all AI documents
DELETE /api/admin/ai/documents/:id             — delete document + S3 object

GET  /api/admin/audit-log                      — admin action log
POST /api/admin/notifications                  — send platform notification
```

---

## 14. Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| P0 | Add ADMIN to roleEnum, seed first admin in DB | Tiny |
| P0 | Admin auth guard middleware (block without 2FA) | Small |
| P0 | User list + user detail + suspend/unsuspend | Medium |
| P0 | Flagged attempt queue + attempt detail + score override | Medium |
| P1 | Platform KPI dashboard | Medium |
| P1 | `admin_audit_log` + log every admin action | Medium |
| P1 | Classroom global list + detail | Small |
| P1 | Quiz global list + detail | Small |
| P1 | Organization list + detail | Small |
| P2 | AI usage dashboard | Medium |
| P2 | Send platform notification | Small |
| P2 | `lastLoginAt` tracking | Small |
| P3 | Platform config table | Medium |
| P3 | Active session management | Large (requires session store) |
| P3 | Login events audit log | Medium |
