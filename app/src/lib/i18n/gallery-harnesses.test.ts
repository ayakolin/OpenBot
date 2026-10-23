import { describe, expect, test } from "bun:test";
import { summaryFor, WEB_HARNESSES } from "@openbot/shared/harnesses";
import { GALLERY as ACTIVITY } from "../../components/gallery/activity";
import { GALLERY as CARDS } from "../../components/gallery/cards";
import { GALLERY as CHARTS } from "../../components/gallery/charts";
import { GALLERY as DECISIONS } from "../../components/gallery/decisions";
import { GALLERY as FORM } from "../../components/gallery/form";
import { GALLERY as QUOTE } from "../../components/gallery/quote";
import { GALLERY as TABLE } from "../../components/gallery/table";
import type { GalleryComponent } from "../copilot/gallery-registry";
import {
  componentDescription,
  componentKindLabel,
  componentTitle,
  isSandboxed,
} from "./component-text";
import { translate } from "./index";

/*
 * The gallery's titles and descriptions are English strings served by the model's tool catalogue and
 * drawn in the interface, so they translate on the way to the screen. These tests pin that every one
 * the model can call has a Chinese entry — a missing one silently renders English mid-page.
 */
const COMPONENTS: GalleryComponent[] = [
  ...ACTIVITY,
  ...CARDS,
  ...CHARTS,
  ...DECISIONS,
  ...FORM,
  ...QUOTE,
  ...TABLE,
];

describe("gallery components", () => {
  test("every gallery the catalogue exports is checked here", () => {
    expect(COMPONENTS).toHaveLength(15);
  });

  for (const component of COMPONENTS) {
    test(`${component.name} translates its title and description`, () => {
      expect(translate("zh-CN", component.title)).not.toBe(component.title);
      expect(translate("zh-CN", component.description)).not.toBe(
        component.description,
      );
    });
  }
});

/*
 * The same rule for the harness list: the summary is English in the shared catalogue, and the New
 * Bot dialog renders it for a Chinese reader.
 */
describe("web harness summaries", () => {
  test("the list has entries to check", () => {
    expect(WEB_HARNESSES.length).toBeGreaterThan(0);
  });

  for (const harness of WEB_HARNESSES) {
    test(`${harness.id} translates its summary`, () => {
      expect(translate("zh-CN", summaryFor(harness))).not.toBe(
        summaryFor(harness),
      );
    });
  }
});

describe("known translations", () => {
  test("a harness summary and a component title read as expected in Chinese", () => {
    expect(translate("zh-CN", "Crews of agents with roles and tasks.")).toBe(
      "由带角色与任务的智能体组成的团队。",
    );
    expect(translate("zh-CN", "Record")).toBe("记录");
  });
});

describe("component preview notices", () => {
  test("both notice strings differ from the English", () => {
    expect(translate("zh-CN", "Published in the playground.")).toBe(
      "已在演练场发布。",
    );
    expect(translate("zh-CN", "This build cannot draw this.")).toBe(
      "此构建无法绘制此项。",
    );
  });
});

/* Pin the language once; every helper below takes the translator as an argument. */
const zh = translate.bind(null, "zh-CN");

/*
 * Kinds are drawn as a label in Admin, so every value in the union needs a dictionary entry — a
 * missing one shows the raw `sandboxed` in the middle of a Chinese list.
 */
describe("component kinds", () => {
  const KINDS = ["chart", "card", "decision", "sandboxed"];

  for (const kind of KINDS) {
    test(`${kind} has a Chinese label`, () => {
      expect(translate("zh-CN", kind)).not.toBe(kind);
    });
  }

  test("a sandboxed kind reads as the sandbox in Chinese", () => {
    expect(translate("zh-CN", "sandboxed")).toBe("沙箱");
  });

  test("a component's kind label goes through the dictionary", () => {
    expect(componentKindLabel({ kind: "card" }, zh)).toBe("卡片");
    expect(componentKindLabel({ kind: "sandboxed" }, zh)).toBe("沙箱");
  });
});

/*
 * Built-in components are the build's own English strings, so both title and published description
 * translate; a sandboxed row is a deployment's own writing and is shown as written.
 */
describe("sandboxed components", () => {
  const builtIn = COMPONENTS.find(
    (component) => component.name === "showRecord",
  );

  test("the gallery has a built-in component to check", () => {
    expect(builtIn).toBeDefined();
  });

  test("a built-in title translates", () => {
    expect(componentTitle(builtIn as GalleryComponent, zh)).toBe("记录");
  });

  test("a built-in published description translates", () => {
    const published = {
      ...(builtIn as GalleryComponent),
      publishedDescription: (builtIn as GalleryComponent).description,
      published: true,
    };
    expect(componentDescription(published, zh)).toBe(
      translate("zh-CN", (builtIn as GalleryComponent).description),
    );
    expect(componentDescription(published, zh)).not.toBe(
      (builtIn as GalleryComponent).description,
    );
  });

  const sandboxed = {
    title: "Record",
    kind: "sandboxed",
    publishedDescription: "Draws the draft.",
  };

  test("a sandboxed title is shown exactly as stored", () => {
    expect(componentTitle(sandboxed, zh)).toBe("Record");
    expect(componentTitle(sandboxed, zh)).not.toBe("记录");
  });

  test("a sandboxed description is shown exactly as stored", () => {
    expect(componentDescription(sandboxed, zh)).toBe("Draws the draft.");
  });

  test("only the sandboxed kind is treated as a deployment's own writing", () => {
    expect(isSandboxed(sandboxed)).toBe(true);
    expect(isSandboxed({ kind: "card" })).toBe(false);
  });

  test("a sandboxed component without a published description has none", () => {
    expect(
      componentDescription(
        { kind: "sandboxed", publishedDescription: null },
        zh,
      ),
    ).toBeNull();
  });
});
