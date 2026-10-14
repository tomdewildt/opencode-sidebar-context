export interface Tokens {
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
}

export interface Message {
  id: string;
  type: string;
  status?: string;
  time: { created: number };
  model?: { id: string; providerID: string };
  tokens?: Tokens;
}

export interface Reply extends Message {
  type: "assistant";
  model: { id: string; providerID: string };
  tokens: Tokens;
}

export interface Model {
  id: string;
  providerID: string;
  limit: { context: number };
}

function isReply(message: Message): message is Reply {
  return message.type === "assistant" && message.tokens !== undefined && message.model !== undefined;
}

export function latestReply(messages: readonly Message[], revertMessageID?: string): Reply | undefined {
  const revertIndex = revertMessageID ? messages.findIndex((message) => message.id === revertMessageID) : -1;

  if (revertMessageID && revertIndex === -1) {
    return undefined;
  }

  const end = revertIndex === -1 ? messages.length : revertIndex;
  const compaction = messages.findLastIndex(
    (message, index) => message.type === "compaction" && message.status === "completed" && index < end,
  );

  return messages.findLast((message, index): message is Reply => isReply(message) && index > compaction && index < end);
}

export function cacheHitRate(reply: Reply): number | null {
  const { read, write } = reply.tokens.cache;

  const total = read + write;

  return total > 0 ? (read / total) * 100 : null;
}

export function contextUsage(reply: Reply, models: readonly Model[]): { tokens: number; percent?: number } | undefined {
  const { input, output, reasoning, cache } = reply.tokens;

  const tokens = input + output + reasoning + cache.read + cache.write;
  if (tokens <= 0) {
    return undefined;
  }

  const model = models.find((item) => item.providerID === reply.model.providerID && item.id === reply.model.id);
  const limit = model?.limit.context;
  return limit ? { tokens, percent: (tokens / limit) * 100 } : { tokens };
}
