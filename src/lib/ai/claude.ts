import { ChatAnthropic } from "@langchain/anthropic";

export const claude = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 8192,
});
