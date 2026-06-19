import { z } from "zod";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { claude } from "./claude";

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
    case "MCQ":  return "Multiple Choice Questions only";
    case "QA":   return "Written Answer Questions only";
    case "MIXED": return "Mixed: roughly half MCQ and half QA";
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
  return `You are an expert educator. Analyze the provided document content and generate quiz questions from it.
Generate exactly ${count} questions at ${difficulty} difficulty level.
Quiz type: ${quizTypeDescription(quizType)}
- MCQ: 4 options, exactly 1 isCorrect=true. Marks: 1-5 based on complexity.
- QA: clear question + comprehensive model answer. Marks: 2-10.
- MIXED: roughly half MCQ half QA.
Focus on key concepts, facts, and understanding from the document.
Return exactly the specified number of questions.`;
}

const JSON_SCHEMA_HINT = `{
  "questions": [
    { "type": "MCQ", "text": "Question text", "marks": 2, "options": [{"text": "A", "isCorrect": true}, {"text": "B", "isCorrect": false}, {"text": "C", "isCorrect": false}, {"text": "D", "isCorrect": false}] },
    { "type": "QA",  "text": "Question text", "marks": 5, "modelAnswer": "Full model answer here" }
  ]
}`;

function conversationToBaseMessages(messages: ConversationMessage[]): BaseMessage[] {
  return messages.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );
}

function parseJsonResponse(raw: string): z.infer<typeof generatedQuestionsSchema> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");
  return generatedQuestionsSchema.parse(JSON.parse(match[0]));
}

// ─── Text extraction for non-PDF formats ────────────────────────────────────

async function extractTextFromDocx(base64: string): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(base64, "base64");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromPptx(base64: string): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(Buffer.from(base64, "base64"));
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();
  const textParts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
    const text = matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
    if (text.trim()) textParts.push(text);
  }
  return textParts.join("\n");
}

// ─── generateQuestionsFromTopic ───────────────────────────────────────────────

export async function generateQuestionsFromTopic(
  params: GenerateParams
): Promise<GenerateResult> {
  const { topic, quizType, count, difficulty, messages = [] } = params;

  try {
    const systemPrompt = buildSystemPromptForTopic(topic, quizType, count, difficulty);
    const userPrompt = `Generate ${count} ${quizType} questions about "${topic}" at ${difficulty} difficulty.`;

    const chainMessages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...conversationToBaseMessages(messages),
      new HumanMessage(userPrompt),
    ];

    const structuredLlm = claude.withStructuredOutput(generatedQuestionsSchema);
    const result = await structuredLlm.invoke(chainMessages);

    if (!result?.questions) throw new Error("No questions returned from AI");

    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: userPrompt },
      { role: "assistant", content: JSON.stringify({ questions: result.questions }) },
    ];

    return { questions: result.questions, updatedMessages };
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
    const jsonInstruction =
      `\n\nRespond with ONLY valid JSON — no markdown, no code fences — matching this schema:\n${JSON_SCHEMA_HINT}`;

    let humanMessage: HumanMessage;

    if (mimeType === "application/pdf") {
      // Claude natively supports PDF as a document block
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      humanMessage = new HumanMessage({
        content: [
          {
            type: "text",
            text: systemPrompt + `\n\nAnalyze "${fileName}" and generate exactly ${count} ${quizType} questions at ${difficulty} difficulty.` + jsonInstruction,
          },
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
          },
        ] as any,
      });
    } else {
      // Extract text for DOCX, PPTX, TXT — then send as plain text prompt
      let documentText = "";
      if (mimeType === "text/plain") {
        documentText = Buffer.from(fileBase64, "base64").toString("utf-8");
      } else if (mimeType.includes("wordprocessingml")) {
        documentText = await extractTextFromDocx(fileBase64);
      } else if (mimeType.includes("presentationml")) {
        documentText = await extractTextFromPptx(fileBase64);
      }

      if (!documentText.trim()) throw new Error("Could not extract text from document");

      const truncated = documentText.slice(0, 60_000); // stay within context
      humanMessage = new HumanMessage(
        `${systemPrompt}\n\nDocument: "${fileName}"\n\n---\n${truncated}\n---\n\n` +
        `Generate exactly ${count} ${quizType} questions at ${difficulty} difficulty from the above document.` +
        jsonInstruction
      );
    }

    const response = await claude.invoke([humanMessage]);

    const raw =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content) && response.content[0]
        ? (response.content[0] as { text?: string }).text ?? ""
        : "";

    const parsed = parseJsonResponse(raw);

    const updatedMessages: ConversationMessage[] = [
      { role: "user", content: `Generate questions from "${fileName}"` },
      { role: "assistant", content: JSON.stringify({ questions: parsed.questions }) },
    ];

    return { questions: parsed.questions, updatedMessages };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI generation failed: ${message}`);
  }
}
