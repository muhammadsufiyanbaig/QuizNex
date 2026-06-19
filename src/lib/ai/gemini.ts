import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const geminiFlash = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY!,
  temperature: 0.7,
  maxOutputTokens: 8192,
});
