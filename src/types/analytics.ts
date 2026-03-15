export interface QuizLevelAnalytics {
  quizId: string;
  totalEnrolled: number;
  totalAttempted: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  passCount: number;
  failCount: number;
  flaggedCount: number;
  averageTimeMins: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  correctAnswerRate: number;
  averageTimeSecs: number;
  optionDistribution?: Record<string, number>; // optionId → count (MCQ only)
}

export interface StudentTimeHeatmapRow {
  studentId: string;
  studentName: string;
  questionTimes: Record<string, number>; // questionId → timeTakenSecs
}

export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  email: string;
  quizScores: Array<{ quizId: string; quizTitle: string; score: number; attemptedAt: Date }>;
  totalViolations: number;
  flaggedAttempts: number;
}

export interface ClassroomAnalytics {
  classroomId: string;
  averageScoreOverTime: Array<{ date: string; average: number }>;
  studentRankings: Array<{ studentId: string; name: string; averageScore: number; rank: number }>;
  quizCompletionRates: Array<{ quizId: string; title: string; completionRate: number }>;
}
