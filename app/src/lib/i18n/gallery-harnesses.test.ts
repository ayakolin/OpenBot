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
