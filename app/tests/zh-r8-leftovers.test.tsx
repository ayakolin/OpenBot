import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readToolName } from "@/lib/plugins/tool-name";
import { describeApproval } from "@/lib/plugins/shared-use";
import { suggestionSource } from "@/components/suggestions/proactive-panel";
import { joinAnd } from "@/lib/agents/bot-summaries";
import { sayTo } from "@/components/channels/group-chat";
import { type Translate, translate } from "@/lib/i18n";
import { zhCN } from "@/lib/i18n/dictionaries/zh-CN";
import {
  ChangeSummary,
  DenyDescription,
} from "@/routes/_authed/admin/boundaries";

/**
 * Round 8: HTML entities that reached the screen as text, CEL identifiers that were translated,
 * names joined with an English " and ", and the untranslated leftovers around them.
 *
 * Every case pins the English as well as the Chinese, because the English is the reference: these
 * are fixes to what is rendered, not a re-wording of it.
 */

const tr =
  (locale: "en" | "zh-CN"): Translate =>
  (english, values) =>
    translate(locale, english, values);

const EN = tr("en");
const ZH = tr("zh-CN");

const text = (markup: string) => markup.replace(/<[^>]+>/g, "");

/** A space between two Chinese characters, or an ASCII period after one. */
const CJK_GAP = /[一-鿿][ ]+[一-鿿]/;
const ASCII_PERIOD_AFTER_CHINESE = /[一-鿿]\./;

describe("entities in a translated sentence are characters, not markup", () => {
  test("en deny description: ’ and — in the rendered text", () => {
    const markup = renderToStaticMarkup(<DenyDescription tr={EN} />);
    expect(markup).toContain("somebody else’s tools.");
    expect(markup).toContain("run — <code>person</code>");
    expect(markup).toContain("owner’s authority");
    expect(markup).not.toContain("&rsquo;");
    expect(markup).not.toContain("&mdash;");
    expect(text(markup)).not.toContain("&rsquo;");
  });

  test("zh deny description keeps the real dash and has no entity left", () => {
    const markup = renderToStaticMarkup(<DenyDescription tr={ZH} />);
    expect(markup).toContain("——");
    expect(markup).not.toContain("&mdash;");
    expect(markup).not.toContain("&rsquo;");
    expect(text(markup)).not.toMatch(CJK_GAP);
  });

  test("the deployment's logs sentence renders the apostrophe", () => {
    const key =
      "Whether you have connected an account here could not be loaded, so nothing about it is shown rather than something that may be wrong. Reload the page, and check this deployment’s logs if it persists.";
    expect(EN(key)).toBe(key);
    expect(ZH(key)).toContain("请检查此部署的日志");
    expect(zhCN[key]).not.toContain("&rsquo;");
  });

  test("no dictionary key or value carries an HTML entity", () => {
    const offenders = Object.entries(zhCN).filter(
      ([key, value]) =>
        /&(rsquo|lsquo|mdash|ndash|ldquo|rdquo|hellip|nbsp);/.test(key) ||
        /&(rsquo|lsquo|mdash|ndash|ldquo|rdquo|hellip|nbsp);/.test(value),
    );
    expect(offenders).toEqual([]);
  });
});

describe("CEL identifiers stay English inside <code>", () => {
  test("en is unchanged, identifier for identifier", () => {
    const text = renderToStaticMarkup(<DenyDescription tr={EN} />).replace(
      /<[^>]+>/g,
      "",
    );
    expect(text).toContain("can ask about tool.name, intent, bot.id");
    expect(text).toContain("handoff — which actor.id");
  });

  test("zh translates the sentence but never an identifier", () => {
    const markup = renderToStaticMarkup(<DenyDescription tr={ZH} />);
    for (const identifier of [
      "tool.name",
      "intent",
      "bot.id",
      "actor.id",
      "page.url",
      "page.host",
      "key",
      "command",
      "mcp.server",
      "mcp.tool",
      "mcp.effect",
      "initiator.kind",
      "person",
      "routine",
      "handoff",
    ]) {
      expect(markup).toContain(`<code>${identifier}</code>`);
    }
    expect(markup).not.toContain("<code>意图</code>");
    expect(markup).not.toContain("<code>交接</code>");
    // The words around the identifiers are still translated.
    expect(markup).toContain("规则使用 CEL 编写");
    expect(markup).toContain("<code>initiator.kind</code> 标明");
  });
});

const change = {
  id: "1",
  action: "computer_click",
  would: "refused",
  element: { name: "Pay" },
  command: "rm",
  file: "/tmp/x",
  bot: "Ada",
  page: null,
  createdAt: "2026-01-01T00:00:00Z",
} as unknown as Parameters<typeof ChangeSummary>[0]["change"];

describe("change summary: the space is in the sentence, not in the key", () => {
  test("en is byte-identical to the old four pieces", () => {
    expect(
      renderToStaticMarkup(<ChangeSummary change={change} tr={EN} />),
    ).toBe(
      '<p class="text-xs"><span class="font-medium">Would refuse</span> <code class="font-mono">computer_click</code> on “Pay” running <code class="font-mono">rm</code> touching /tmp/x</p>',
    );
  });

  test("zh joins the element clause with a comma, no gap", () => {
    const markup = renderToStaticMarkup(
      <ChangeSummary change={change} tr={ZH} />,
    );
    expect(markup).toContain("</code>，针对“Pay”");
    expect(markup).not.toContain("</code> ，");
    expect(text(markup)).not.toMatch(CJK_GAP);
    expect(text(markup)).not.toMatch(ASCII_PERIOD_AFTER_CHINESE);
  });

  test("no action without an element still stands alone", () => {
    const plain = { ...change, element: null };
    expect(
      renderToStaticMarkup(<ChangeSummary change={plain} tr={EN} />),
    ).toContain('<code class="font-mono">computer_click</code> running');
    expect(
      renderToStaticMarkup(<ChangeSummary change={plain} tr={ZH} />),
    ).toContain("</code> 运行中");
  });
});

describe("names joined with the language's conjunction", () => {
  test('en is exactly the old join(" and ") for one, two and three names', () => {
    expect(joinAnd(["Ann"], EN)).toBe("Ann");
    expect(joinAnd(["Ann", "Bo"], EN)).toBe("Ann and Bo");
    expect(joinAnd(["Ann", "Bo", "Cy"], EN)).toBe("Ann and Bo and Cy");
    expect(joinAnd([], EN)).toBe("");
  });

  test("zh uses 和 and no spaces between the names", () => {
    expect(joinAnd(["Ann"], ZH)).toBe("Ann");
    expect(joinAnd(["Ann", "Bo"], ZH)).toBe("Ann和Bo");
    expect(joinAnd(["Ann", "Bo", "Cy"], ZH)).toBe("Ann和Bo和Cy");
  });

  test("the empty-group prompt reads the same in en and joins in zh", () => {
    expect(sayTo(joinAnd(["Ann", "Bo"], EN), EN)).toBe(
      "Say something to Ann and Bo. Every Bot answers in turn; start with @Name to ask just one.",
    );
    expect(sayTo(joinAnd(["Ann", "Bo", "Cy"], EN), EN)).toBe(
      "Say something to Ann and Bo and Cy. Every Bot answers in turn; start with @Name to ask just one.",
    );
    expect(sayTo(joinAnd(["Ann", "Bo"], ZH), ZH)).toBe(
      "对 Ann和Bo 说点什么。每个机器人会依次作答；以 @名称 开头可仅向特定的机器人提问。",
    );
  });

  test("who an approval covers joins the same way", () => {
    const approval = {
      audience: "people" as const,
      outsideInput: false,
      members: [
        { kind: "group" as const, value: "platform" },
        { kind: "user" as const, value: "u1" },
      ],
    };
    expect(describeApproval(approval)).toBe("The group platform and 1 person");
    expect(describeApproval({ ...approval, members: [] })).toBe("Nobody named");
  });
});

describe("strings that were never asked for a translation", () => {
  test("the computer list failure and the empty folder summary", () => {
    expect(EN("The computers could not be listed.")).toBe(
      "The computers could not be listed.",
    );
    expect(ZH("The computers could not be listed.")).toBe("无法列出电脑。");
    expect(EN("No folders approved.")).toBe("No folders approved.");
    expect(ZH("No folders approved.")).toBe("未批准任何文件夹。");
  });

  test("the Bot access counter", () => {
    expect(EN("{granted} of {total}", { granted: 0, total: 2 })).toBe("0 of 2");
    expect(ZH("{granted} of {total}", { granted: 0, total: 2 })).toBe(
      "已选 0/2",
    );
    expect(ZH("{granted} of {total}", { granted: 2, total: 2 })).toBe(
      "已选 2/2",
    );
  });

  test("the two research labels, wherever the app reads them", () => {
    expect(readToolName("mcp__exa__web_search_exa").label).toBe(
      "Search the web",
    );
    expect(ZH("Search the web")).toBe("搜索网页");
    expect(ZH("Read web pages")).toBe("阅读网页");
    expect(EN("Search the web")).toBe("Search the web");
    expect(EN("Read web pages")).toBe("Read web pages");
  });
});

describe("an empty app name is no app, not an app called nothing", () => {
  test("en never renders 'From ' with a missing name", () => {
    expect(suggestionSource("Gmail", EN)).toBe("From Gmail");
    expect(suggestionSource(null, EN)).toBe("From a connected app");
    expect(suggestionSource(undefined, EN)).toBe("From a connected app");
    expect(suggestionSource("", EN)).toBe("From a connected app");
    expect(suggestionSource("   ", EN)).toBe("From a connected app");
  });

  test("zh says the same thing", () => {
    expect(suggestionSource("Gmail", ZH)).toBe("来自 Gmail");
    expect(suggestionSource("", ZH)).toBe("来自已连接的应用");
  });
});

describe("spacing in the dictionary", () => {
  test("a Latin word next to Chinese keeps one space around OpenBot", () => {
    const key =
      "Choose folders a Bot can read on this computer. The desktop app asks before each edit or command. Access ends when you stop OpenBot.";
    expect(zhCN[key]).toContain("停止 OpenBot 时访问即结束。");
    expect(zhCN[key]).not.toContain("OpenBot时");
  });

  test("no zh entry has OpenBot glued to a Chinese character", () => {
    const glued = Object.entries(zhCN).filter(([, value]) =>
      /OpenBot[一-鿿]|[一-鿿]OpenBot/.test(value),
    );
    expect(glued).toEqual([]);
  });

  test("the boundaries clause no longer bakes its space into a key", () => {
    expect(Object.hasOwn(zhCN, " on “")).toBe(false);
    expect(Object.hasOwn(zhCN, "{action} on “{element}”")).toBe(true);
  });
});
