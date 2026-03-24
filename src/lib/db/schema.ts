import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  pgEnum,
  json,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["STUDENT", "TEACHER", "ORGANIZATION"]);

export const orgTeacherStatusEnum = pgEnum("org_teacher_status", [
  "PENDING",
  "ACTIVE",
  "REMOVED",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "REMOVED",
]);

export const quizTypeEnum = pgEnum("quiz_type", ["MCQ", "QA", "MIXED"]);

export const quizStatusEnum = pgEnum("quiz_status", [
  "DRAFT",
  "PUBLISHED",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const questionTypeEnum = pgEnum("question_type", ["MCQ", "QA"]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "IN_PROGRESS",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "FLAGGED",
]);

export const proctoringEventTypeEnum = pgEnum("proctoring_event_type", [
  "FULLSCREEN_EXIT",
  "GAZE_AWAY",
  "KEY_BLOCKED",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
]);

export const aiDocumentFileTypeEnum = pgEnum("ai_document_file_type", [
  "PDF",
  "DOCX",
  "TXT",
  "PPT",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "QUIZ_STARTED",
  "QUIZ_RESULT",
  "CLASSROOM_INVITE",
  "STUDENT_JOINED",
  "STUDENT_FLAGGED",
  "ORG_INVITE",
  "ORG_INVITE_ACCEPTED",
  "ORG_INVITE_DECLINED",
  "STUDENT_REMOVED",
]);

// ─────────────────────────────────────────────
// Tables
// ─────────────────────────────────────────────

// ── User ──────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),  // null for OAuth users
  role: roleEnum("role"),                                    // null until selected (new OAuth users)
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: varchar("image", { length: 500 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: varchar("two_factor_secret", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Organization ──────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text("description"),
  contactEmail: varchar("contact_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── OrgTeacher (association) ──────────────────
export const orgTeachers = pgTable("org_teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: orgTeacherStatusEnum("status").default("PENDING").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// ── Classroom ──────────────────────────────────
export const classrooms = pgTable("classrooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  subject: varchar("subject", { length: 255 }),
  joinKey: varchar("join_key", { length: 20 }).notNull().unique(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── ClassroomStudent (enrollment) ────────────
export const classroomStudents = pgTable(
  "classroom_students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").default("ACTIVE").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uniq_enrollment").on(t.classroomId, t.studentId)]
);

// ── Quiz ──────────────────────────────────────
export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: quizTypeEnum("type").notNull(),
  totalMarks: integer("total_marks").notNull(),
  timeLimitMins: integer("time_limit_mins").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: quizStatusEnum("status").default("DRAFT").notNull(),
  shuffleQuestions: boolean("shuffle_questions").default(false).notNull(),
  shuffleOptions: boolean("shuffle_options").default(false).notNull(),
  maxAttempts: integer("max_attempts").default(1).notNull(),
  showResults: boolean("show_results").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Question ──────────────────────────────────
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: questionTypeEnum("type").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  marks: integer("marks").notNull(),
  order: integer("order").notNull(),
  modelAnswer: text("model_answer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Option (MCQ choices) ──────────────────────
export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
});

// ── QuizAttempt ───────────────────────────────
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  timerElapsedSecs: integer("timer_elapsed_secs").default(0).notNull(),
  status: attemptStatusEnum("status").default("IN_PROGRESS").notNull(),
  totalScore: real("total_score"),
  isFlagged: boolean("is_flagged").default(false).notNull(),
  flagReason: text("flag_reason"),
});

// ── Answer ────────────────────────────────────
export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => quizAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  selectedOptionId: uuid("selected_option_id").references(() => options.id),
  textAnswer: text("text_answer"),
  timeTakenSecs: integer("time_taken_secs").default(0).notNull(),
  marksAwarded: real("marks_awarded"),
});

// ── ProctoringEvent ───────────────────────────
export const proctoringEvents = pgTable("proctoring_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => quizAttempts.id, { onDelete: "cascade" }),
  type: proctoringEventTypeEnum("type").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  metadata: json("metadata"),
});

// ── AIDocument ────────────────────────────────
export const aiDocuments = pgTable("ai_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: aiDocumentFileTypeEnum("file_type").notNull(),
  cloudinaryUrl: varchar("cloudinary_url", { length: 500 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// ── Invitation ────────────────────────────────
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: invitationStatusEnum("status").default("PENDING").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── EmailVerification ─────────────────────────
export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 10 }).notNull(),   // 6-digit OTP — no global unique (same digits can belong to different users)
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── PasswordReset ─────────────────────────────
export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.id],
    references: [organizations.userId],
  }),
  classrooms: many(classrooms),
  enrollments: many(classroomStudents),
  attempts: many(quizAttempts),
  orgTeacherLinks: many(orgTeachers),
  aiDocuments: many(aiDocuments),
}));

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [organizations.userId],
      references: [users.id],
    }),
    orgTeachers: many(orgTeachers),
  })
);

export const orgTeachersRelations = relations(orgTeachers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgTeachers.orgId],
    references: [organizations.id],
  }),
  teacher: one(users, {
    fields: [orgTeachers.teacherId],
    references: [users.id],
  }),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classrooms.teacherId],
    references: [users.id],
  }),
  students: many(classroomStudents),
  quizzes: many(quizzes),
  invitations: many(invitations),
}));

export const classroomStudentsRelations = relations(
  classroomStudents,
  ({ one }) => ({
    classroom: one(classrooms, {
      fields: [classroomStudents.classroomId],
      references: [classrooms.id],
    }),
    student: one(users, {
      fields: [classroomStudents.studentId],
      references: [users.id],
    }),
  })
);

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [quizzes.classroomId],
    references: [classrooms.id],
  }),
  questions: many(questions),
  attempts: many(quizAttempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  options: many(options),
  answers: many(answers),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));

export const quizAttemptsRelations = relations(
  quizAttempts,
  ({ one, many }) => ({
    quiz: one(quizzes, {
      fields: [quizAttempts.quizId],
      references: [quizzes.id],
    }),
    student: one(users, {
      fields: [quizAttempts.studentId],
      references: [users.id],
    }),
    answers: many(answers),
    proctoringEvents: many(proctoringEvents),
  })
);

export const answersRelations = relations(answers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [answers.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(options, {
    fields: [answers.selectedOptionId],
    references: [options.id],
  }),
}));

export const proctoringEventsRelations = relations(
  proctoringEvents,
  ({ one }) => ({
    attempt: one(quizAttempts, {
      fields: [proctoringEvents.attemptId],
      references: [quizAttempts.id],
    }),
  })
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
  classroom: one(classrooms, {
    fields: [invitations.classroomId],
    references: [classrooms.id],
  }),
}));

// ── Passkey (WebAuthn credentials) ───────────────────
export const passkeys = pgTable("passkeys", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey:    text("public_key").notNull(),          // base64url-encoded Uint8Array
  counter:      integer("counter").notNull().default(0),
  deviceType:   varchar("device_type", { length: 32 }), // singleDevice | multiDevice
  backedUp:     boolean("backed_up").default(false).notNull(),
  transports:   text("transports"),                    // JSON: AuthenticatorTransportFuture[]
  name:         varchar("name", { length: 100 }).notNull().default("Passkey"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  lastUsedAt:   timestamp("last_used_at"),
});

// ── WebAuthn Challenge (temp storage, 5-min expiry) ──
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id:        uuid("id").primaryKey().defaultRandom(),
  challenge: text("challenge").notNull(),
  userId:    uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null for login
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Passkey One-Time Token (issued after auth verify) ─
export const passkeyTokens = pgTable("passkey_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt:    timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, { fields: [passkeys.userId], references: [users.id] }),
}));

// ── Notifications ──────────────────────────────
export const notifications = pgTable("notifications", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:      notificationTypeEnum("type").notNull(),
  title:     varchar("title", { length: 255 }).notNull(),
  body:      text("body").notNull(),
  link:      varchar("link", { length: 500 }),
  isRead:    boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
