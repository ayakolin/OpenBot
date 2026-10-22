import { describe, expect, test } from "bun:test";
import {
  createModelCatalogue,
  parseModelChoices,
} from "../src/agents/model-catalogue";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("parseModelChoices", () => {
  test("splits, trims and de-duplicates", () => {
    expect(
      parseModelChoices(" gpt-5.6-terra, gpt-5.6-sol ,gpt-5.6-terra"),
    ).toEqual(["gpt-5.6-terra", "gpt-5.6-sol"]);
  });

  test("an entry with a line break is dropped rather than carried into a provider call", () => {
    // The entry is one name, so a newline makes that whole entry unusable; the others survive.
    expect(parseModelChoices("ok,gpt-5.6\nsol")).toEqual(["ok"]);
  });

  test("nothing set is no names", () => {
    expect(parseModelChoices(undefined)).toEqual([]);
    expect(parseModelChoices("   ")).toEqual([]);
  });
});

describe("createModelCatalogue", () => {
  test("a provider that publishes a catalogue supplies the names, default first", async () => {
    const catalogue = createModelCatalogue({
      provider: "openai",
      defaultModel: "gpt-5.6-terra",
      choices: [],
      baseUrl: "https://gateway.test/v1",
      apiKey: async () => "sk-test",
      fetch: (async () =>
        json({
          data: [{ id: "gpt-5.6-sol" }, { id: "gpt-5.6-terra" }],
        })) as unknown as typeof fetch,
    });

    expect(await catalogue()).toEqual({
      defaultModel: "openai/gpt-5.6-terra",
      models: ["gpt-5.6-terra", "gpt-5.6-sol"],
    });
  });

  test("a provider that cannot list its models leaves the default and any listed names", async () => {
    const catalogue = createModelCatalogue({
      provider: "openai",
      defaultModel: "gpt-5.6-terra",
      choices: ["house-model"],
      baseUrl: "https://gateway.test/v1",
      apiKey: async () => "sk-test",
      fetch: (async () =>
        json({ error: "no" }, 404)) as unknown as typeof fetch,
    });

    expect((await catalogue()).models).toEqual([
      "gpt-5.6-terra",
      "house-model",
    ]);
  });

  test("a fetch that throws is a catalogue with the default, not a failed screen", async () => {
    const catalogue = createModelCatalogue({
      provider: "openai",
      defaultModel: "gpt-5.6-terra",
      choices: [],
      baseUrl: "https://gateway.test/v1",
      apiKey: async () => "sk-test",
      fetch: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    });

    expect(await catalogue()).toEqual({
      defaultModel: "openai/gpt-5.6-terra",
      models: ["gpt-5.6-terra"],
    });
  });

  test("the answer is reused until it expires", async () => {
    let calls = 0;
    let clock = 0;
    const catalogue = createModelCatalogue({
      provider: "openai",
      defaultModel: "gpt-5.6-terra",
      choices: [],
      baseUrl: "https://gateway.test/v1",
      apiKey: async () => "sk-test",
      ttlMs: 1_000,
      now: () => clock,
      fetch: (async () => {
        calls += 1;
        return json({ data: [{ id: "gpt-5.6-sol" }] });
      }) as unknown as typeof fetch,
    });

    await catalogue();
    await catalogue();
    expect(calls).toBe(1);

    clock = 2_000;
    await catalogue();
    expect(calls).toBe(2);
  });

  test("Anthropic is not asked for a list it does not publish", async () => {
    let calls = 0;
    const catalogue = createModelCatalogue({
      provider: "anthropic",
      defaultModel: "claude-sonnet-4-5",
      choices: [],
      apiKey: async () => "sk-ant",
      fetch: (async () => {
        calls += 1;
        return json({ data: [] });
      }) as unknown as typeof fetch,
    });

    expect(await catalogue()).toEqual({
      defaultModel: "anthropic/claude-sonnet-4-5",
      models: ["claude-sonnet-4-5"],
    });
    expect(calls).toBe(0);
  });
});
