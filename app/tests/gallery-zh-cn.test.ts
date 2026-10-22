import { describe, expect, test } from "bun:test";
import { firstSentence } from "@/components/gallery/preview";
import { GALLERY as g0 } from "@/components/gallery/activity";
import { GALLERY as g1 } from "@/components/gallery/cards";
import { GALLERY as g2 } from "@/components/gallery/charts";
import { GALLERY as g3 } from "@/components/gallery/decisions";
import { GALLERY as g4 } from "@/components/gallery/form";
import { GALLERY as g5 } from "@/components/gallery/quote";
import { GALLERY as g6 } from "@/components/gallery/table";
import { translate } from "@/lib/i18n";

// `import.meta.glob` does not exist under bun, so the registry is empty here: list the modules.
const GALLERY_COMPONENTS = [...g0, ...g1, ...g2, ...g3, ...g4, ...g5, ...g6];

describe("gallery in zh-CN", () => {
  test("the gallery is not empty", () => {
    expect(GALLERY_COMPONENTS.length).toBeGreaterThanOrEqual(10);
  });

  test("every component's title and first description sentence are translated", () => {
    const missing: string[] = [];
    for (const component of GALLERY_COMPONENTS) {
      for (const english of [
        component.title,
        firstSentence(component.description),
      ]) {
        if (translate("zh-CN", english) === english) missing.push(english);
      }
    }
    expect(missing).toEqual([]);
  });
});

test("the sign-up heading is translated", () => {
  expect(translate("zh-CN", "Create your account")).not.toBe(
    "Create your account",
  );
});
