import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { translate } from "@/lib/i18n";
import { trNodes } from "@/lib/i18n/nodes";

const trFor =
  (locale: "en" | "zh-CN") =>
  (english: string, values?: Record<string, string | number>) =>
    translate(locale, english, values);

const render = (locale: "en" | "zh-CN") =>
  renderToStaticMarkup(
    <p>
      {trNodes(
        "You have not written a skill yet. {link}.",
        { link: <a href="/skills">{translate(locale, "Write one")}</a> },
        undefined,
        trFor(locale),
      )}
    </p>,
  );

describe("trNodes", () => {
  test("en keeps the space and the period of the old three-piece sentence", () => {
    expect(render("en")).toBe(
      '<p>You have not written a skill yet. <a href="/skills">Write one</a>.</p>',
    );
  });

  test("an untranslated sentence falls back to the English, elements in place", () => {
    const markup = renderToStaticMarkup(
      <p>
        {trNodes(
          "An untranslated {a} sentence.",
          { a: <b>x</b> },
          undefined,
          trFor("zh-CN"),
        )}
      </p>,
    );
    expect(markup).toBe("<p>An untranslated <b>x</b> sentence.</p>");
  });

  test("text values are filled alongside elements", () => {
    const markup = renderToStaticMarkup(
      <p>
        {trNodes(
          "{name} says {code}.",
          { code: <code>/x</code> },
          { name: "Ada" },
          trFor("en"),
        )}
      </p>,
    );
    expect(markup).toBe("<p>Ada says <code>/x</code>.</p>");
  });
});
