import { describe, expect, test } from "bun:test";
import { createChannelTitler } from "../src/channels/titler";

function respondWith(body: unknown, status = 200) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body),
      { status },
    );
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("asking the model for a title", () => {
  test("sends the excerpt to the deployment's own model", async () => {
    const { calls, fetchImpl } = respondWith({
      choices: [{ message: { content: "Travel receipt rules" } }],
    });

    const answer = await createChannelTitler({
      model: "gpt-4.1-mini",
      resolveApiKey: async () => "key-123",
      environment: {},
      fetchImpl,
    })("Asked: which receipts count as travel?");

    expect(answer).toBe("Travel receipt rules");
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0]?.body.model).toBe("gpt-4.1-mini");
  });

  test("asks for the title in the language of the person's own words", async () => {
    const { calls, fetchImpl } = respondWith({
      choices: [{ message: { content: "差旅报销规则" } }],
    });

    await createChannelTitler({
      model: "gpt-4.1-mini",
      resolveApiKey: async () => "key-123",
      environment: {},
      fetchImpl,
    })("Asked: 差旅报销的发票怎么算？\nAnswered: 需要行程单和发票。");

    const messages = calls[0]?.body.messages as
      | { role: string; content: string }[]
      | undefined;
    const system = messages?.find((message) => message.role === "system");
    // The language follows the person's words, not the reply, and not the deployment's UI locale.
    expect(system?.content).toContain("person's own words");
    expect(system?.content).toContain("not the language of any answer");
    expect(system?.content).toContain("never translate");
    // Naming a language in the length rule primes the model toward that language.
    expect(system?.content).not.toContain("Chinese");
    expect(system?.content).not.toContain("中文");
  });

  test("asks the endpoint OPENAI_BASE_URL names, not OpenAI", async () => {
    const { calls, fetchImpl } = respondWith({
      choices: [{ message: { content: "Travel receipt rules" } }],
    });

    await createChannelTitler({
      model: "openai/gpt-5.6-terra",
      resolveApiKey: async () => "gateway-key",
      environment: { OPENAI_BASE_URL: "https://gateway.internal/v1" },
      fetchImpl,
    })("Asked: which receipts count as travel?");

    expect(calls.map((call) => call.url)).toEqual([
      "https://gateway.internal/v1/chat/completions",
    ]);
  });

  test("reads OPENAI_BASE_URL from the process when no environment is passed", async () => {
    const { calls, fetchImpl } = respondWith({
      choices: [{ message: { content: "Travel receipt rules" } }],
    });
    const previous = process.env.OPENAI_BASE_URL;
    process.env.OPENAI_BASE_URL = "http://localhost:4010";
    try {
      await createChannelTitler({
        model: "gpt-4.1-mini",
        resolveApiKey: async () => "gateway-key",
        fetchImpl,
      })("Asked: anything?");
    } finally {
      if (previous === undefined) delete process.env.OPENAI_BASE_URL;
      else process.env.OPENAI_BASE_URL = previous;
    }

    expect(calls[0]?.url).toBe("http://localhost:4010/v1/chat/completions");
  });

  test("asks nothing at all when the deployment has no key", async () => {
    const { calls, fetchImpl } = respondWith({});

    const answer = await createChannelTitler({
      model: "gpt-4.1-mini",
      resolveApiKey: async () => null,
      fetchImpl,
    })("Asked: anything?");

    // Not a failure. A deployment with no model configured does not name conversations, and must
    // not spend a request finding that out on every pass.
    expect(answer).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test("throws when the provider refuses, so the work is tried again", async () => {
    const { fetchImpl } = respondWith("rate limited", 429);

    await expect(
      createChannelTitler({
        model: "gpt-4.1-mini",
        resolveApiKey: async () => "key-123",
        fetchImpl,
      })("Asked: anything?"),
    ).rejects.toThrow("429");
  });

  test("carries only one line of the provider's complaint", async () => {
    const { fetchImpl } = respondWith(
      "<html>\n  <body>Too many requests</body>\n</html>",
      503,
    );

    // The message ends up on the work item as the reason it was released, so a provider that
    // answers with a page of HTML must not put that page in the database.
    const thrown = await createChannelTitler({
      model: "gpt-4.1-mini",
      resolveApiKey: async () => "key-123",
      fetchImpl,
    })("Asked: anything?").catch((error: Error) => error.message);

    expect(thrown).not.toContain("\n");
  });

  test("an empty completion is no answer rather than an empty title", async () => {
    const { fetchImpl } = respondWith({
      choices: [{ message: { content: "   " } }],
    });

    const answer = await createChannelTitler({
      model: "gpt-4.1-mini",
      resolveApiKey: async () => "key-123",
      fetchImpl,
    })("Asked: anything?");

    expect(answer).toBeNull();
  });
});
