import { z } from "zod";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { geminiFlash } from "./gemini";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const mcqOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const generatedMcqSchema = z.object({
  type: z.literal("MCQ"),
  text: z.string().min(1),
  marks: z.number().int().min(1).max(10),
  options: z.array(mcqOptionSchema).length(4),
});

const generatedQaSchema = z.object({
  type: z.literal("QA"),
  text: z.string().min(1),
  marks: z.number().int().min(1).max(10),
  modelAnswer: z.string().min(1),
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(z.discriminatedUnion("type", [generatedMcqSchema, generatedQaSchema])),
});

export type GeneratedQuestion =
  | z.infer<typeof generatedMcqSchema>
  | z.infer<typeof generatedQaSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type GenerateParams = {
  topic: string;
  quizType: "MCQ" | "QA" | "MIXED";
  count: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  messages?: ConversationMessage[];
};

type GenerateFromDocParams = {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  quizType: "MCQ" | "QA" | "MIXED";
  count: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

type GenerateResult = {
  questions: GeneratedQuestion[];
  updatedMessages: ConversationMessage[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function quizTypeDescription(quizType: "MCQ" | "QA" | "MIXED"): string {
  switch (quizType) {
    case "MCQ":
      return "Multiple Choice Questions only";
    case "QA":
      return "Written Answer Questions only";
    case "MIXED":
      return "Mixed: roughly half MCQ and half QA";
  }
}

function buildSystemPromptForTopic(
  topic: string,
  quizType: "MCQ" | "QA" | "MIXED",
  count: number,
  difficulty: "EASY" | "MEDIUM" | "HARD"
): string {
  return `You are an expert educator creating quiz questions.
Generate exactly ${count} questions about "${topic}" at ${difficulty} difficulty level.
Quiz type: ${quizTypeDescription(quizType)}
- MCQ: 4 options, exactly 1 isCorrect=true. Marks: 1-5 based on complexity.
- QA: clear question + comprehensive model answer. Marks: 2-10.
- MIXED: roughly half MCQ half QA.
Questions must be unique, clear, and educationally sound.
Return exactly the specified number of questions.`;
}

function buildSystemPromptForDocument(
  quizType: "MCQ" | "QA" | "MIXED",
  count: number,
  difficulty: "EASY" | "MEDIUM" | "HARD"
): string {
  return `You are an expert educator. Analyze the provided document and extract quiz questions from its content.
Generate exactly ${count} questions at ${difficulty} difficulty level.
Quiz type: ${quizTypeDescription(quizType)}
- MCQ: 4 options, exactly 1 isCorrect=true. Marks: 1-5 based on complexity.
- QA: clear question + comprehensive model answer. Marks: 2-10.
- MIXED: roughly half MCQ half QA.
Focus on key concepts, facts, and understanding from the document.
Return exactly the specified number of questions.`;
}

function conversationToBaseMessages(messages: ConversationMessage[]): BaseMessage[] {
  return messages.map((m) => {
    if (m.role === "user") return new HumanMessage(m.content);
    return new AIMessage(m.content);
  });
}

// ─── generateQuestionsFromTopic ───────────────────────────────────────────────

export async function generateQuestionsFromTopic(
  params: GenerateParams
): Promise<GenerateResult> {
  const { topic, quizType, count, difficulty, messages = [] } = params;

  try {
    const systemPrompt = buildSystemPromptForTopic(topic, quizType, count, difficulty);
    const userPrompt = `Generate ${count} ${quizType} questions about "${topic}" at ${difficulty} difficulty.`;

    // Build the messages array for the chain
    const chainMessages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...conversationToBaseMessages(messages),
      new HumanMessage(userPrompt),
    ];

    const structuredLlm = geminiFlash.withStructuredOutput(generatedQuestionsSchema);
    const result = await structuredLlm.invoke(chainMessages);

    if (!result || !result.questions) {
      throw new Error("No questions returned from AI");
    }

    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: userPrompt },
      {
        role: "assistant",
        content: JSON.stringify({ questions: result.questions }),
      },
    ];

    return {
      questions: result.questions,
      updatedMessages,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI generation failed: ${message}`);
  }
}

// ─── generateQuestionsFromDocument ────────────────────────────────────────────

export async function generateQuestionsFromDocument(
  params: GenerateFromDocParams
): Promise<GenerateResult> {
  const { fileBase64, mimeType, fileName, quizType, count, difficulty } = params;

  try {
    const systemPrompt = buildSystemPromptForDocument(quizType, count, difficulty);
    const userPrompt = `Analyze the document "${fileName}" and generate ${count} ${quizType} questions at ${difficulty} difficulty level.`;

    const humanMessage = new HumanMessage({
      content: [
        { type: "text", text: systemPrompt + "\n\n" + userPrompt },
        { type: "media", data: fileBase64, mimeType },
      ],
    });

    const structuredLlm = geminiFlash.withStructuredOutput(generatedQuestionsSchema);
    const result = await structuredLlm.invoke([humanMessage]);

    if (!result || !result.questions) {
      throw new Error("No questions returned from AI");
    }

    const updatedMessages: ConversationMessage[] = [
      { role: "user", content: userPrompt },
      {
        role: "assistant",
        content: JSON.stringify({ questions: result.questions }),
      },
    ];

    return {
      questions: result.questions,
      updatedMessages,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI generation failed: ${message}`);
  }
}
