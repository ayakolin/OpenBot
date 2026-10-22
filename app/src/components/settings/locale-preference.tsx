import { t, useLocale } from "@/lib/i18n";
import { PageRows } from "@/components/layout/page-shell";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocalePreference as LocalePreferenceValue } from "@openbot/shared/locale";

/**
 * The language switch, on the Preferences screen.
 *
 * Three choices rather than two: "follow the browser" is the default and is what somebody switching
 * machines expects, while an explicit language overrides it for a person whose browser is set to one
 * language and who reads another. Labels are written in their own language — a person looking for
 * Chinese should not have to read the word "Chinese" in English to find it.
 */
export function LocalePreference() {
  const { preference, setPreference } = useLocale();

  const labels: Record<LocalePreferenceValue, string> = {
    system: t("Follow the browser"),
    en: t("English"),
    "zh-CN": t("简体中文"),
  };

  return (
    <PageRows>
      <Item size="sm">
        <ItemContent>
          <ItemTitle>{t("Language")}</ItemTitle>
          <ItemDescription>
            {t("The language this interface is written in.")}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select
            value={preference}
            onValueChange={(value) => {
              if (value === "system" || value === "en" || value === "zh-CN") {
                setPreference(value);
              }
            }}
          >
            <SelectTrigger aria-label={t("Language")}>
              <SelectValue>{labels[preference]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{labels.system}</SelectItem>
              <SelectItem value="en">{labels.en}</SelectItem>
              <SelectItem value="zh-CN">{labels["zh-CN"]}</SelectItem>
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>
    </PageRows>
  );
}
