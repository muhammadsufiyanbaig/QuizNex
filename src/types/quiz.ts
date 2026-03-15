export type QuizType = "MCQ" | "QA" | "MIXED";
export type QuizStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type QuestionType = "MCQ" | "QA";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "FLAGGED";
export type ProctoringEventType = "FULLSCREEN_EXIT" | "GAZE_AWAY" | "KEY_BLOCKED";

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: QuestionType;
  imageUrl: string | null;
  marks: number;
  order: number;
  modelAnswer: string | null;
  options?: Option[];
}

export interface Quiz {
  id: string;
  classroomId: string;
  title: string;
  description: string | null;
  type: QuizType;
  totalMarks: number;
  timeLimitMins: number;
  scheduledAt: Date | null;
  status: QuizStatus;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  showResults: boolean;
  createdAt: Date;
  questions?: Question[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: Date;
  submittedAt: Date | null;
  timerElapsedSecs: number;
  status: AttemptStatus;
  totalScore: number | null;
  isFlagged: boolean;
  flagReason: string | null;
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  timeTakenSecs: number;
  marksAwarded: number | null;
}

export interface ProctoringEvent {
  id: string;
  attemptId: string;
  type: ProctoringEventType;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
}

// Used during active quiz session (client-side state)
export interface ActiveQuizState {
  attemptId: string;
  quizId: string;
  currentQuestionIndex: number;
  answers: Record<string, { selectedOptionId?: string; textAnswer?: string; timeTakenSecs: number }>;
  timerElapsedSecs: number;
  isFullscreen: boolean;
  isCameraActive: boolean;
  violationCount: number;
  status: AttemptStatus;
}
