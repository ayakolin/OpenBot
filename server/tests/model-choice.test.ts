import { describe, expect, test } from "bun:test";
import { effectiveBuiltInModel } from "../src/agents/model-choice";

/**
 * A built-in Bot may be put on its own model, and two things read the model before a run starts: the
 * allowlist and the usage trail. Both used to answer "the deployment's model" for every built-in Bot,
 * which is the wrong answer in the one direction that matters — a Bot on a model an administrator
 * removed from the allowlist would be admitted and recorded as running something else.
 */
describe("effectiveBuiltInModel", () => {
  test("a Bot that chose nothing runs on the deployment's model", () => {
    expect(
      effectiveBuiltInModel({ systemPrompt: "Be helpful." }, "openai/gpt-5.5"),
    ).toBe("openai/gpt-5.5");
    expect(effectiveBuiltInModel(undefined, "openai/gpt-5.5")).toBe(
      "openai/gpt-5.5",
    );
    expect(effectiveBuiltInModel({ model: "   " }, "openai/gpt-5.5")).toBe(
      "openai/gpt-5.5",
    );
    expect(effectiveBuiltInModel({ model: 7 }, "openai/gpt-5.5")).toBe(
      "openai/gpt-5.5",
    );
  });

  test("a Bot that chose one keeps the deployment's provider and takes its own name", () => {
    expect(
      effectiveBuiltInModel({ model: "gpt-5.6-sol" }, "openai/gpt-5.5"),
    ).toBe("openai/gpt-5.6-sol");
    expect(
      effectiveBuiltInModel(
        { model: " claude-sonnet-4-5 " },
        "anthropic/claude-sonnet-4-5",
      ),
    ).toBe("anthropic/claude-sonnet-4-5");
  });

  test("a name that already carries a provider is used as written", () => {
    // What a gateway that namespaces its catalogue publishes, and what an administrator types into
    // the allowlist; prefixing it again would produce a name nothing serves.
    expect(
      effectiveBuiltInModel(
        { model: "openai/gpt-5.6-terra" },
        "openai/gpt-5.5",
      ),
    ).toBe("openai/gpt-5.6-terra");
  });

  test("an administrator's override outranks the package's own configuration", () => {
    // A package Bot: the synchroniser rewrites `configuration`, so a model an administrator chose
    // lives in `override` — and the allowlist has to judge the model that will actually run.
    expect(
      effectiveBuiltInModel({ systemPrompt: "Be helpful." }, "openai/gpt-5.5", {
        model: "gpt-5.6-sol",
      }),
    ).toBe("openai/gpt-5.6-sol");

    // An override with no model in it is no override, so the package's answer stands.
    expect(
      effectiveBuiltInModel({ model: "gpt-5.6-terra" }, "openai/gpt-5.5", {}),
    ).toBe("openai/gpt-5.6-terra");
  });

  test("no deployment model is no model, whatever the Bot says", () => {
    expect(
      effectiveBuiltInModel({ model: "gpt-5.6-sol" }, undefined),
    ).toBeUndefined();
  });
});
