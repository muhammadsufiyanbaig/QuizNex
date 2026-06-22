import Groq from "groq-sdk";

export const TEXT_MODEL   = "llama-3.3-70b-versatile";
export const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

let _instance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_instance) {
    _instance = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return _instance;
}
