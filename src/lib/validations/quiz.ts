import { z } from "zod";

export const createQuizSchema = z.object({
  classroomId: z.string().uuid(),
  title: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum(["MCQ", "QA", "MIXED"]),
  totalMarks: z.number().int().positive(),
  timeLimitMins: z.number().int().min(1).max(360),
  scheduledAt: z.string().datetime({ offset: true, local: true }).optional(),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResults: z.boolean().default(true),
});

export const mcqOptionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean(),
});

export const createQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MCQ"),
    text: z.string().min(1).max(2000),
    marks: z.number().int().positive(),
    order: z.number().int().min(0),
    imageUrl: z.string().url().optional(),
    options: z
      .array(mcqOptionSchema)
      .min(2, "MCQ needs at least 2 options")
      .max(6)
      .refine((opts) => opts.some((o) => o.isCorrect), {
        message: "At least one option must be marked correct",
      }),
  }),
  z.object({
    type: z.literal("QA"),
    text: z.string().min(1).max(2000),
    marks: z.number().int().positive(),
    order: z.number().int().min(0),
    imageUrl: z.string().url().optional(),
    modelAnswer: z.string().max(5000).optional(),
  }),
]);

export const submitAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().optional(),
  textAnswer: z.string().max(10000).optional(),
  timeTakenSecs: z.number().int().min(0),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
