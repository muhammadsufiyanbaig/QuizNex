import { ChatAnthropic } from "@langchain/anthropic";

let _instance: ChatAnthropic | null = null;

function getInstance(): ChatAnthropic {
  if (!_instance) {
    _instance = new ChatAnthropic({
      model: "claude-sonnet-4-6",
      apiKey: process.env.ANTHROPIC_API_KEY!,
      maxTokens: 8192,
    });
  }
  return _instance;
}

export const claude = new Proxy({} as ChatAnthropic, {
  get(_, prop: string | symbol) {
    return Reflect.get(getInstance(), prop);
  },
});
