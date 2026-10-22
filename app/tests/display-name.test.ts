import { describe, expect, test } from "bun:test";
import { displayAgentName } from "@/lib/agents/display-name";
import { type Translate, translate } from "@/lib/i18n";

const zh: Translate = (english, values) => translate("zh-CN", english, values);

describe("displayAgentName", () => {
  test("the Bot that ships with the deployment is translated", () => {
    expect(
      displayAgentName({ name: "General Assistant", systemOwned: true }, zh),
    ).toBe("通用助手");
  });

  test("a user-created Bot that happens to share the name is left alone", () => {
    expect(
      displayAgentName({ name: "General Assistant", systemOwned: false }, zh),
    ).toBe("General Assistant");
  });

  test("a Bot without the server's flag is not guessed at from its name", () => {
    expect(displayAgentName({ name: "General Assistant" }, zh)).toBe(
      "General Assistant",
    );
  });

  test("any other name is shown as the person chose it", () => {
    expect(
      displayAgentName({ name: "Research Pal", systemOwned: false }, zh),
    ).toBe("Research Pal");
    expect(
      displayAgentName({ name: "Research Pal", systemOwned: true }, zh),
    ).toBe("Research Pal");
  });
});

describe("the Bot card's name", () => {
  // AgentCard renders `displayAgentName(agent)` for both appearances, so this is its rendering rule.
  test("a user-created 'General Assistant' stays untranslated in zh-CN", () => {
    expect(
      displayAgentName({ name: "General Assistant", systemOwned: false }, zh),
    ).toBe("General Assistant");
    expect(displayAgentName({ name: "General Assistant" }, zh)).toBe(
      "General Assistant",
    );
  });

  test("the deployment's own 'General Assistant' becomes 通用助手", () => {
    expect(
      displayAgentName({ name: "General Assistant", systemOwned: true }, zh),
    ).toBe("通用助手");
  });
});
