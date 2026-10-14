import { describe, expect, it } from "bun:test";
import {
  cacheHitRate,
  contextUsage,
  latestReply,
  type Message,
  type Model,
  type Reply,
  type Tokens,
} from "../src/metrics.ts";

const MODEL = { id: "claude-opus-5-5", providerID: "anthropic" };

function tokens(overrides: Partial<Omit<Tokens, "cache">> & { read?: number; write?: number } = {}): Tokens {
  const { read = 0, write = 0, ...rest } = overrides;
  return { input: 0, output: 0, reasoning: 0, ...rest, cache: { read, write } };
}

function reply(id: string, created: number, usage: Tokens): Reply {
  return { id, type: "assistant", time: { created }, model: MODEL, tokens: usage };
}

function user(id: string, created: number): Message {
  return { id, type: "user", time: { created } };
}

describe("latestReply", () => {
  it("returns the last reply when it has tokens", () => {
    const messages = [user("u1", 0), reply("a1", 1, tokens()), user("u2", 3), reply("a2", 4, tokens())];
    expect(latestReply(messages)?.id).toBe("a2");
  });

  it("skips replies when they have no tokens", () => {
    const pending: Message = { id: "a2", type: "assistant", time: { created: 4 }, model: MODEL };
    expect(latestReply([reply("a1", 1, tokens()), pending])?.id).toBe("a1");
  });

  it("ignores replies when they are before the last completed compaction", () => {
    const messages: Message[] = [
      reply("a1", 1, tokens()),
      { id: "c1", type: "compaction", status: "completed", time: { created: 3 } },
    ];
    expect(latestReply(messages)).toBeUndefined();
  });

  it("ignores a compaction when it has not completed", () => {
    const messages: Message[] = [
      reply("a1", 1, tokens()),
      { id: "c1", type: "compaction", status: "running", time: { created: 3 } },
    ];
    expect(latestReply(messages)?.id).toBe("a1");
  });

  it("ignores replies when they are at or after the undo point", () => {
    const messages = [reply("a1", 1, tokens()), user("u2", 3), reply("a2", 4, tokens())];
    expect(latestReply(messages, "u2")?.id).toBe("a1");
  });

  it("returns undefined when the undo point is not loaded", () => {
    expect(latestReply([reply("a1", 1, tokens())], "missing")).toBeUndefined();
  });

  it("returns undefined when the session is empty", () => {
    expect(latestReply([])).toBeUndefined();
  });
});

describe("cacheHitRate", () => {
  it("divides cache reads by all cache tokens when caching was used", () => {
    expect(cacheHitRate(reply("a", 0, tokens({ input: 2, read: 51_205, write: 4801 })))).toBeCloseTo(91.43, 2);
  });

  it("returns null when there are no cache tokens", () => {
    expect(cacheHitRate(reply("a", 0, tokens({ input: 10 })))).toBeNull();
  });
});

describe("contextUsage", () => {
  const models: Model[] = [{ ...MODEL, limit: { context: 200_000 } }];

  it("adds all token types and compares them with the model limit when it is known", () => {
    const usage = contextUsage(
      reply("a", 0, tokens({ input: 2, output: 85, reasoning: 52, read: 51_205, write: 4801 })),
      models,
    );
    expect(usage?.tokens).toBe(56_145);
    expect(usage?.percent).toBeCloseTo(28.07, 2);
  });

  it("leaves out the percentage when the model is unknown", () => {
    expect(contextUsage(reply("a", 0, tokens({ input: 100 })), [])).toEqual({ tokens: 100 });
  });

  it("returns undefined when there are no tokens", () => {
    expect(contextUsage(reply("a", 0, tokens()), models)).toBeUndefined();
  });
});
