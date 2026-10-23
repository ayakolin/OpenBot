import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { translate } from "@/lib/i18n";

/* `import.meta.glob` is Vite's; stubbed as new-bot-sheet.test.tsx stubs it. */
mock.module("@/lib/marks", () => ({
  markFor: (id: string | null | undefined) =>
    id ? `data:image/svg+xml,${id}` : null,
}));

const { KeyHelp } = await import("@/components/agents/new-bot-sheet");

/**
 * The key field's help is one sentence in one translation. The header name `Authorization` is a
 * literal that stays in a <code> element in every language; the words around it are translated whole.
 */

const render = (locale: "en" | "zh-CN") =>
  renderToStaticMarkup(
    <KeyHelp tr={(english, values) => translate(locale, english, values)} />,
  );

test("zh-CN keeps Authorization verbatim in <code> inside one translated sentence", () => {
  const markup = render("zh-CN");
  expect(markup).toContain("<code>Authorization</code>");
  expect(markup).toContain("标头");
  expect(markup).toContain("凭据保险库");
  expect(markup).not.toContain("授权");
  expect(markup).toBe(
    "每次运行时都会作为 <code>Authorization</code> 标头发送，并保存在凭据保险库中。",
  );
});

test("en reads as one sentence", () => {
  const markup = render("en");
  expect(markup.replace(/<[^>]+>/g, "")).toBe(
    "Sent as an Authorization header on every run, and kept in the credential vault.",
  );
  expect(markup).toContain("<code>Authorization</code>");
});
