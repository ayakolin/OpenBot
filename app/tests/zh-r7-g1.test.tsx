import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { translate } from "@/lib/i18n";
import {
  ChangeSummary,
  DenyDescription,
  PageDescription,
} from "@/routes/_authed/admin/boundaries";

/**
 * The Boundaries screen's sentences with elements in them are each one translation, so Chinese gets
 * no gap where English has a seam («审计 以及…», «交接 或 …»).
 */

const tr =
  (locale: "en" | "zh-CN") =>
  (english: string, values?: Record<string, string | number>) =>
    translate(locale, english, values);

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, "");
const CJK_GAP = /[一-鿿][ ]+[一-鿿]/;

const audit = (locale: "en" | "zh-CN") => (
  <a href="/admin/audit">{translate(locale, "Audit")}</a>
);

test("en description reads as before, spaces around the Audit link intact", () => {
  expect(
    renderToStaticMarkup(<PageDescription audit={audit("en")} tr={tr("en")} />),
  ).toBe(
    'What every Bot may and may not do with its computer. Rules are checked on every action before it happens, and a refusal is recorded in <a href="/admin/audit">Audit</a> with the rule that refused it.',
  );
});

test("zh description has no stray space and no ASCII period", () => {
  const markup = renderToStaticMarkup(
    <PageDescription audit={audit("zh-CN")} tr={tr("zh-CN")} />,
  );
  expect(markup).toContain('<a href="/admin/audit">审计</a>中。');
  expect(textOf(markup)).not.toMatch(CJK_GAP);
  expect(textOf(markup)).not.toMatch(/[一-鿿]\./);
  expect(markup).not.toContain("{audit}");
});

test("en deny description keeps every seam of the old pieces", () => {
  const markup = renderToStaticMarkup(<DenyDescription tr={tr("en")} />);
  expect(markup).toBe(
    "Checked first, and a match ends it: nothing below is consulted and the Bot is told which rule refused it. Rules are CEL, and can ask about " +
      "<code>tool.name</code>, <code>intent</code>, <code>bot.id</code>, <code>actor.id</code>, <code>page.url</code> and <code>page.host</code>, " +
      "the element being acted on, the <code>key</code> being pressed, the file being touched, the <code>command</code> being run, and " +
      "<code>mcp.server</code>, <code>mcp.tool</code> and <code>mcp.effect</code> for a call to somebody else&amp;rsquo;s tools. " +
      "<code>initiator.kind</code> says what started the run &amp;mdash; <code>person</code>, <code>routine</code> or <code>handoff</code> &amp;mdash; which <code>actor.id</code> " +
      "cannot, because a scheduled run carries its owner&amp;rsquo;s authority while nobody is watching. A rule that cannot be evaluated counts as a match, so a mistyped deny refuses rather than quietly permitting what it was meant to forbid.",
  );
});

test("zh deny description: no stray space between Chinese, space kept next to Latin code", () => {
  const markup = renderToStaticMarkup(<DenyDescription tr={tr("zh-CN")} />);
  const text = textOf(markup);
  expect(text).not.toMatch(CJK_GAP);
  expect(text).not.toMatch(/[一-鿿]\./);
  expect(markup).not.toMatch(/\{\w+\}/);
  expect(markup).toContain("<code>page.url</code> 和 <code>page.host</code>");
  expect(markup).toContain("被按下的 <code>key</code>，");
  expect(markup).toContain("<code>initiator.kind</code> 标明");
  expect(markup).toContain("<code>actor.id</code> 无法做到");
  expect(markup).toContain("规则使用 CEL 编写");
  expect(markup).toContain("<code>意图</code>、<code>bot.id</code>");
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

test("en change summary is unchanged", () => {
  expect(
    renderToStaticMarkup(<ChangeSummary change={change} tr={tr("en")} />),
  ).toBe(
    '<p class="text-xs"><span class="font-medium">Would refuse</span> <code class="font-mono">computer_click</code> on “Pay” running <code class="font-mono">rm</code> touching /tmp/x</p>',
  );
});

test("zh change summary joins the clause to the comma without a gap", () => {
  const markup = renderToStaticMarkup(
    <ChangeSummary change={change} tr={tr("zh-CN")} />,
  );
  expect(markup).toContain("</code>，针对“Pay”");
  expect(markup).not.toContain("</code> ，");
  expect(textOf(markup)).not.toMatch(CJK_GAP);
  expect(markup).toContain("运行中 <code");
  expect(markup).toContain("涉及 /tmp/x");
});
