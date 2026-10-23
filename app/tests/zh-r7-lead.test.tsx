import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { noSkillsSentence } from "@/components/bot-profile/access";
import { type Translate, translate } from "@/lib/i18n";
import { notListedSentence } from "@/routes/_authed/admin/plugins/$key";

const zh: Translate = (english, values) => translate("zh-CN", english, values);
const en: Translate = (english, values) => translate("en", english, values);

const CHINESE_GAP = /[一-鿿，。：；][ ]+[一-鿿]/;

const noSkills = (tr: Translate) =>
  renderToStaticMarkup(
    <p>{noSkillsSentence(<a href="/skills">{tr("Write one")}</a>, tr)}</p>,
  );

describe("separator key", () => {
  test("a lone space is empty in zh-CN and a space in English", () => {
    expect(translate("zh-CN", " ")).toBe("");
    expect(translate("en", " ")).toBe(" ");
  });
});

describe("no skills sentence (access.tsx)", () => {
  test("zh has no English period and no space between Chinese sentences", () => {
    const markup = noSkills(zh);
    expect(markup).toBe(
      '<p>你还没有编写技能。<a href="/skills">写一个</a>。</p>',
    );
    expect(markup).not.toContain(".");
    expect(markup).not.toMatch(CHINESE_GAP);
  });

  test("en is unchanged: space before the link, period after", () => {
    expect(noSkills(en)).toBe(
      '<p>You have not written a skill yet. <a href="/skills">Write one</a>.</p>',
    );
  });
});

describe("withdrawn tool line (plugins/$key.tsx)", () => {
  test("en is unchanged", () => {
    expect(notListedSentence("Linear", false, en)).toBe(
      "Not listed by Linear.",
    );
    expect(notListedSentence("Linear", true, en)).toBe(
      "Not listed by Linear as of the last refresh.",
    );
  });

  test("zh ends with 。, keeps the space between Chinese and the Latin vendor name", () => {
    expect(notListedSentence("Linear", false, zh)).toBe("Linear 未列出此项。");
    expect(notListedSentence("Linear", true, zh)).toBe(
      "截至上次刷新，Linear 未列出此项。",
    );
  });
});
